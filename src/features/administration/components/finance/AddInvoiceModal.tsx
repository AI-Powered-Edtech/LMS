import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";

import { administrationService } from "../../api/administrationService";

interface AddInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface StudentOption {
  id: string;
  full_name: string | null;
  email: string;
}

export function AddInvoiceModal({ onClose, onSuccess }: AddInvoiceModalProps) {
  const addToast = useToast((s) => s.addToast);
  const { tenantId } = useAuth();

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("SPP Bulanan");
  const [dueDate, setDueDate] = useState("");
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    async function loadStudents() {
      setStudentsLoading(true);
      try {
        const data = await administrationService.fetchStudentsForInvoice(
          tenantId!,
        );
        if (!cancelled) setStudents(data);
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    }
    void loadStudents();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      addToast({
        message: "Mohon isi ID siswa dan jumlah tagihan yang valid",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await administrationService.createInvoice({
        student_id: studentId,
        amount: Number(amount),
        description: description || "SPP Bulanan",
        due_date: dueDate || null,
        month_year: monthYear || null,
      });
      addToast({ message: "Tagihan berhasil dibuat", type: "success" });
      onSuccess();
      onClose();
    } catch (err) {
      addToast({
        message: "Gagal membuat tagihan: " + (err as Error).message,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Tambah Tagihan Manual
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Siswa <span className="text-red-500">*</span>
            </label>
            {studentsLoading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            ) : (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="">-- Pilih siswa --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name ?? s.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Jumlah (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Contoh: 500000"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Keterangan
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan tagihan"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bulan/Tahun
              </label>
              <input
                type="month"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tgl. Jatuh Tempo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Menyimpan..." : "Simpan Tagihan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
