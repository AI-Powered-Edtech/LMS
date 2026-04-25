/**
 * Parent invoice list with Midtrans Snap "Bayar" — Workstream C3.
 *
 * Fetches via RPC `get_parent_invoices` (RLS-scoped), renders one row per
 * outstanding invoice. "Bayar" calls `POST /api/v1/payments/snap` to mint a
 * Snap token, opens the Snap modal, then re-queries on close to pick up the
 * server-side state change driven by the Midtrans webhook.
 */

import { useCallback, useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/shared/utils/format-id'
import {
  createSnapSession,
  listParentInvoices,
  type ParentInvoice,
} from '../api/financeApi'
import { loadSnap } from '../utils/snapLoader'

const STATUS_LABEL: Record<ParentInvoice['status'], string> = {
  pending: 'Belum dibayar',
  unpaid: 'Belum dibayar',
  paid: 'Lunas',
  cancelled: 'Dibatalkan',
  failed: 'Gagal',
}

const STATUS_TONE: Record<ParentInvoice['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  unpaid: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-zinc-100 text-zinc-700',
  failed: 'bg-rose-100 text-rose-800',
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<ParentInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const rows = await listParentInvoices()
      setInvoices(rows)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handlePay = useCallback(
    async (invoice: ParentInvoice) => {
      setError(null)
      setPayingId(invoice.id)
      try {
        const snap = await loadSnap()
        const session = await createSnapSession(invoice.id)
        snap.pay(session.snap_token, {
          onSuccess: () => void refresh(),
          onPending: () => void refresh(),
          onError: () => {
            setError('Pembayaran gagal. Silakan coba lagi.')
            setPayingId(null)
          },
          onClose: () => {
            setPayingId(null)
            // Webhook is async — give it a moment, then re-query.
            window.setTimeout(() => void refresh(), 1500)
          },
        })
      } catch (err) {
        setError((err as Error).message)
        setPayingId(null)
      }
    },
    [refresh],
  )

  if (loading) {
    return (
      <div data-testid="invoice-list-loading" className="p-6 text-sm text-zinc-500">
        Memuat tagihan…
      </div>
    )
  }

  return (
    <section className="space-y-3" data-testid="parent-invoice-list">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tagihan SPP</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
          data-testid="invoice-refresh"
        >
          Segarkan
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          data-testid="invoice-error"
          className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <p className="rounded-md bg-zinc-50 p-6 text-center text-sm text-zinc-600">
          Tidak ada tagihan saat ini.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {invoices.map((invoice) => {
            const payable =
              invoice.status === 'pending' || invoice.status === 'unpaid'
            const isPaying = payingId === invoice.id
            return (
              <li
                key={invoice.id}
                data-testid={`invoice-row-${invoice.id}`}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {invoice.invoice_number || invoice.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {invoice.student_name}
                    {invoice.due_date
                      ? ` · jatuh tempo ${formatDate(invoice.due_date)}`
                      : null}
                  </div>
                  {invoice.notes ? (
                    <div className="mt-1 text-xs text-zinc-500">{invoice.notes}</div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[invoice.status]}`}
                  >
                    {STATUS_LABEL[invoice.status]}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(invoice.amount_due)}
                  </span>
                  {payable ? (
                    <button
                      type="button"
                      disabled={isPaying}
                      onClick={() => void handlePay(invoice)}
                      data-testid={`invoice-pay-${invoice.id}`}
                      className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isPaying ? 'Memproses…' : 'Bayar'}
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default InvoiceList
