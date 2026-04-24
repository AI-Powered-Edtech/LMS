import { db } from '@/services/db'

export interface Subject {
  id: string
  tenant_id: string
  code: string
  name: string
  school_band: 'SD' | 'SMP' | 'SMA'
  is_kurmer_phase: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CurriculumItem {
  id: string
  tenant_id: string
  subject_id: string
  grade_level_id: string | null
  parent_id: string | null
  code: string
  item_type: 'CP' | 'ATP' | 'TP'
  title: string
  description: string | null
  sort_order: number
}

const SUBJECT_COLUMNS =
  'id, tenant_id, code, name, school_band, is_kurmer_phase, description, is_active, created_at, updated_at'

const CI_COLUMNS =
  'id, tenant_id, subject_id, grade_level_id, parent_id, code, item_type, title, description, sort_order'

export const subjectService = {
  async list(tenantId: string): Promise<Subject[]> {
    const { data, error } = await db
      .from<Array<Subject>>('subjects')
      .select(SUBJECT_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('school_band', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return (data ?? []) as Subject[]
  },

  async create(input: Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Subject> {
    const { data, error } = await db
      .from<Array<Subject>>('subjects')
      .insert({ ...input, is_active: true })
      .select(SUBJECT_COLUMNS)
      .single()
    if (error) throw error
    return (data as unknown) as Subject
  },

  async listCurriculumItems(tenantId: string, subjectId: string): Promise<CurriculumItem[]> {
    const { data, error } = await db
      .from<Array<CurriculumItem>>('curriculum_items')
      .select(CI_COLUMNS)
      .eq('tenant_id', tenantId)
      .eq('subject_id', subjectId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []) as CurriculumItem[]
  },

  async createCurriculumItem(
    input: Omit<CurriculumItem, 'id'>,
  ): Promise<CurriculumItem> {
    const { data, error } = await db
      .from<Array<CurriculumItem>>('curriculum_items')
      .insert(input)
      .select(CI_COLUMNS)
      .single()
    if (error) throw error
    return (data as unknown) as CurriculumItem
  },
}
