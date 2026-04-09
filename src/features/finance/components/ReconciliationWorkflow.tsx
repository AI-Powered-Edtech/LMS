// EduSync LMS — Reconciliation Workflow UI
// Allows admin to match payments to invoices and review audit trail

import { CheckCircle, Clock, FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { financeReconciliationService, type PaymentAuditEntry } from '../api/reconciliation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReconciliationWorkflowProps {
  invoiceId: string
  invoiceStatus: string
  amountDue: number
  amountPaid: number
  onPaymentRecorded?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReconciliationWorkflow({
  invoiceId,
  invoiceStatus,
  amountDue,
  amountPaid,
  onPaymentRecorded,
  className,
}: ReconciliationWorkflowProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [auditTrail, setAuditTrail] = useState<PaymentAuditEntry[]>([])
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const addToast = useToast((s) => s.addToast)

  const remaining = Math.max(0, amountDue - amountPaid)
  const isPaid = invoiceStatus === 'paid'

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      addToast({ type: 'error', message: 'Jumlah pembayaran harus lebih dari 0.' })
      return
    }

    if (amount > remaining) {
      addToast({ type: 'error', message: 'Jumlah pembayaran melebihi sisa tagihan.' })
      return
    }

    setIsProcessing(true)
    try {
      const result = await financeReconciliationService.recordPayment(
        invoiceId,
        amount,
        'transfer',
        paymentNotes || undefined
      )

      if (result.success) {
        addToast({ type: 'success', message: result.message })
        setPaymentAmount('')
        setPaymentNotes('')
        onPaymentRecorded?.()
        void loadAuditTrail()
      } else {
        addToast({ type: 'error', message: result.message })
      }
    } catch {
      addToast({ type: 'error', message: 'Gagal mencatat pembayaran.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const loadAuditTrail = async () => {
    try {
      const entries = await financeReconciliationService.getPaymentAudit(invoiceId)
      setAuditTrail(entries)
    } catch {
      // Silently fail — audit trail is non-critical
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isPaid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Clock className="w-5 h-5 text-amber-500" />
            )}
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 capitalize">
              {invoiceStatus === 'paid'
                ? 'Lunas'
                : invoiceStatus === 'overdue'
                  ? 'Terlambat'
                  : invoiceStatus}
            </span>
          </div>
          <button
            onClick={() => {
              setShowAuditTrail(!showAuditTrail)
              if (!showAuditTrail) void loadAuditTrail()
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            Audit Trail
          </button>
        </div>

        {/* Payment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Terbayar</span>
            <span className="font-medium text-slate-800 dark:text-slate-100">
              Rp {amountPaid.toLocaleString('id-ID')} / Rp {amountDue.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isPaid ? 'bg-green-500' : 'bg-amber-500'
              )}
              style={{ width: `${amountDue > 0 ? (amountPaid / amountDue) * 100 : 0}%` }}
            />
          </div>
          {!isPaid && remaining > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sisa: Rp {remaining.toLocaleString('id-ID')}
            </p>
          )}
        </div>
      </Card>

      {/* Payment Form (if not paid) */}
      {!isPaid && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
            Catat Pembayaran
          </h4>
          <div className="space-y-3">
            <div>
              <label
                className="block text-xs text-slate-500 dark:text-slate-400 mb-1"
                htmlFor="payment-amount"
              >
                Jumlah Pembayaran
              </label>
              <input
                id="payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                max={remaining}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label
                className="block text-xs text-slate-500 dark:text-slate-400 mb-1"
                htmlFor="payment-notes"
              >
                Catatan (opsional)
              </label>
              <input
                id="payment-notes"
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Transfer bank, tunai, dll."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRecordPayment}
              disabled={isProcessing || !paymentAmount}
              className="w-full"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isProcessing ? 'Memproses...' : 'Catat Pembayaran'}
            </Button>
          </div>
        </Card>
      )}

      {/* Audit Trail */}
      {showAuditTrail && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
            Riwayat Audit
          </h4>
          {auditTrail.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
              Belum ada riwayat audit.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {auditTrail.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/50"
                >
                  {entry.action.includes('payment') ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 dark:text-slate-300 capitalize">
                      {entry.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-slate-400 dark:text-slate-500">
                      {new Date(entry.performedAt).toLocaleString('id-ID')}
                      {entry.notes && ` — ${entry.notes}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
