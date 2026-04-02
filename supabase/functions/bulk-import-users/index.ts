import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: bulk-import-users
// ==========================================================================
// Memproses bulk import pengguna dari CSV yang sudah diparse di frontend.
// Input:  { rows: ImportRow[], tenantId: string, importJobId: string }
// Output: { success: number, failed: number, errors: RowError[] }
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

interface RowError {
  row: number
  email: string
  reason: string
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

  // 6. Proses setiap baris — satu baris gagal TIDAK menghentikan proses
  let successRows = 0
  let failedRows = 0
  const errors: RowError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    try {
      // Validasi email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!row.email || !emailRegex.test(row.email.trim())) {
        throw new Error(`Email tidak valid: "${row.email}"`)
      }

      // Validasi role
      const normalizedRole = row.role?.toLowerCase().trim()
      const internalRole = ROLE_MAP[normalizedRole]
      if (!internalRole) {
        throw new Error(`Peran tidak dikenal: "${row.role}". Gunakan: siswa, guru, atau admin`)
      }

      const email = row.email.toLowerCase().trim()

      // Buat invitation di tenant_invitations
      // (Mengikuti pola yang sama dengan InviteUserModal)
      const { error: insertError } = await serviceClient.from('tenant_invitations').insert({
        tenant_id: tenantId,
        email,
        role: internalRole,
        invited_by: user.id,
      })

      if (insertError) {
        // Duplikat email (unique constraint violation)
        if (insertError.code === '23505') {
          throw new Error('Email sudah terdaftar atau sudah diundang sebelumnya')
        }
        throw new Error(insertError.message)
      }

      successRows++
    } catch (err: unknown) {
      failedRows++
      errors.push({
        row: rowNum,
        email: row.email ?? '',
        reason: err instanceof Error ? err.message : 'Kesalahan tidak diketahui',
      })
    }
  }

  // 7. Update bulk_import_jobs dengan hasil akhir
  const finalStatus = failedRows === 0 ? 'completed' : successRows === 0 ? 'failed' : 'partial'

  await serviceClient
    .from('bulk_import_jobs')
    .update({
      status: finalStatus,
      success_rows: successRows,
      failed_rows: failedRows,
      error_details: errors.length > 0 ? errors : null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', importJobId)

  // 8. Return hasil detail
  return new Response(
    JSON.stringify({
      success: successRows,
      failed: failedRows,
      total: rows.length,
      status: finalStatus,
      errors,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    }
  )
})
