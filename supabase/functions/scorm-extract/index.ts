import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import JSZip from 'https://esm.sh/jszip@3.10.1'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { authenticate, type AuthResult } from '../_shared/auth.ts'

// ==========================================================================
// Edge Function: scorm-extract
//
// Receives a SCORM ZIP upload, validates the manifest, extracts all files
// to Supabase Storage, and creates the scorm_packages + lesson_resources
// records.
//
// Auth: User JWT (teacher/admin only)
// Input: multipart/form-data with:
//   - file: SCORM ZIP file
//   - lesson_id: UUID
//   - course_id: UUID (for storage path)
//   - title: string (optional, defaults from manifest)
// ==========================================================================

const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * Parse imsmanifest.xml to extract SCORM version and entry point.
 * Uses basic string parsing since Deno doesn't have a built-in XML parser.
 */
function parseManifest(xmlContent: string): {
  version: '1.2' | '2004'
  entryPoint: string
  title: string
  manifestData: Record<string, unknown>
} {
  // Determine SCORM version
  let version: '1.2' | '2004' = '1.2'

  // SCORM 2004 indicators
  if (
    xmlContent.includes('adlcp:scormType') ||
    xmlContent.includes('adlseq:') ||
    xmlContent.includes('imsss:') ||
    xmlContent.includes('2004') ||
    xmlContent.includes('adlcp_v3')
  ) {
    version = '2004'
  }

  // Also check schemaversion
  const schemaMatch = xmlContent.match(/<schemaversion>\s*([\d.]+)\s*<\/schemaversion>/i)
  if (schemaMatch) {
    const schemaVer = schemaMatch[1]
    if (schemaVer.startsWith('2004') || schemaVer === 'CAM 1.3' || parseFloat(schemaVer) >= 2) {
      version = '2004'
    }
  }

  // Extract entry point (launch URL)
  // Look for <resource> with type="webcontent" and an href attribute
  let entryPoint = 'index.html'

  // Try adlcp:scormType="sco" first (more specific)
  const scoMatch = xmlContent.match(
    /<resource[^>]*adlcp:scormType\s*=\s*"sco"[^>]*href\s*=\s*"([^"]+)"/i
  )
  if (scoMatch) {
    entryPoint = scoMatch[1]
  } else {
    // Fallback: first resource with type="webcontent" and href
    const resourceMatch = xmlContent.match(
      /<resource[^>]*type\s*=\s*"webcontent"[^>]*href\s*=\s*"([^"]+)"/i
    )
    if (resourceMatch) {
      entryPoint = resourceMatch[1]
    } else {
      // Fallback: any resource with href
      const anyHrefMatch = xmlContent.match(/<resource[^>]*href\s*=\s*"([^"]+)"/i)
      if (anyHrefMatch) {
        entryPoint = anyHrefMatch[1]
      }
    }
  }

  // Extract title
  let title = 'Modul SCORM'
  const titleMatch = xmlContent.match(
    /<organization[^>]*>[\s\S]*?<title>\s*([\s\S]*?)\s*<\/title>/i
  )
  if (titleMatch) {
    title = titleMatch[1].trim()
  }

  return {
    version,
    entryPoint,
    title,
    manifestData: {
      schemaVersion: schemaMatch?.[1] ?? 'unknown',
      entryPoint,
      rawTitle: title,
    },
  }
}

/**
 * Parse multipart/form-data from a Request.
 * Returns the parsed fields and file.
 */
async function parseMultipartForm(req: Request): Promise<{
  fields: Record<string, string>
  file: { name: string; data: Uint8Array } | null
}> {
  const formData = await req.formData()
  const fields: Record<string, string> = {}
  let file: { name: string; data: Uint8Array } | null = null

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = await value.arrayBuffer()
      file = { name: value.name, data: new Uint8Array(buffer) }
    } else {
      fields[key] = value.toString()
    }
  }

  return { fields, file }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Metode tidak diizinkan', 405)
  }

  const startTime = Date.now()

  try {
    // 1. Auth — require teacher/admin
    let user: AuthResult['user']

    try {
      const authResult = await authenticate(req)
      user = authResult.user
    } catch (e: unknown) {
      return errorResponse('Unauthorized', 401)
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) return errorResponse('TENANT_MISSING', 403)

    // Check role — must be teacher or admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const { data: roleRecord } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .in('role', ['teacher', 'admin'])
      .limit(1)
      .single()

    if (!roleRecord) {
      return errorResponse('UNAUTHORIZED_ROLE: Hanya guru/admin yang dapat mengunggah SCORM', 403)
    }

    // 2. Parse form data
    const { fields, file } = await parseMultipartForm(req)

    if (!file) {
      return errorResponse('File SCORM ZIP wajib diunggah', 400)
    }

    if (file.data.byteLength > MAX_ZIP_SIZE) {
      return errorResponse(`File terlalu besar. Maksimal ${MAX_ZIP_SIZE / 1024 / 1024}MB`, 400)
    }

    const lessonId = fields.lesson_id
    const courseId = fields.course_id
    const customTitle = fields.title

    if (!lessonId) return errorResponse('lesson_id wajib diisi', 400)
    if (!courseId) return errorResponse('course_id wajib diisi', 400)

    // 2b. Verify lesson belongs to this tenant (defense-in-depth)
    const { data: lessonCheck } = await serviceClient
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('tenant_id', tenantId)
      .limit(1)
      .single()

    if (!lessonCheck) {
      return errorResponse('Pelajaran tidak ditemukan atau bukan milik tenant Anda.', 404)
    }

    // 3. Extract ZIP
    const zip = new JSZip()
    await zip.loadAsync(file.data)

    // 4. Find and parse imsmanifest.xml
    const manifestFile = zip.file('imsmanifest.xml') || zip.file('imsManifest.xml')
    if (!manifestFile) {
      return errorResponse(
        'File imsmanifest.xml tidak ditemukan. Pastikan file yang diunggah adalah paket SCORM yang valid.',
        400
      )
    }

    const manifestXml = await manifestFile.async('text')
    const manifest = parseManifest(manifestXml)

    const title = customTitle || manifest.title || 'Modul SCORM'
    const packageId = crypto.randomUUID()
    const storagePath = `${tenantId}/${courseId}/${lessonId}/scorm/${packageId}`

    // 5. Upload all files to Supabase Storage
    const fileEntries: string[] = []
    let uploadErrors = 0

    // Iterate all files in the ZIP (not directories)
    const uploadPromises: Promise<void>[] = []

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return // skip directories

      uploadPromises.push(
        (async () => {
          try {
            const fileData = await zipEntry.async('uint8array')
            const objectPath = `${storagePath}/${relativePath}`

            // Determine content type
            const ext = relativePath.split('.').pop()?.toLowerCase() || ''
            const contentType = getContentType(ext)

            const { error: uploadError } = await serviceClient.storage
              .from('scorm-packages')
              .upload(objectPath, fileData, {
                contentType,
                upsert: true,
              })

            if (uploadError) {
              console.error(`Upload error for ${relativePath}:`, uploadError)
              uploadErrors++
            } else {
              fileEntries.push(relativePath)
            }
          } catch (err) {
            console.error(`Failed to upload ${relativePath}:`, err)
            uploadErrors++
          }
        })()
      )
    })

    // Process uploads in batches of 10 to avoid overwhelming the connection
    const BATCH_SIZE = 10
    for (let i = 0; i < uploadPromises.length; i += BATCH_SIZE) {
      await Promise.all(uploadPromises.slice(i, i + BATCH_SIZE))
    }

    if (fileEntries.length === 0) {
      return errorResponse('Tidak ada file yang berhasil diunggah dari paket SCORM.', 500)
    }

    // 6. Create scorm_packages record
    const { data: scormPkg, error: pkgError } = await serviceClient
      .from('scorm_packages')
      .insert({
        id: packageId,
        tenant_id: tenantId,
        lesson_id: lessonId,
        title,
        scorm_version: manifest.version,
        storage_path: storagePath,
        entry_point: manifest.entryPoint,
        manifest_data: {
          ...manifest.manifestData,
          file_count: fileEntries.length,
          upload_errors: uploadErrors,
          original_filename: file.name,
        },
        uploaded_by: user.id,
      })
      .select('id')
      .single()

    if (pkgError) {
      console.error('SCORM_EXTRACT_PKG_INSERT_ERROR', pkgError)
      return errorResponse('Gagal menyimpan data paket SCORM.', 500)
    }

    // 7. Create lesson_resources record with type='scorm'
    // Find the current max order_index for this lesson
    const { data: maxOrderData } = await serviceClient
      .from('lesson_resources')
      .select('order_index')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrderData?.order_index ?? -1) + 1

    const { error: resourceError } = await serviceClient.from('lesson_resources').insert({
      lesson_id: lessonId,
      type: 'scorm',
      title,
      content: `Modul SCORM ${manifest.version}: ${title}`,
      metadata: {
        scorm_package_id: packageId,
        scorm_version: manifest.version,
        entry_point: manifest.entryPoint,
        file_count: fileEntries.length,
      },
      order_index: nextOrder,
    })

    if (resourceError) {
      console.error('SCORM_EXTRACT_RESOURCE_INSERT_ERROR', resourceError)
      // Non-fatal — the package was created, resource link can be added manually
    }

    const latencyMs = Date.now() - startTime
    console.log(
      JSON.stringify({
        component: 'scorm-extract',
        stage: 'success',
        tenant_id: tenantId,
        scorm_package_id: packageId,
        scorm_version: manifest.version,
        files_extracted: fileEntries.length,
        upload_errors: uploadErrors,
        latency_ms: latencyMs,
      })
    )

    return jsonResponse({
      success: true,
      scorm_package_id: packageId,
      title,
      scorm_version: manifest.version,
      entry_point: manifest.entryPoint,
      files_extracted: fileEntries.length,
      upload_errors: uploadErrors,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const latencyMs = Date.now() - startTime
    console.error('SCORM_EXTRACT_ERROR', { error: message, latency_ms: latencyMs })

    if (message.includes('Invalid ZIP')) {
      return errorResponse('File yang diunggah bukan ZIP yang valid.', 400)
    }

    return errorResponse('Terjadi kesalahan saat memproses paket SCORM.', 500)
  }
})

/**
 * Map file extension to MIME content type.
 */
function getContentType(ext: string): string {
  const types: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    xsd: 'application/xml',
    dtd: 'application/xml-dtd',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
    pdf: 'application/pdf',
    swf: 'application/x-shockwave-flash',
    zip: 'application/zip',
    txt: 'text/plain',
  }
  return types[ext] || 'application/octet-stream'
}
