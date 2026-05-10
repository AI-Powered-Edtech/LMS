import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { raporService } from "@/features/rapor/api/raporService";
import { usePageTitle } from "@/hooks/usePageTitle";
import { db } from "@/services/db";

interface RaporSignature {
  id: string;
  rapor_id: string;
  signer_id: string;
  signer_role: "guru" | "wali_kelas" | "kepsek";
  signed_at: string;
  signature_hash: string;
}

/**
 * Print-optimized rapor view. Browser Ctrl+P or puppeteer-headless renders this
 * to PDF (Fase 3 Unit 27 — template engine fallback). Deliberately uses
 * minimal Tailwind utilities + print: variants for clean A4 output.
 *
 * URL: /app/admin/rapor/print/:raporId
 */
export function RaporPrint() {
  const { t } = useTranslation();
  const { raporId } = useParams<{ raporId: string }>();
  usePageTitle(t("raporPrint.pageTitle"));

  const { data: rapor } = useQuery({
    queryKey: ["rapor_document", raporId],
    queryFn: async () => {
      if (!raporId) return null;
      const { data, error } = await db
        .from("rapor_documents")
        .select(
          "id, tenant_id, student_id, semester_id, academic_year_id, rombel_id, student_name, nisn, rombel_name, status, ai_narrative",
        )
        .eq("id", raporId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        tenant_id: string;
        student_id: string;
        semester_id: string | null;
        academic_year_id: string | null;
        rombel_id: string | null;
        student_name: string | null;
        nisn: string | null;
        rombel_name: string | null;
        status: string;
        ai_narrative: string | null;
      } | null;
    },
    enabled: !!raporId,
  });

  const { data: subjectGrades = [] } = useQuery({
    queryKey: ["rapor_subject_grades", raporId],
    queryFn: () =>
      raporId ? raporService.getSubjectGrades(raporId) : Promise.resolve([]),
    enabled: !!raporId,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["rapor_signatures", raporId],
    queryFn: async () => {
      if (!raporId) return [] as RaporSignature[];
      const { data, error } = await db
        .from<Array<RaporSignature>>("rapor_signatures")
        .select(
          "id, rapor_id, signer_id, signer_role, signed_at, signature_hash",
        )
        .eq("rapor_id", raporId)
        .order("signed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RaporSignature[];
    },
    enabled: !!raporId,
  });

  useEffect(() => {
    document.body.classList.add("print-rapor");
    return () => document.body.classList.remove("print-rapor");
  }, []);

  if (!rapor)
    return (
      <div className="p-8 text-sm text-slate-500">
        {t("raporPrint.loading")}
      </div>
    );

  return (
    <div className="bg-white text-slate-900 mx-auto my-6 max-w-[210mm] p-10 shadow print:shadow-none print:my-0 print:p-8">
      <div className="flex justify-end mb-4 print:hidden">
        <Button
          variant="primary"
          icon={<Printer className="w-4 h-4" />}
          onClick={() => window.print()}
        >
          {t("raporPrint.printButton")}
        </Button>
      </div>

      <header className="text-center pb-4 border-b border-slate-300">
        <h1 className="text-2xl font-bold uppercase">
          {t("raporPrint.header.title")}
        </h1>
        <p className="text-sm mt-1">{t("raporPrint.header.subtitle")}</p>
      </header>

      <section className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mt-6">
        <div>
          <span className="text-slate-600">
            {t("raporPrint.fields.studentName")}
          </span>
          <p className="font-semibold">{rapor.student_name}</p>
        </div>
        <div>
          <span className="text-slate-600">{t("raporPrint.fields.nisn")}</span>
          <p className="font-semibold">{rapor.nisn ?? "—"}</p>
        </div>
        <div>
          <span className="text-slate-600">{t("raporPrint.fields.kelas")}</span>
          <p className="font-semibold">{rapor.rombel_name ?? "—"}</p>
        </div>
        <div>
          <span className="text-slate-600">
            {t("raporPrint.fields.status")}
          </span>
          <p className="font-semibold">
            {t(`raporPrint.statusLabels.${rapor.status}`, {
              defaultValue: rapor.status,
            })}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">
          {t("raporPrint.subjectGrades.title")}
        </h2>
        <table className="w-full text-sm border border-slate-300">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left p-2 border border-slate-300 w-8">
                {t("raporPrint.subjectGrades.headers.no")}
              </th>
              <th className="text-left p-2 border border-slate-300">
                {t("raporPrint.subjectGrades.headers.subject")}
              </th>
              <th className="text-right p-2 border border-slate-300 w-20">
                {t("raporPrint.subjectGrades.headers.score")}
              </th>
              <th className="text-center p-2 border border-slate-300 w-20">
                {t("raporPrint.subjectGrades.headers.grade")}
              </th>
              <th className="text-left p-2 border border-slate-300">
                {t("raporPrint.subjectGrades.headers.description")}
              </th>
            </tr>
          </thead>
          <tbody>
            {subjectGrades.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-slate-500 italic border border-slate-300"
                >
                  {t("raporPrint.subjectGrades.empty")}
                </td>
              </tr>
            ) : (
              subjectGrades.map((g, i) => (
                <tr key={g.id}>
                  <td className="p-2 border border-slate-300">{i + 1}</td>
                  <td className="p-2 border border-slate-300">
                    {g.subject_name}
                  </td>
                  <td className="p-2 border border-slate-300 text-right">
                    {g.nilai_akhir != null
                      ? Number(g.nilai_akhir).toFixed(1)
                      : "—"}
                  </td>
                  <td className="p-2 border border-slate-300 text-center font-semibold">
                    {g.descriptor ?? "—"}
                  </td>
                  <td className="p-2 border border-slate-300 text-xs">
                    {g.deskripsi_capaian ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {rapor.ai_narrative && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-2">
            {t("raporPrint.narrativeTitle")}
          </h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {rapor.ai_narrative}
          </p>
        </section>
      )}

      <section className="mt-12 grid grid-cols-3 gap-8 text-sm text-center">
        {(["guru", "wali_kelas", "kepsek"] as const).map((role) => {
          const sig = signatures.find((s) => s.signer_role === role);
          return (
            <div key={role}>
              <p className="font-medium capitalize">
                {t(`raporPrint.signatureRoles.${role}`)}
              </p>
              <div className="mt-16 pt-2 border-t border-slate-400 mx-4">
                <p className="text-xs">
                  {sig
                    ? t("raporPrint.signatureSigned").replace(
                        "__DATE__",
                        new Date(sig.signed_at).toLocaleDateString("id-ID"),
                      )
                    : t("raporPrint.signaturePending")}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <footer className="mt-8 text-center text-xs text-slate-500">
        <p>
          {t("raporPrint.footer.lead")}{" "}
          {signatures.map((s) => s.signature_hash.slice(0, 12)).join(", ")}
        </p>
      </footer>
    </div>
  );
}
