import { usePageTitle } from '@/src/hooks/usePageTitle'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useModerationReports,
  useResolveReport,
} from '@/src/features/moderation/queries/moderationQueries'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Clock,
  User,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/src/utils/cn'
import { ModerationSkeleton } from '@/src/features/moderation/components/ModerationSkeleton'

export function ModerationDashboard() {
  usePageTitle('Moderation Dashboard')
  const navigate = useNavigate()
  const { data: reports = [], isLoading } = useModerationReports()
  const resolveReport = useResolveReport()
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredReports = reports.filter((report) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending'
          ? report.status === 'pending'
          : report.status !== 'pending'

    const matchesSearch =
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.contentSnippet?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      ai_generated: 'Konten AI',
      inappropriate: 'Tidak Pantas',
      spam: 'Spam',
      harassment: 'Pelecehan',
      other: 'Lainnya',
    }
    return labels[reason] || reason
  }

  if (isLoading) {
    return <ModerationSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Moderasi Konten
          </h1>
          <p className="text-slate-500 mt-1">
            Tinjau laporan pengguna dan ambil tindakan terhadap konten yang melanggar.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setFilterStatus('pending')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-colors',
              filterStatus === 'pending'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Perlu Tinjauan
          </button>
          <button
            onClick={() => setFilterStatus('resolved')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-colors',
              filterStatus === 'resolved'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Selesai
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-colors',
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Semua
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari laporan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence>
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6">
                  {/* Report Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider',
                            getStatusColor(report.status)
                          )}
                        >
                          {report.status === 'pending'
                            ? 'Menunggu'
                            : report.status === 'approved'
                              ? 'Disetujui'
                              : 'Ditolak'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(report.timestamp).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-lg mb-1 flex items-center gap-2">
                        {getReasonLabel(report.reason)}
                        <span className="text-slate-400 font-normal text-sm">
                          oleh {report.reporterName}
                        </span>
                      </h3>
                      <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                        "{report.description}"
                      </p>
                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold text-sm">
                        <MessageSquare className="w-4 h-4" />
                        Konten yang Dilaporkan ({report.contentType})
                      </div>
                      <p className="text-slate-800 text-sm line-clamp-3 mb-2">
                        {report.contentSnippet || 'Konten tidak tersedia'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <User className="w-3 h-3" />
                        Penulis: {report.contentAuthor || 'Tidak diketahui'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {report.status === 'pending' && (
                    <div className="flex flex-row md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 md:w-48 shrink-0">
                      <button
                        onClick={() =>
                          resolveReport.mutate({ reportId: report.id, status: 'approved' })
                        }
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Hapus Konten
                      </button>
                      <button
                        onClick={() =>
                          resolveReport.mutate({ reportId: report.id, status: 'rejected' })
                        }
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Tolak Laporan
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
              <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Tidak ada laporan</h3>
              <p className="text-slate-500 mt-1">Semua aman terkendali!</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
