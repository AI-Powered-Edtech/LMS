import { useState } from 'react'
import { motion } from 'motion/react'
import {
  CreditCard,
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  QrCode,
  Wallet,
  Banknote,
  Receipt,
  X,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'

// --- MOCK DATA & UTILS ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'Lunas'
    case 'pending':
      return 'Menunggu'
    case 'partial':
      return 'Sebagian'
    case 'overdue':
      return 'Jatuh Tempo'
    default:
      return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'partial':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'overdue':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

const getInvoiceTypeLabel = (type: string) => {
  switch (type) {
    case 'tuition':
      return 'SPP'
    case 'building':
      return 'Uang Gedung'
    case 'books':
      return 'Buku'
    case 'extracurricular':
      return 'Ekstrakurikuler'
    default:
      return type
  }
}

const invoices = [
  {
    id: 'INV-2026-001',
    studentName: 'Andi Wijaya',
    type: 'tuition',
    description: 'SPP Bulan Oktober 2026',
    amount: 500000,
    discount: 0,
    totalAmount: 500000,
    status: 'paid',
    dueDate: '2026-10-10',
    paymentMethod: 'Transfer Bank',
    items: [
      {
        id: 1,
        description: 'SPP Bulan Oktober 2026',
        quantity: 1,
        unitPrice: 500000,
        total: 500000,
      },
    ],
  },
  {
    id: 'INV-2026-002',
    studentName: 'Budi Santoso',
    type: 'building',
    description: 'Cicilan Uang Gedung (2/4)',
    amount: 2500000,
    discount: 0,
    totalAmount: 2500000,
    status: 'pending',
    dueDate: '2026-11-01',
    paymentMethod: null,
    items: [
      {
        id: 1,
        description: 'Cicilan Uang Gedung (2/4)',
        quantity: 1,
        unitPrice: 2500000,
        total: 2500000,
      },
    ],
  },
  {
    id: 'INV-2026-003',
    studentName: 'Citra Lestari',
    type: 'books',
    description: 'Paket Buku Semester Ganjil',
    amount: 850000,
    discount: 50000,
    totalAmount: 800000,
    status: 'overdue',
    dueDate: '2026-09-15',
    paymentMethod: null,
    items: [
      {
        id: 1,
        description: 'Paket Buku Semester Ganjil',
        quantity: 1,
        unitPrice: 850000,
        total: 850000,
      },
    ],
  },
]

const payments = [
  {
    id: 'PAY-001',
    invoiceId: 'INV-2026-001',
    transactionId: 'TRX-998877',
    amount: 500000,
    method: 'Transfer Bank',
    paidAt: '2026-10-05T10:30:00Z',
  },
]

const paymentMethods = [
  {
    id: 'bank_transfer',
    name: 'Transfer Bank',
    icon: Banknote,
    description: 'BCA, Mandiri, BNI, BRI',
  },
  { id: 'e_wallet', name: 'E-Wallet', icon: Wallet, description: 'GoPay, OVO, DANA, LinkAja' },
  { id: 'qris', name: 'QRIS', icon: QrCode, description: 'Scan QR code' },
]

// --- COMPONENTS ---
export function BillingDashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<(typeof invoices)[0] | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices')

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || inv.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: invoices.reduce((acc, inv) => acc + inv.totalAmount, 0),
    paid: invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((acc, inv) => acc + inv.totalAmount, 0),
    pending: invoices
      .filter((inv) => inv.status === 'pending')
      .reduce((acc, inv) => acc + inv.totalAmount, 0),
    overdue: invoices
      .filter((inv) => inv.status === 'overdue')
      .reduce((acc, inv) => acc + inv.totalAmount, 0),
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Keuangan & Pembayaran</h1>
          <p className="text-slate-500 mt-1">Kelola tagihan dan pembayaran siswa</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            <Plus className="w-4 h-4 mr-2" />
            Buat Tagihan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(stats.total)}</p>
              <p className="text-xs text-slate-500 font-medium">Total Tagihan</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-green-600">{formatCurrency(stats.paid)}</p>
              <p className="text-xs text-slate-500 font-medium">Sudah Dibayar</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-yellow-600">{formatCurrency(stats.pending)}</p>
              <p className="text-xs text-slate-500 font-medium">Menunggu</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
              <p className="text-xs text-slate-500 font-medium">Jatuh Tempo</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau nomor tagihan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full md:w-48 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="partial">Sebagian</option>
          <option value="paid">Lunas</option>
          <option value="overdue">Jatuh Tempo</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('invoices')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-all',
              activeTab === 'invoices'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Tagihan
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-all',
              activeTab === 'payments'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Riwayat Pembayaran
          </button>
        </div>

        {activeTab === 'invoices' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredInvoices.map((invoice) => (
                <motion.div
                  key={invoice.id}
                  whileHover={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}
                  className="p-4 cursor-pointer transition-colors"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                          invoice.status === 'paid' && 'bg-green-50 text-green-600',
                          invoice.status === 'pending' && 'bg-yellow-50 text-yellow-600',
                          invoice.status === 'partial' && 'bg-blue-50 text-blue-600',
                          invoice.status === 'overdue' && 'bg-red-50 text-red-600'
                        )}
                      >
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-slate-900">{invoice.id}</h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                            {getInvoiceTypeLabel(invoice.type)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">{invoice.studentName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Jatuh tempo: {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-900 mb-1">
                        {formatCurrency(invoice.totalAmount)}
                      </p>
                      <span
                        className={cn(
                          'px-2.5 py-1 text-xs font-bold rounded-full border',
                          getStatusColor(invoice.status)
                        )}
                      >
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {filteredInvoices.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Tidak ada tagihan yang ditemukan.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {payments.map((payment) => {
                const invoice = invoices.find((inv) => inv.id === payment.invoiceId)
                return (
                  <div key={payment.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{payment.transactionId}</h4>
                          <p className="text-sm font-medium text-slate-700 mt-0.5">
                            {invoice?.description}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {payment.paidAt && formatDate(payment.paidAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-green-600 mb-1">
                          {formatCurrency(payment.amount)}
                        </p>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                          {payment.method}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Dialog Overlay */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Detail Tagihan</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <InvoiceDetail
                invoice={selectedInvoice}
                onPay={() => {
                  setSelectedInvoice(null)
                  setShowPaymentDialog(true)
                }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Dialog Overlay */}
      {showPaymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Pembayaran</h2>
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <PaymentForm onClose={() => setShowPaymentDialog(false)} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function InvoiceDetail({ invoice, onPay }: { invoice: (typeof invoices)[0]; onPay: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{invoice.id}</h3>
          <p className="text-slate-500 text-sm mt-1">Jatuh tempo: {formatDate(invoice.dueDate)}</p>
        </div>
        <span
          className={cn(
            'px-3 py-1 text-sm font-bold rounded-full border',
            getStatusColor(invoice.status)
          )}
        >
          {getStatusLabel(invoice.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Siswa</p>
          <p className="font-medium text-slate-900">{invoice.studentName}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jenis</p>
          <p className="font-medium text-slate-900">{getInvoiceTypeLabel(invoice.type)}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Deskripsi
          </p>
          <p className="font-medium text-slate-900">{invoice.description}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Metode Pembayaran
          </p>
          <p className="font-medium text-slate-900">{invoice.paymentMethod || '-'}</p>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-slate-900 mb-4">Rincian</h4>
        <div className="space-y-3">
          {invoice.items.map((item) => (
            <div key={item.id} className="flex justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">{item.description}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <p className="font-bold text-slate-900">{formatCurrency(item.total)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-xl">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium">Subtotal</span>
            <span className="font-medium text-slate-900">{formatCurrency(invoice.amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium">Diskon</span>
            <span className="font-medium text-red-600">-{formatCurrency(invoice.discount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 border-t border-slate-200 mt-2">
            <span className="text-slate-900">Total</span>
            <span className="text-blue-600">{formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>
      </div>

      {invoice.status !== 'paid' && (
        <button
          onClick={onPay}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-200"
        >
          <CreditCard className="w-5 h-5" />
          Bayar Sekarang
        </button>
      )}
    </div>
  )
}

function PaymentForm({ onClose }: { onClose: () => void }) {
  const [selectedMethod, setSelectedMethod] = useState('bank_transfer')

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-bold text-slate-900 mb-4">Pilih Metode Pembayaran</h4>
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon
            const isSelected = selectedMethod === method.id
            return (
              <label
                key={method.id}
                className={cn(
                  'flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-200 bg-white'
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={isSelected}
                  onChange={() => setSelectedMethod(method.id)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'bg-blue-100' : 'bg-slate-100'
                    )}
                  >
                    <Icon
                      className={cn('w-5 h-5', isSelected ? 'text-blue-600' : 'text-slate-500')}
                    />
                  </div>
                  <div className="flex-1">
                    <div
                      className={cn('font-bold', isSelected ? 'text-blue-900' : 'text-slate-700')}
                    >
                      {method.name}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{method.description}</p>
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
        >
          Batal
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Konfirmasi
        </button>
      </div>
    </div>
  )
}
