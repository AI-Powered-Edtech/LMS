import { test, expect, type APIRequestContext } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * RBAC matrix E2E — Workstream A2.
 *
 * Drives the *real* Rust API (NOT mocked) with each persona's bearer token
 * and records the verdict per (persona, endpoint) pair. While `shadow_mode`
 * is true in `rbac_policy.yaml`, the API still returns 200 even when the
 * shadow evaluator says "would_deny" — so we classify each cell by the
 * *expected* verdict from the policy, then assert that the API response
 * agrees with shadow expectations once enforce flips.
 *
 * Output: `.qa-rbac/matrix.json` summarising:
 *   { persona, method, path, expected, actual_status, classification }
 *
 * Exit gate (A2 acceptance):
 *   - `unmatched = 0` for the canonical matrix below
 *   - mismatches between shadow expectation and current 200/403 behaviour
 *     are surfaced as flaky/expected, not as test failures (until A3)
 */

const API_BASE = process.env.API_BASE ?? 'http://localhost:8080'

const PERSONAS = {
  admin: 'admin@nusantara.dev',
  principal: 'kepsek@nusantara.dev',
  wakasek: 'wakasek.kurikulum@nusantara.dev',
  wali_kelas: 'wali.x-ipa-1@nusantara.dev',
  teacher: 'guru.matematika@nusantara.dev',
  guru_bk: 'bk@nusantara.dev',
  tu: 'tu@nusantara.dev',
  student: 'siswa001@nusantara.dev',
  parent: 'ortu001@nusantara.dev',
} as const
type Persona = keyof typeof PERSONAS

type EndpointSpec = {
  group: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  /** Roles expected to be allowed by the policy. Used as the oracle. */
  allowed: Persona[]
}

/**
 * Canonical endpoint matrix. Keep in lockstep with `rbac_policy.yaml`.
 * One representative endpoint per high-risk module is enough — we are
 * exercising the *evaluator*, not coverage of every route.
 */
const MATRIX: EndpointSpec[] = [
  // data_plane endpoints serve PostgREST-style POST {} for read/list. The real
  // routes only register POST; GET on /data/* is policy-only and 405s. The
  // matrix below probes routes that actually exist in main.rs.
  // gradebook
  { group: 'gradebook', method: 'POST', path: '/api/v1/data/gradebook_entries', allowed: ['admin', 'principal', 'wakasek', 'wali_kelas', 'teacher'] },
  // attendance
  { group: 'attendance', method: 'POST', path: '/api/v1/data/rombel_attendance', allowed: ['admin', 'principal', 'wakasek', 'wali_kelas', 'teacher', 'guru_bk'] },
  // finance (low-risk, A3 hard-enforce target)
  { group: 'finance', method: 'POST', path: '/api/v1/data/invoices', allowed: ['admin', 'principal', 'tu', 'parent'] },
  { group: 'finance', method: 'POST', path: '/api/v1/data/payment_transactions', allowed: ['admin', 'tu'] },
  // counseling/BK (A3 hard-enforce)
  { group: 'counseling', method: 'POST', path: '/api/v1/data/counseling_notes', allowed: ['admin', 'principal', 'guru_bk'] },
  // rapor
  { group: 'rapor', method: 'POST', path: '/api/v1/data/rapor_documents', allowed: ['admin', 'principal', 'wali_kelas'] },
  // PPDB
  { group: 'ppdb', method: 'POST', path: '/api/v1/data/ppdb_registrations', allowed: ['admin', 'tu', 'wakasek'] },
  // audit (A3 hard-enforce)
  { group: 'audit', method: 'POST', path: '/api/v1/data/app_audit_logs', allowed: ['admin', 'principal'] },
  // AI — embeddings is the policy-listed gated AI endpoint (tutor/stream is self-scope).
  { group: 'ai', method: 'POST', path: '/api/v1/ai/embeddings', allowed: ['admin', 'teacher', 'wali_kelas'] },
  // parent child data — RPC is the entry point per migration 072 (no /parent/children route).
  { group: 'parent', method: 'POST', path: '/api/v1/rpc/get_parent_invoices', allowed: ['admin', 'parent'] },
  // admin user management — A3 hard-enforce via the policy entry.
  // Both handler-level `rbac.require("admin")` and the middleware policy
  // gate fire; either rejecting non-admin yields 403, which the matrix
  // counts as expected_deny for non-admin personas.
  { group: 'admin_users', method: 'GET', path: '/api/v1/tenant-members', allowed: ['admin'] },
  { group: 'admin_users', method: 'GET', path: '/api/v1/tenant-invites', allowed: ['admin'] },
]

async function tokenFor(api: APIRequestContext, persona: Persona): Promise<string> {
  const email = PERSONAS[persona]
  const res = await api.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email, password: 'password123' },
  })
  expect(res.ok(), `login ${persona} (${email}) → ${res.status()}`).toBeTruthy()
  const body = await res.json()
  const token = body.access_token ?? body.token ?? body.data?.access_token
  if (!token) throw new Error(`login ${persona}: no token in response`)
  return token
}

type Cell = {
  persona: Persona
  group: string
  method: string
  path: string
  expected: 'allow' | 'deny'
  actual_status: number
  classification: 'expected_allow' | 'expected_deny_shadow' | 'unexpected_allow' | 'unexpected_deny'
}

test.describe('RBAC matrix (shadow)', () => {
  test('records verdicts for canonical 9-persona × 11-endpoint matrix', async ({ request }) => {
    const cells: Cell[] = []

    for (const persona of Object.keys(PERSONAS) as Persona[]) {
      let token: string
      try {
        token = await tokenFor(request, persona)
      } catch (e) {
        // Persona seed missing → skip but record so the matrix surfaces it.
        for (const ep of MATRIX) {
          cells.push({
            persona,
            group: ep.group,
            method: ep.method,
            path: ep.path,
            expected: ep.allowed.includes(persona) ? 'allow' : 'deny',
            actual_status: 0,
            classification: 'unexpected_deny',
          })
        }
        continue
      }

      for (const ep of MATRIX) {
        const expected = ep.allowed.includes(persona) ? 'allow' : 'deny'
        const res = await request.fetch(`${API_BASE}${ep.path}`, {
          method: ep.method,
          headers: { Authorization: `Bearer ${token}` },
          // POST endpoints get an empty body; success/4xx is what matters.
          ...(ep.method === 'POST' ? { data: {} } : {}),
        })
        const status = res.status()
        // RBAC verdict signal: 401/403 = denied by auth/RBAC layer. Anything
        // else (incl. 400 bad request, 404 missing row, 405, 5xx) means the
        // request reached the handler — RBAC let it through. Classification
        // therefore keys off the auth-deny signal, not the success/failure
        // of the underlying handler logic.
        const denied = status === 401 || status === 403
        let classification: Cell['classification']
        if (expected === 'allow') {
          classification = denied ? 'unexpected_deny' : 'expected_allow'
        } else {
          // shadow_mode=true → 403 not yet enforced for non-A3 modules
          classification = denied ? 'expected_deny_shadow' : 'unexpected_allow'
        }
        cells.push({
          persona,
          group: ep.group,
          method: ep.method,
          path: ep.path,
          expected,
          actual_status: status,
          classification,
        })
      }
    }

    const outDir = path.join('.qa-rbac')
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'matrix.json'), JSON.stringify(cells, null, 2))

    // Acceptance gate: no unexpected denials for *allow* cells. Shadow
    // discrepancies on *deny* cells are recorded but not failed yet — they
    // are the input to A3 hard-enforce.
    const unexpectedDeny = cells.filter((c) => c.classification === 'unexpected_deny')
    if (unexpectedDeny.length) {
      console.error('Unexpected denies:', unexpectedDeny)
    }
    expect(unexpectedDeny, 'allow cells must not 4xx — RBAC regression').toHaveLength(0)
  })
})
