import { db } from '@/services/db'

// Custom error types for administration operations
class AdministrationError extends Error {
  constructor(
    message: string,
    public code:
      | 'TENANT_NOT_FOUND'
      | 'PERMISSION_DENIED'
      | 'NOT_IMPLEMENTED'
      | 'NETWORK_ERROR'
      | 'UNKNOWN',
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'AdministrationError'
  }
}

// Combined tenant module configuration with module details
export interface TenantModuleConfig {
  id: string
  moduleId: string
  slug: string
  name: string
  description: string
  isEnabled: boolean
  isCore: boolean
  targetRoles: ('teacher' | 'student')[]
}

// Sync history types
export interface SyncHistoryItem {
  id: string
  type: string
  status: 'success' | 'warning' | 'error'
  lastSync: string
  records: number
  errorMessage?: string
}

// Sync result types
export interface SyncResult {
  status: 'success' | 'warning' | 'error' | 'not_available'
  message: string
  recordsSynced?: number
  errorMessage?: string
  timestamp?: string
}

// Audit log entry returned by get_audit_logs RPC
export interface AuditLog {
  log_id: string
  actor_id: string
  actor_name: string
  actor_email: string
  action: string
  target_type: string
  target_id: string | null
  target_name: string
  details: Record<string, unknown>
  created_at: string
  total_count: number
}

// Map database module slugs to frontend target roles
function getTargetRolesForModule(slug: string): ('teacher' | 'student')[] {
  const roleMapping: Record<string, ('teacher' | 'student')[]> = {
    gradebook: ['teacher'],
    quiz: ['student'],
    assignments: ['teacher', 'student'],
    calendar: ['teacher', 'student'],
    announcements: ['teacher', 'student'],
    directory: ['teacher', 'student'],
    'ai-creator': ['teacher'],
    analytics: ['teacher'],
    attendance: ['teacher'],
    documents: ['teacher'],
    'speed-grader': ['teacher'],
    'group-assignment': ['teacher', 'student'],
    forum: ['teacher', 'student'],
  }

  return roleMapping[slug] || ['teacher', 'student']
}

/**
 * Parse Supabase error and return user-friendly error
 */
function parseSupabaseError(error: unknown): AdministrationError {
  const errorMessage = error instanceof Error ? error.message : String(error)

  if (errorMessage.includes('function not found') || errorMessage.includes('does not exist')) {
    return new AdministrationError(
      'Konfigurasi modul belum lengkap. Silakan hubungi administrator sistem.',
      'NOT_IMPLEMENTED',
      error
    )
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('permission denied')) {
    return new AdministrationError(
      'Anda tidak memiliki akses ke fitur ini. Hanya admin yang dapat mengakses.',
      'PERMISSION_DENIED',
      error
    )
  }

  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout')
  ) {
    return new AdministrationError(
      'Koneksi internet bermasalah. Silakan coba lagi.',
      'NETWORK_ERROR',
      error
    )
  }

  return new AdministrationError(
    'Terjadi kesalahan saat memuat konfigurasi. Silakan coba lagi.',
    'UNKNOWN',
    error
  )
}

/**
 * Administration Service
 * Handles tenant module configuration and external system sync operations
 */
export const administrationService = {
  /**
   * Get all module configurations for the current tenant
   * Queries tenant_modules joined with modules table
   */
  async getTenantModules(): Promise<TenantModuleConfig[]> {
    try {
      // Fetch tenant_modules joined with module details.
      // Uses a regular (left) join so that a missing modules row does not
      // cause an RLS-driven error — rows without a matching module are
      // simply filtered out in the map below.
      const { data: tenantModules, error: tenantError } = await db
        .from('tenant_modules')
        .select(
          `
          id,
          tenant_id,
          module_id,
          is_enabled,
          updated_at,
          modules(
            id,
            slug,
            name,
            description,
            is_core,
            api_enabled_default,
            created_at
          )
        `
        )
        .order('module_id', { ascending: true })

      if (tenantError) {
        // Log as warn — missing tenant_modules seed data is a setup
        // issue, not an application error; callers fall back to defaults.
        if (import.meta.env.DEV)
          console.warn(
            'tenant_modules fetch returned an error (likely no seed data):',
            tenantError.message
          )
        throw tenantError
      }

      if (tenantModules && tenantModules.length > 0) {
        // Map the joined data to our interface.
        // Filter out rows where the modules join returned null
        // (can happen if modules table has no matching row for the tenant).
        return tenantModules
          .filter((tm) => tm.modules != null)
          .map((tm) => {
            const mod = Array.isArray(tm.modules)
              ? tm.modules[0]
              : (tm.modules as unknown as {
                  id: string
                  slug: string
                  name: string
                  description?: string
                  is_core: boolean
                })
            return {
              id: tm.id,
              moduleId: mod.id,
              slug: mod.slug,
              name: mod.name,
              description: mod.description || '',
              isEnabled: tm.is_enabled,
              isCore: mod.is_core,
              targetRoles: getTargetRolesForModule(mod.slug),
            }
          })
      }

      // If no tenant_modules exist, return empty array
      return []
    } catch (error) {
      if (import.meta.env.DEV)
        console.warn(
          'Tenant modules unavailable, caller will use defaults:',
          error instanceof Error ? error.message : error
        )
      throw parseSupabaseError(error)
    }
  },

  /**
   * Update module enabled status for the current tenant
   */
  async toggleTenantModule(moduleId: string, isEnabled: boolean): Promise<void> {
    try {
      const { error } = await db
        .from('tenant_modules')
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq('module_id', moduleId)

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to update tenant module:', error)
        throw error
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error toggling tenant module:', error)
      throw parseSupabaseError(error)
    }
  },

  /**
   * Get sync history from activity_logs table
   * Attempts to query relevant sync-related logs
   */
  async getSyncHistory(): Promise<SyncHistoryItem[]> {
    try {
      // Try to query activity_logs for sync-related events
      const { data, error } = await db
        .from('activity_logs')
        .select('id, tenant_id, user_id, action, metadata, created_at')
        .ilike('action', '%sync%')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        // If table doesn't exist or other error, return empty array
        if (import.meta.env.DEV) console.warn('No sync history available:', error.message)
        return []
      }

      if (data && data.length > 0) {
        return data.map(
          (log: {
            id: string
            action: string | null
            metadata: Record<string, unknown> | null
            created_at: string
          }) => ({
            id: log.id,
            type: log.action || 'External Sync',
            status:
              log.metadata?.status === 'error'
                ? 'error'
                : log.metadata?.status === 'warning'
                  ? 'warning'
                  : 'success',
            lastSync: log.created_at,
            records: (log.metadata?.records as number) || 0,
            errorMessage: log.metadata?.error as string | undefined,
          })
        )
      }

      return []
    } catch (error) {
      // Return empty array on any error - sync history is optional
      if (import.meta.env.DEV) console.warn('Error fetching sync history, returning empty:', error)
      return []
    }
  },

  /**
   * Trigger external system synchronization
   * This is a stub - actual implementation requires backend RPC
   */
  async syncExternalSystem(): Promise<SyncResult> {
    // Return not_available status as backend integration is not yet implemented
    return {
      status: 'not_available',
      message:
        'Fitur sinkronisasi eksternal belum tersedia. Integrasi dengan PDDIKTI/Dapodik akan segera hadir.',
    }
  },

  /**
   * Get default module configurations (fallback when database is empty)
   * This mirrors the hardcoded values in ModuleConfigContext
   */
  getDefaultModules(): TenantModuleConfig[] {
    return [
      {
        id: 'default-gradebook',
        moduleId: 'gradebook',
        slug: 'gradebook',
        name: 'Buku Nilai',
        description: 'Sistem pencatatan dan rekap nilai siswa untuk guru.',
        isEnabled: true,
        isCore: true,
        targetRoles: ['teacher'],
      },
      {
        id: 'default-quiz',
        moduleId: 'quiz',
        slug: 'quiz',
        name: 'Kuis Online',
        description: 'Platform ujian dan kuis interaktif untuk siswa.',
        isEnabled: true,
        isCore: true,
        targetRoles: ['student'],
      },
      {
        id: 'default-assignments',
        moduleId: 'assignments',
        slug: 'assignments',
        name: 'Pusat Tugas',
        description: 'Manajemen pengumpulan dan penilaian tugas.',
        isEnabled: true,
        isCore: true,
        targetRoles: ['teacher', 'student'],
      },
      {
        id: 'default-calendar',
        moduleId: 'calendar',
        slug: 'calendar',
        name: 'Jadwal & Kalender',
        description: 'Jadwal pelajaran dan agenda akademik sekolah.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher', 'student'],
      },
      {
        id: 'default-announcements',
        moduleId: 'announcements',
        slug: 'announcements',
        name: 'Pengumuman',
        description: 'Papan informasi dan berita sekolah.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher', 'student'],
      },
      {
        id: 'default-directory',
        moduleId: 'directory',
        slug: 'directory',
        name: 'Direktori Menu',
        description: 'Akses cepat ke semua fitur dalam satu halaman.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher', 'student'],
      },
      {
        id: 'default-ai-creator',
        moduleId: 'ai-creator',
        slug: 'ai-creator',
        name: 'AI Creator',
        description: 'Buat kuis & materi otomatis dari dokumen/video.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher'],
      },
      {
        id: 'default-analytics',
        moduleId: 'analytics',
        slug: 'analytics',
        name: 'Dasbor Analitik',
        description: 'Visualisasi data & prediksi risiko siswa.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher'],
      },
      {
        id: 'default-attendance',
        moduleId: 'attendance',
        slug: 'attendance',
        name: 'Scan Absensi',
        description: 'Scan otomatis buku absensi siswa menggunakan AI.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher'],
      },
      {
        id: 'default-documents',
        moduleId: 'documents',
        slug: 'documents',
        name: 'Surat & Dokumen',
        description: 'Smart editor & approval surat berjenjang.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher'],
      },
      {
        id: 'default-speed-grader',
        moduleId: 'speed-grader',
        slug: 'speed-grader',
        name: 'SpeedGrader',
        description: 'Penilaian esai dengan matriks rubrik transparan.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher'],
      },
      {
        id: 'default-group-assignment',
        moduleId: 'group-assignment',
        slug: 'group-assignment',
        name: 'Tugas Kelompok',
        description: 'Kolaborasi tugas kelompok dengan sinkronisasi Google Classroom.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher', 'student'],
      },
      {
        id: 'default-forum',
        moduleId: 'forum',
        slug: 'forum',
        name: 'Forum Diskusi',
        description: 'Ruang tanya jawab dan kolaborasi sosial.',
        isEnabled: true,
        isCore: false,
        targetRoles: ['teacher', 'student'],
      },
    ]
  },

  /**
   * Fetch paginated audit logs via get_audit_logs RPC.
   */
  async getAuditLogs(params: {
    action?: string | null
    cursor?: string | null
    limit: number
  }): Promise<AuditLog[]> {
    const { data, error } = await db.rpc('get_audit_logs', {
      p_action: params.action ?? null,
      p_cursor: params.cursor ?? null,
      p_limit: params.limit,
    })
    if (error) {
      // get_audit_logs RPC may not exist in this DB instance — return empty gracefully
      if (import.meta.env.DEV)
        console.warn('[AuditDashboard] get_audit_logs RPC unavailable:', error.message)
      return []
    }
    return (data ?? []) as AuditLog[]
  },

  /**
   * Health check — verifies DB and auth connectivity.
   * Returns structured health status instead of bare boolean.
   *
   * DB check: queries tenants table to verify data plane is accessible
   * Auth check: tests if auth service is responsive by checking session state
   *   - "ok" means auth service is reachable (user may or may not be logged in)
   *   - "error" means auth service is not reachable (network/service failure)
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down'
    checks: {
      db: 'ok' | 'error'
      auth: 'ok' | 'error'
    }
    timestamp: string
    version?: string
  }> {
    const { error: dbError } = await db.from('tenants').select('id').limit(1)
    const dbOk = !dbError

    const { error: sessionError } = await db.auth.getSession()
    const authOk = !sessionError

    let status: 'healthy' | 'degraded' | 'down' = 'healthy'
    if (!dbOk && !authOk) {
      status = 'down'
    } else if (!dbOk || !authOk) {
      status = 'degraded'
    }

    return {
      status,
      checks: {
        db: dbOk ? 'ok' : 'error',
        auth: authOk ? 'ok' : 'error',
      },
      timestamp: new Date().toISOString(),
      version: '4.0.0',
    }
  },

  /**
   * Fetch recent app metrics for the system health dashboard.
   */
  async getAppMetrics(): Promise<Array<{ metric_name: string; metric_value: number }>> {
    const { data, error } = await db
      .from('app_metrics')
      .select('metric_name, metric_value')
      .order('recorded_at', { ascending: false })
      .limit(50)
    if (error) {
      if (import.meta.env.DEV) console.warn('Could not fetch app_metrics:', error)
      return []
    }
    return data ?? []
  },

  // ── Finance: Invoice helpers ────────────────────────────────────────────────

  /**
   * Mengambil daftar profil siswa dalam satu tenant untuk pilihan invoice.
   */
  async fetchStudentsForInvoice(
    tenantId: string
  ): Promise<Array<{ id: string; full_name: string | null; email: string }>> {
    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true })
      .limit(200)
    if (error) {
      if (import.meta.env.DEV) console.warn('[Finance] fetchStudentsForInvoice error:', error)
      return []
    }
    return (data ?? []) as Array<{ id: string; full_name: string | null; email: string }>
  },

  /**
   * Membuat tagihan baru via RPC create_invoice.
   */
  async createInvoice(params: {
    student_id: string
    amount: number
    description: string
    due_date: string | null
    month_year: string | null
  }): Promise<void> {
    const { error } = await db.rpc('create_invoice', {
      p_student_id: params.student_id,
      p_amount: params.amount,
      p_description: params.description,
      p_due_date: params.due_date,
      p_month_year: params.month_year,
    })
    if (error) throw error
  },
}
