import { db } from "@/services/db";

export type RaporStatus =
  | "draft"
  | "guru_signed"
  | "wali_signed"
  | "kepsek_signed"
  | "published";

export interface RaporDocument {
  id: string;
  tenant_id: string;
  student_id: string;
  semester_id: string;
  academic_year_id: string | null;
  rombel_id: string | null;
  student_name: string;
  nisn: string | null;
  rombel_name: string | null;
  status: RaporStatus;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  ai_narrative: string | null;
  ai_narrative_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RaporSubjectGrade {
  id: string;
  rapor_id: string;
  subject_id: string | null;
  tenant_id: string;
  subject_name: string;
  nilai_akhir: number | null;
  descriptor: "BB" | "MB" | "BSH" | "SB" | null;
  deskripsi_capaian: string | null;
  teacher_id: string | null;
  created_at: string;
}

const COLUMNS =
  "id, tenant_id, student_id, semester_id, academic_year_id, rombel_id, student_name, nisn, rombel_name, status, pdf_url, pdf_generated_at, ai_narrative, ai_narrative_at, created_at, updated_at";

export const raporService = {
  async list(
    tenantId: string,
    rombelId?: string | null,
    semesterId?: string | null,
  ): Promise<RaporDocument[]> {
    let q = db
      .from<Array<RaporDocument>>("rapor_documents")
      .select(COLUMNS)
      .eq("tenant_id", tenantId);
    if (rombelId) q = q.eq("rombel_id", rombelId);
    if (semesterId) q = q.eq("semester_id", semesterId);
    const { data, error } = await q.order("student_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as RaporDocument[];
  },

  async getSubjectGrades(raporId: string): Promise<RaporSubjectGrade[]> {
    const { data, error } = await db
      .from<Array<RaporSubjectGrade>>("rapor_subject_grades")
      .select(
        "id, rapor_id, subject_id, tenant_id, subject_name, nilai_akhir, descriptor, deskripsi_capaian, teacher_id, created_at",
      )
      .eq("rapor_id", raporId)
      .order("subject_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as RaporSubjectGrade[];
  },

  async sign(input: {
    raporId: string;
    signerId: string;
    signerRole: "guru" | "wali_kelas" | "kepsek";
    notes?: string;
  }): Promise<RaporDocument> {
    const { data, error } = await db.rpc("sign_rapor", {
      p_rapor_id: input.raporId,
      p_signer_id: input.signerId,
      p_signer_role: input.signerRole,
      p_notes: input.notes ?? null,
      p_signature_hash: null,
    });
    if (error) {
      if (error.code === "P0002") throw new Error("Rapor tidak ditemukan");
      if (error.code === "P0003")
        throw new Error(
          "Tahap tanda tangan tidak valid (urutan: guru → wali kelas → kepsek)",
        );
      throw error;
    }
    return data as unknown as RaporDocument;
  },
};
