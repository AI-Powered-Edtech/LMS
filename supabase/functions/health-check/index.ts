// =============================================================
// EduSync LMS — Edge Function: health-check
// =============================================================
// Endpoint publik (tanpa autentikasi) untuk monitoring kesehatan
// layanan. Digunakan oleh:
//   - Uptime monitors (UptimeRobot, BetterUptime, dll.)
//   - Load balancer health probes
//   - CI/CD deployment verification
//
// Mengembalikan:
//   200 OK  → status "healthy" atau "degraded"
//   503     → status "down"
//
// Checks yang dilakukan:
//   - db: koneksi PostgreSQL (SELECT 1)
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

// ── Types ─────────────────────────────────────────────────────────────────

type CheckStatus = 'ok' | 'error'
type ServiceStatus = 'healthy' | 'degraded' | 'down'

interface HealthChecks {
  db: CheckStatus
}

interface HealthResponse {
  status: ServiceStatus
  version: string
  timestamp: string
  checks: HealthChecks
  latency_ms: {
    db: number | null
  }
}

// ── App version ───────────────────────────────────────────────────────────
// Sinkronkan dengan package.json version via CI/CD atau set manual.
const APP_VERSION = '4.0.0'

// ── CORS Headers ──────────────────────────────────────────────────────────
// Health check bersifat publik: izinkan semua origin agar monitoring
// eksternal dapat mengaksesnya.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// ── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Hanya terima GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method tidak diizinkan' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const checks: HealthChecks = { db: 'error' }
  const latency: HealthResponse['latency_ms'] = { db: null }

  // ── Check: Database connection ─────────────────────────────────────────
  // Menggunakan anon key (bukan service role) agar mencerminkan akses nyata
  // pengguna. Jika DB tidak bisa dijangkau oleh anon, maka semua request
  // pengguna juga akan gagal.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (supabaseUrl && anonKey) {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    })

    const dbStart = Date.now()
    try {
      // SELECT 1 adalah query paling ringan untuk verifikasi koneksi
      const { error } = await supabase
        .rpc('health_ping')
        .single()
        .catch(async () => {
          // Fallback: jika RPC health_ping tidak ada, coba query sederhana
          return await supabase.from('feature_flags').select('flag_name').limit(1).single()
        })

      latency.db = Date.now() - dbStart

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, itu OK
        console.warn('[health-check] DB check error:', error.message)
        checks.db = 'error'
      } else {
        checks.db = 'ok'
      }
    } catch (dbErr) {
      latency.db = Date.now() - dbStart
      checks.db = 'error'
      console.error('[health-check] DB check exception:', dbErr)
    }
  } else {
    console.error('[health-check] SUPABASE_URL atau SUPABASE_ANON_KEY tidak diset')
  }

  // ── Tentukan status keseluruhan ────────────────────────────────────────
  const allOk = Object.values(checks).every((v) => v === 'ok')
  const anyOk = Object.values(checks).some((v) => v === 'ok')
  const overallStatus: ServiceStatus = allOk ? 'healthy' : anyOk ? 'degraded' : 'down'

  const body: HealthResponse = {
    status: overallStatus,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    checks,
    latency_ms: latency,
  }

  const httpStatus = overallStatus === 'down' ? 503 : 200

  return new Response(JSON.stringify(body, null, 2), {
    status: httpStatus,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
})
