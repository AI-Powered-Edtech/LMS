import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileSignature, Lock } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import {
  type RaporDocument,
  raporService,
} from "@/features/rapor/api/raporService";
import { useRombelList } from "@/features/rombel/hooks/useRombel";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  guru_signed: "Ditandatangani Guru",
  wali_signed: "Ditandatangani Wali Kelas",
  kepsek_signed: "Ditandatangani Kepsek",
  published: "Diterbitkan",
};

const NEXT_ROLE: Record<string, "guru" | "wali_kelas" | "kepsek" | null> = {
  draft: "guru",
  guru_signed: "wali_kelas",
  wali_signed: "kepsek",
  kepsek_signed: null,
  published: null,
};

export function Rapor() {
  usePageTitle("Rapor Kurmer");
  const { tenantId, user, role } = useAuth();
  const { addToast } = useToast();
  const { data: rombels = [] } = useRombelList();
  const qc = useQueryClient();

  const [selectedRombelId, setSelectedRombelId] = useState<string>("");
  const [pendingSign, setPendingSign] = useState<RaporDocument | null>(null);

  const { data: rapors = [], isLoading } = useQuery({
    queryKey: ["rapor_documents", tenantId, selectedRombelId],
    queryFn: () =>
      tenantId && selectedRombelId
        ? raporService.list(tenantId, selectedRombelId)
        : Promise.resolve([]),
    enabled: !!tenantId && !!selectedRombelId,
  });

  async function handleSign(rapor: RaporDocument) {
    const next = NEXT_ROLE[rapor.status];
    if (!next || !user) return;
    const allowedByRole =
      (next === "guru" && (role === "teacher" || role === "admin")) ||
      (next === "wali_kelas" && (role === "teacher" || role === "admin")) ||
      (next === "kepsek" && (role === "principal" || role === "admin"));
    if (!allowedByRole) {
      addToast({
        type: "error",
        message: `Anda tidak berhak menandatangani sebagai ${next}`,
      });
      return;
    }
    setPendingSign(rapor);
  }

  async function confirmSign() {
    if (!pendingSign || !user) return;
    const next = NEXT_ROLE[pendingSign.status];
    if (!next) return;
    try {
      await raporService.sign({
        raporId: pendingSign.id,
        signerId: user.id,
        signerRole: next,
      });
      addToast({ type: "success", message: "Rapor ditandatangani" });
      void qc.invalidateQueries({ queryKey: ["rapor_documents"] });
      setPendingSign(null);
    } catch (err) {
      addToast({
        type: "error",
        message: "Gagal menandatangani",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <FileSignature className="w-6 h-6 text-indigo-500" />
          Rapor Kurmer
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Daftar rapor per rombel dengan workflow tanda tangan: guru → wali
          kelas → kepala sekolah.
        </p>
      </div>

      <ConfirmDialog
        open={pendingSign !== null}
        title="Tanda tangani rapor?"
        description={`Rapor ${pendingSign?.student_name ?? ""} akan ditandatangani sebagai ${pendingSign ? NEXT_ROLE[pendingSign.status] : ""}.`}
        confirmLabel="Tanda Tangani"
        variant="warning"
        onCancel={() => setPendingSign(null)}
        onConfirm={confirmSign}
      />

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>Rombel:</span>
            <select
              id="rapor-rombel"
              value={selectedRombelId}
              onChange={(e) => setSelectedRombelId(e.target.value)}
              className="w-64"
            >
              <option value="">— pilih rombel —</option>
              {rombels.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!selectedRombelId ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Pilih rombel untuk melihat daftar rapor.
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Memuat...
          </div>
        ) : rapors.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Belum ada rapor untuk rombel ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama Siswa</th>
                  <th className="px-4 py-3 font-medium">NISN</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rapors.map((r) => {
                  const next = NEXT_ROLE[r.status];
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {r.student_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {r.nisn ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          {r.status === "published" ||
                          r.status === "kepsek_signed" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : r.status === "draft" ? (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <FileSignature className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {next ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSign(r)}
                          >
                            Tanda Tangani sebagai {next}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
