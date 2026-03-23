import {
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Search,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import React, { useState } from 'react'

import { VirtualTable } from '@/src/components/ui/VirtualTable'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { cn } from '@/src/utils/cn'

const columns = [
  {
    header: 'ID Pendaftaran',
    key: 'id',
    className: 'px-6 py-4 font-mono text-slate-600',
    render: (row: Record<string, any>) => row.id,
  },
  {
    header: 'Nama Calon Siswa',
    key: 'name',
    className: 'px-6 py-4',
    render: (row: Record<string, any>) => (
      <div>
        <p className="font-bold text-slate-900">{row.name}</p>
        <p className="text-xs text-slate-500">{row.email}</p>
      </div>
    ),
  },
  {
    header: 'Asal Sekolah',
    key: 'prevSchool',
    className: 'px-6 py-4 text-slate-600',
    render: (row: Record<string, any>) => row.prevSchool,
  },
  {
    header: 'Nilai Rata-rata',
    key: 'avgScore',
    className: 'px-6 py-4',
    render: (row: Record<string, any>) => (
      <span
        className={cn(
          'font-bold',
          row.avgScore >= 90
            ? 'text-green-600'
            : row.avgScore >= 80
              ? 'text-blue-600'
              : 'text-slate-600'
        )}
      >
        {row.avgScore}
      </span>
    ),
  },
  {
    header: 'Tanggal Daftar',
    key: 'date',
    className: 'px-6 py-4 text-slate-600',
    render: (row: Record<string, any>) => row.date,
  },
  {
    header: 'Status',
    key: 'status',
    className: 'px-6 py-4',
    render: (row: Record<string, any>) => (
      <span
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-bold border flex items-center w-fit gap-1',
          row.status === 'accepted'
            ? 'bg-green-50 text-green-700 border-green-200'
            : row.status === 'pending'
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : 'bg-red-50 text-red-700 border-red-200'
        )}
      >
        {row.status === 'accepted' ? (
          <CheckCircle className="w-3 h-3" />
        ) : row.status === 'pending' ? (
          <Clock className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        )}
        {row.status === 'accepted' ? 'Diterima' : row.status === 'pending' ? 'Menunggu' : 'Ditolak'}
      </span>
    ),
  },
  {
    header: 'Aksi',
    key: 'action',
    className: 'px-6 py-4',
    render: () => (
      <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
        <ChevronRight className="w-5 h-5" />
      </button>
    ),
  },
]

const applicants = [
  {
    id: 'REG-2026-001',
    name: 'Siti Aminah',
    prevSchool: 'SMP Negeri 1 Jakarta',
    avgScore: 92.5,
    status: 'pending',
    date: '2026-05-10',
    email: 'siti.aminah@email.com',
  },
  {
    id: 'REG-2026-002',
    name: 'Rudi Hartono',
    prevSchool: 'SMP Swasta Harapan',
    avgScore: 88.0,
    status: 'accepted',
    date: '2026-05-11',
    email: 'rudi.h@email.com',
  },
  {
    id: 'REG-2026-003',
    name: 'Dewi Lestari',
    prevSchool: 'SMP Negeri 5 Bandung',
    avgScore: 75.5,
    status: 'rejected',
    date: '2026-05-12',
    email: 'dewi.l@email.com',
  },
  {
    id: 'REG-2026-004',
    name: 'Ahmad Fauzi',
    prevSchool: 'MTS Al-Ikhlas',
    avgScore: 90.0,
    status: 'pending',
    date: '2026-05-12',
    email: 'ahmad.f@email.com',
  },
  {
    id: 'REG-2026-005',
    name: 'Bunga Citra',
    prevSchool: 'SMP International',
    avgScore: 95.0,
    status: 'accepted',
    date: '2026-05-13',
    email: 'bunga.c@email.com',
  },
]

export function PPDBDashboard() {
  usePageTitle('Dasbor PPDB')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>(
    'all'
  )
  const [searchQuery, setSearchQuery] = useState('')

  const filteredApplicants = applicants.filter((app) => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-8 h-8 text-blue-600" />
            PPDB Online
          </h1>
          <p className="text-slate-500 mt-1">
            Penerimaan Peserta Didik Baru Tahun Ajaran 2026/2027
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Ekspor Data
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700">
            <FileText className="w-4 h-4" /> Buka Pendaftaran
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Pendaftar</p>
            <h3 className="text-2xl font-bold text-slate-900">1,245</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Menunggu Verifikasi</p>
            <h3 className="text-2xl font-bold text-slate-900">45</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Diterima</p>
            <h3 className="text-2xl font-bold text-slate-900">850</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ditolak</p>
            <h3 className="text-2xl font-bold text-slate-900">350</h3>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['all', 'pending', 'accepted', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as typeof filterStatus)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors whitespace-nowrap',
                  filterStatus === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                )}
              >
                {status === 'all'
                  ? 'Semua'
                  : status === 'pending'
                    ? 'Menunggu'
                    : status === 'accepted'
                      ? 'Diterima'
                      : 'Ditolak'}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau ID..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <VirtualTable
          data={filteredApplicants}
          columns={columns}
          getRowKey={(r) => r.id}
          rowHeight={72}
          maxHeight={600}
        />
      </div>
    </div>
  )
}
