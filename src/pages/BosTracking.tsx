import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { bosService } from "@/features/bos/api/bosService";
import { useLocaleFormatters } from "@/hooks/useLocaleFormatters";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";

export function BosTracking() {
  usePageTitle("BOS — Pelacakan Pengeluaran");
  const { tenantId } = useAuth();
  const { addToast } = useToast();
  const { formatCurrency, formatDate } = useLocaleFormatters();
  const qc = useQueryClient();

  const { data: periods = [] } = useQuery({
    queryKey: ["bos_periods", tenantId],
    queryFn: () =>
      tenantId ? bosService.listPeriods(tenantId) : Promise.resolve([]),
    enabled: !!tenantId,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["bos_categories"],
    queryFn: () => bosService.listCategories(),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["bos_expenses", tenantId],
    queryFn: () =>
      tenantId ? bosService.listExpenses(tenantId) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [periodId, setPeriodId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [vendorName, setVendorName] = useState("");

  const create = useMutation({
    mutationFn: () =>
      bosService.createExpense({
        tenantId: tenantId!,
        fundingPeriodId: periodId || null,
        categoryId: categoryId || null,
        description,
        amount: Number.parseFloat(amount) || 0,
        expenseDate,
        vendorName: vendorName || undefined,
      }),
    onSuccess: () => {
      addToast({ type: "success", message: "Pengeluaran ditambahkan" });
      setIsOpen(false);
      setDescription("");
      setAmount("");
      setVendorName("");
      void qc.invalidateQueries({ queryKey: ["bos_expenses", tenantId] });
    },
    onError: (err) =>
      addToast({
        type: "error",
        message: "Gagal menambah pengeluaran",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      }),
  });

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalReceived = periods.reduce(
    (s, p) => s + Number(p.received_amount),
    0,
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-500" />
            BOS — Pelacakan Pengeluaran
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kategori sesuai Permendikbud BOS Reguler.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsOpen(true)}
        >
          Catat Pengeluaran
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-slate-500 uppercase">Total Diterima</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalReceived)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase">Total Pengeluaran</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalSpent)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase">Sisa</p>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">
            {formatCurrency(totalReceived - totalSpent)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Pengeluaran Terbaru
        </h2>
        {expenses.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Belum ada pengeluaran.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((e) => {
                  const cat = categories.find((c) => c.id === e.category_id);
                  return (
                    <tr key={e.id}>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(e.expense_date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {e.description}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {cat?.label ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(Number(e.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            e.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : e.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {e.status === "approved"
                            ? "Disetujui"
                            : e.status === "rejected"
                              ? "Ditolak"
                              : "Menunggu"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <ModalHeader
            title="Pengeluaran BOS Baru"
            onClose={() => setIsOpen(false)}
          />
          <ModalBody>
            <div className="space-y-4">
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                <option value="">— tidak ditentukan —</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.period_label}
                  </option>
                ))}
              </select>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— tidak ditentukan —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}. {c.label}
                  </option>
                ))}
              </select>
              <Input
                label="Deskripsi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <Input
                type="number"
                label="Nominal (Rp)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={0}
              />
              <Input
                type="date"
                label="Tanggal"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
              <Input
                label="Vendor"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={create.isPending}>
              {create.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
