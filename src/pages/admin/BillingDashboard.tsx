import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Loader2,
  Plus,
  Receipt,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";
import { db } from "@/services/db";
import {
  formatCurrency,
  formatDate as formatDateId,
} from "@/shared/utils/format-id";
import { cn } from "@/utils/cn";

// --- UTILS ---
const formatDate = (dateString: string) =>
  formatDateId(dateString, { year: "numeric", month: "short", day: "numeric" });

const getStatusLabel = (status: string) => {
  switch (status) {
    case "paid":
      return "Lunas";
    case "open":
      return "Menunggu";
    case "draft":
      return "Draf";
    case "uncollectible":
      return "Gagal";
    case "void":
      return "Batal";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "open":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    case "draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400";
    default:
      return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "open":
      return <Clock className="w-3.5 h-3.5" />;
    default:
      return <AlertCircle className="w-3.5 h-3.5" />;
  }
};

interface Invoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date: string;
  created_at: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  plan: { name: string; price: number };
}

export function BillingDashboard() {
  usePageTitle("Tagihan & Pembayaran");
  const { tenantId } = useAuth();
  const { addToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // ⚡ Perf: Debounce search input to avoid re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    async function fetchData() {
      if (!tenantId) return;
      setLoading(true);

      try {
        const { data: invData, error: invErr } = await db
          .from("invoices")
          .select("id, amount_due, amount_paid, status, due_date, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (invErr) throw invErr;

        const { data: subData, error: subErr } = await db
          .from("tenant_subscriptions")
          .select(`id, status, current_period_end, plan_id`)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        // If no sub, that's fine (trial or free)
        if (subErr) throw subErr;

        if (subData) {
          const subDataTyped = subData as { plan_id: string };
          const { data: planData } = await db
            .from("billing_plans")
            .select("id, name, price")
            .eq("id", subDataTyped.plan_id)
            .maybeSingle();
          const planDataTyped = planData as {
            name: string;
            price: number;
          } | null;
          setSubscription({
            id: (subData as { id: string }).id,
            status: (subData as { status: string }).status,
            current_period_end: (subData as { current_period_end: string })
              .current_period_end,
            plan: planDataTyped || { name: "Unknown", price: 0 },
          });
        }

        setInvoices((invData ?? []) as Invoice[]);
      } catch {
        addToast({ type: "error", message: "Gagal memuat data tagihan" });
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [tenantId, addToast, page, PAGE_SIZE]);

  // ⚡ Perf: Memoize filteredInvoices — was recomputed on every render without useMemo
  const filteredInvoices = useMemo(
    () =>
      invoices.filter((inv) =>
        inv.id.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [invoices, debouncedSearch],
  );

  // ⚡ Perf: Memoize unpaidTotal — was recomputed on every render without useMemo
  const unpaidTotal = useMemo(
    () =>
      invoices
        .filter((i) => i.status === "open")
        .reduce((sum, inv) => sum + inv.amount_due - inv.amount_paid, 0),
    [invoices],
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Tagihan & Pembayaran
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola langganan, riwayat tagihan, dan metode pembayaran Anda.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              addToast({
                type: "warning",
                message: "Fitur metode pembayaran dalam pengembangan.",
              })
            }
            disabled
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-300 text-slate-500 text-sm font-medium rounded-xl transition-colors shadow-sm cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Metode Pembayaran
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 dark:from-blue-500/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Paket Aktif
              </p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {subscription ? subscription.plan.name : "Gratis"}
              </h3>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(subscription ? subscription.plan.price : 0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {subscription
                  ? `Perpanjangan: ${formatDate(subscription.current_period_end)}`
                  : "Tanpa batas waktu"}
              </p>
            </div>
            {subscription && subscription.status === "active" && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                Aktif
              </span>
            )}
          </div>
        </motion.div>

        {/* Unpaid Total */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-500/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total Belum Dibayar
              </p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Tagihan Aktif
              </h3>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">
                {formatCurrency(unpaidTotal)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Segera lunasi untuk menghindari pemutusan
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Riwayat Tagihan
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor tagihan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari nomor tagihan"
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  No. Tagihan / Tanggal
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      icon={<Receipt className="w-8 h-8" />}
                      title="Tidak ada tagihan"
                      description="Tagihan akan muncul setelah ada transaksi"
                    />
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white uppercase">
                          INV-{inv.id.substring(0, 8)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatDate(inv.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatCurrency(inv.amount_due)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          getStatusColor(inv.status),
                        )}
                      >
                        {getStatusIcon(inv.status)}
                        {getStatusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Unduh PDF"
                        aria-label="Unduh PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Halaman {page + 1}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={invoices.length < PAGE_SIZE}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
