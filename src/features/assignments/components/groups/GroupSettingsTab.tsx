import { AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "@/utils/cn";

export interface GroupSettings {
  method: string;
  docCollab: "single_doc" | "shared_folder";
  peerReview: boolean;
}

interface Props {
  onSave: (settings: GroupSettings) => void;
}

export function GroupSettingsTab({ onSave }: Props) {
  const [method, setMethod] = useState("");
  const [docCollab, setDocCollab] =
    useState<GroupSettings["docCollab"]>("single_doc");
  const [peerReview, setPeerReview] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!method) {
      newErrors.method = "Metode pembagian kelompok wajib dipilih.";
    }
    return newErrors;
  }, [method]);

  const handleSave = () => {
    setTouched(true);
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSave({ method, docCollab, peerReview });
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none max-w-3xl">
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Pengaturan Tugas Kelompok
      </h3>
      <div className="space-y-6">
        <div className="space-y-3">
          <label
            htmlFor="group-method"
            className="text-sm font-bold text-slate-700 dark:text-slate-300"
          >
            Metode Pembagian Kelompok
          </label>
          <select
            id="group-method"
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              if (touched) {
                setErrors((prev) => {
                  const next = { ...prev };
                  if (e.target.value) delete next.method;
                  else next.method = "Metode pembagian kelompok wajib dipilih.";
                  return next;
                });
              }
            }}
            aria-invalid={!!errors.method}
            aria-describedby={errors.method ? "group-method-error" : undefined}
            className={cn(
              "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400",
              "text-slate-900 dark:text-slate-100",
              errors.method
                ? "border-red-400 dark:border-red-500"
                : "border-slate-200 dark:border-slate-600",
            )}
          >
            <option value="">— Pilih metode —</option>
            <option value="random">Otomatis (Acak)</option>
            <option value="gcr_sync">
              Sinkronisasi dari Google Classroom (Kelompok Siswa)
            </option>
            <option value="manual">Pilih Manual</option>
            <option value="self_select">Siswa Memilih Sendiri</option>
          </select>
          {errors.method && (
            <p
              id="group-method-error"
              role="alert"
              className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errors.method}
            </p>
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Opsi Kolaborasi Dokumen
          </p>
          <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="doc_collab"
                checked={docCollab === "single_doc"}
                onChange={() => setDocCollab("single_doc")}
                className="mt-1 w-4 h-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Satu Dokumen per Kelompok
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sistem akan membuat salinan template untuk setiap kelompok.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="doc_collab"
                checked={docCollab === "shared_folder"}
                onChange={() => setDocCollab("shared_folder")}
                className="mt-1 w-4 h-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Folder Bersama
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Buat folder Google Drive khusus untuk tiap kelompok.
                </p>
              </div>
            </label>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Penilaian Sejawat
          </p>
          <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={peerReview}
              onChange={(e) => setPeerReview(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Wajibkan Penilaian Antar Anggota
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Siswa harus menilai kontribusi anggota kelompoknya sebelum tugas
                dianggap selesai.
              </p>
            </div>
          </label>
        </div>
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-sm dark:shadow-indigo-900/20"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
}
