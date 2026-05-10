import { db } from "@/services/db";

export interface TimetableSlot {
  id: string;
  tenant_id: string;
  academic_year_id: string | null;
  rombel_id: string;
  subject_id: string;
  teacher_id: string | null;
  weekday: number;
  period_start: number;
  period_end: number;
  room_label: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  "id, tenant_id, academic_year_id, rombel_id, subject_id, teacher_id, weekday, period_start, period_end, room_label, note, created_at, updated_at";

export const timetableService = {
  async listForRombel(
    tenantId: string,
    rombelId: string,
    academicYearId?: string | null,
  ): Promise<TimetableSlot[]> {
    let q = db
      .from<Array<TimetableSlot>>("timetable_slots")
      .select(COLUMNS)
      .eq("tenant_id", tenantId)
      .eq("rombel_id", rombelId);
    if (academicYearId) q = q.eq("academic_year_id", academicYearId);
    const { data, error } = await q.order("weekday").order("period_start");
    if (error) throw error;
    return (data ?? []) as TimetableSlot[];
  },

  async upsert(
    input: Omit<TimetableSlot, "id" | "created_at" | "updated_at"> & {
      id?: string;
    },
  ): Promise<TimetableSlot> {
    if (input.id) {
      const { data, error } = await db
        .from<Array<TimetableSlot>>("timetable_slots")
        .update({
          subject_id: input.subject_id,
          teacher_id: input.teacher_id,
          period_end: input.period_end,
          room_label: input.room_label,
          note: input.note,
        })
        .eq("id", input.id)
        .eq("tenant_id", input.tenant_id)
        .select(COLUMNS)
        .single();
      if (error) throw error;
      return data as unknown as TimetableSlot;
    }
    const { data, error } = await db
      .from<Array<TimetableSlot>>("timetable_slots")
      .insert({
        tenant_id: input.tenant_id,
        academic_year_id: input.academic_year_id,
        rombel_id: input.rombel_id,
        subject_id: input.subject_id,
        teacher_id: input.teacher_id,
        weekday: input.weekday,
        period_start: input.period_start,
        period_end: input.period_end,
        room_label: input.room_label,
        note: input.note,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data as unknown as TimetableSlot;
  },

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from<Array<TimetableSlot>>("timetable_slots")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) throw error;
  },
};
