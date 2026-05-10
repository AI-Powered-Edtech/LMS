import { db } from "@/services/db";

export interface StudentDossier {
  profile_id: string;
  tenant_id: string;
  nisn: string | null;
  nik: string | null;
  nis_local: string | null;
  place_of_birth: string | null;
  date_of_birth: string | null;
  gender: "L" | "P" | null;
  religion: string | null;
  nationality: string | null;
  address_street: string | null;
  address_rt: string | null;
  address_rw: string | null;
  address_kelurahan: string | null;
  address_kecamatan: string | null;
  address_kota_kab: string | null;
  address_province: string | null;
  address_postal_code: string | null;
  father_name: string | null;
  father_occupation: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_occupation: string | null;
  mother_phone: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;
  previous_school: string | null;
  enrollment_year: number | null;
}

export const dossierService = {
  async get(profileId: string): Promise<StudentDossier | null> {
    const { data, error } = await db
      .from<Array<StudentDossier>>("student_dossier")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as StudentDossier | null;
  },

  async upsert(
    input: Partial<StudentDossier> & { profile_id: string; tenant_id: string },
  ): Promise<StudentDossier> {
    const existing = await this.get(input.profile_id);
    if (existing) {
      const { data, error } = await db
        .from<Array<StudentDossier>>("student_dossier")
        .update(input)
        .eq("profile_id", input.profile_id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as StudentDossier;
    }
    const { data, error } = await db
      .from<Array<StudentDossier>>("student_dossier")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as StudentDossier;
  },
};
