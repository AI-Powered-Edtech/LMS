import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: bulk-import-users
// ==========================================================================
// Memproses bulk import pengguna secara asynchronous.
// Input:  { rows: ImportRow[], tenantId: string, importJobId: string }
// Output: { success: 0, failed: 0, total, status: 'processing' }
// Auth:   Hanya ADMIN yang boleh memanggil endpoint ini (cek JWT role).
// ==========================================================================

const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
})

interface ImportRow {
  email: string
  full_name: string
  role: string // 'siswa' | 'guru' | 'admin' (lowercase dari CSV)
  nis?: string
  nomor_hp?: string
}

interface BulkImportPayload {
  rows: ImportRow[]
  tenantId: string
  importJobId: string
}

// Peta peran CSV → internal role EduSync
const ROLE_MAP: Record<string, string> = {
  siswa: 'STUDENT',
  guru: 'TEACHER',
  admin: 'ADMIN',
}

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() })
  }

  // 2. Hanya terima POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  // 3. Validasi Auth — ambil user dari JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: token tidak ditemukan' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Client dengan JWT user (untuk cek role)
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  // Client service role (untuk create invitation — bypass RLS)
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Ambil user dari JWT
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: token tidak valid' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  // 4. Parse request body
  let payload: BulkImportPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Request body tidak valid (JSON)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  const { rows, tenantId, importJobId } = payload

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return new Response(JSON.stringify({ error: 'rows harus berupa array yang tidak kosong' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  const MAX_ROWS = 10_000
  if (rows.length > MAX_ROWS) {
    return new Response(
      JSON.stringify({
        error: `Maksimum ${MAX_ROWS} baris per impor. Anda mengirim ${rows.length} baris.`,
      }),
      { status: 400, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
    )
  }

  if (!tenantId || !importJobId) {
    return new Response(JSON.stringify({ error: 'tenantId dan importJobId wajib diisi' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  // 5. Verifikasi bahwa user adalah ADMIN pada tenant ini
  const { data: roleCheck, error: roleError } = await userClient.rpc('has_role', {
    p_user_id: user.id,
    p_tenant_id: tenantId,
    p_role: 'ADMIN',
  })

  if (roleError || !roleCheck) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: hanya Admin yang dapat melakukan bulk import' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
      }
    )
  }

  // 6. Simpan antrean baris mentah ke bulk_import_job_rows, lalu worker SQL memprosesnya
  const normalizedRows = rows.map((row, index) => ({
    job_id: importJobId,
    tenant_id: tenantId,
    row_number: index + 1,
    email: row.email?.toLowerCase().trim() ?? '',
    full_name: row.full_name?.trim() ?? '',
    role: ROLE_MAP[row.role?.toLowerCase().trim()]?.toLowerCase() ?? row.role?.toLowerCase().trim(),
    nis: row.nis?.trim() || null,
    nomor_hp: row.nomor_hp?.trim() || null,
    status: 'pending',
  }))

  const { error: queueError } = await serviceClient
    .from('bulk_import_job_rows')
    .insert(normalizedRows)

  if (queueError) {
    await serviceClient
      .from('bulk_import_jobs')
      .update({
        status: 'failed',
        failed_rows: rows.length,
        error_details: [{ row: 0, email: '', reason: queueError.message }],
        completed_at: new Date().toISOString(),
      })
      .eq('id', importJobId)

    return new Response(JSON.stringify({ error: queueError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  await serviceClient
    .from('bulk_import_jobs')
    .update({
      status: 'processing',
      total_rows: rows.length,
      success_rows: 0,
      failed_rows: 0,
      error_details: null,
      started_at: new Date().toISOString(),
      processed_at: null,
      completed_at: null,
    })
    .eq('id', importJobId)

  // 7. Trigger satu batch worker agar progres awal terlihat lebih cepat
  await serviceClient.rpc('process_bulk_import_jobs', {
    p_batch_size: 500,
  })

  // 8. Return ack cepat; frontend akan melakukan polling status job
  return new Response(
    JSON.stringify({
      success: 0,
      failed: 0,
      total: rows.length,
      status: 'processing',
      importJobId,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    }
  )
})
