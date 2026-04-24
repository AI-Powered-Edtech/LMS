import { db } from '@/services/db'

export type RombelStatus = 'active' | 'archived'

export interface Rombel {
  id: string
  tenant_id: string
  academic_year_id: string | null
  grade_level_id: string | null
  code: string
  name: string
  wali_kelas_id: string | null
  capacity: number
  status: RombelStatus
  created_at: string
  updated_at: string
}

export interface RombelMember {
  id: string
  rombel_id: string
  student_id: string
  tenant_id: string
  joined_at: string
  left_at: string | null
}

const COLUMNS =
  'id, tenant_id, academic_year_id, grade_level_id, code, name, wali_kelas_id, capacity, status, created_at, updated_at'

export const rombelService = {
  async list(tenantId: string, academicYearId?: string | null): Promise<Rombel[]> {
    let query = db
      .from<Array<Rombel>>('rombel')
      .select(COLUMNS)
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true })
    if (academicYearId) query = query.eq('academic_year_id', academicYearId)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Rombel[]
  },

  async create(input: {
    tenantId: string
    academicYearId: string | null
    gradeLevelId: string | null
    code: string
    name: string
    waliKelasId: string | null
    capacity: number
  }): Promise<Rombel> {
    const { data, error } = await db
      .from<Array<Rombel>>('rombel')
      .insert({
        tenant_id: input.tenantId,
        academic_year_id: input.academicYearId,
        grade_level_id: input.gradeLevelId,
        code: input.code,
        name: input.name,
        wali_kelas_id: input.waliKelasId,
        capacity: input.capacity,
      })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return (data as unknown) as Rombel
  },

  async update(id: string, tenantId: string, patch: Partial<Pick<Rombel, 'name' | 'wali_kelas_id' | 'capacity' | 'status'>>): Promise<void> {
    const { error } = await db
      .from<Array<Rombel>>('rombel')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) throw error
  },

  async listMembers(rombelId: string): Promise<RombelMember[]> {
    const { data, error } = await db
      .from<Array<RombelMember>>('rombel_members')
      .select('id, rombel_id, student_id, tenant_id, joined_at, left_at')
      .eq('rombel_id', rombelId)
      .is('left_at', null)
      .order('joined_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as RombelMember[]
  },

  async enrollMember(rombelId: string, studentId: string): Promise<RombelMember> {
    const { data, error } = await db.rpc('enroll_rombel_member', {
      p_rombel_id: rombelId,
      p_student_id: studentId,
    })
    if (error) {
      if (error.code === 'P0002') throw new Error('Rombel tidak ditemukan')
      if (error.code === 'P0003') throw new Error('Rombel sudah diarsipkan')
      if (error.code === 'P0004') throw new Error('Rombel sudah penuh')
      throw error
    }
    return (data as unknown) as RombelMember
  },

  async removeMember(memberId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from<Array<RombelMember>>('rombel_members')
      .update({ left_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
    if (error) throw error
  },
}
