import React, { useState } from 'react';
import { 
  Wallet, TrendingUp, DollarSign, Users, Calendar, 
  Download, Search, Filter, CheckCircle2, XCircle, Clock,
  CreditCard, Banknote, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const transactions = [
  { id: 'TRX-001', student: 'Andi Wijaya', type: 'SPP Oktober', amount: 500000, date: '2026-10-05', status: 'success', method: 'Bank Transfer' },
  { id: 'TRX-002', student: 'Budi Santoso', type: 'SPP Oktober', amount: 500000, date: '2026-10-06', status: 'pending', method: 'E-Wallet' },
  { id: 'TRX-003', student: 'Citra Lestari', type: 'Uang Gedung', amount: 2500000, date: '2026-10-02', status: 'success', method: 'Credit Card' },
  { id: 'TRX-004', student: 'Dewi Sartika', type: 'SPP Oktober', amount: 500000, date: '2026-10-01', status: 'failed', method: 'Bank Transfer' },
  { id: 'TRX-005', student: 'Eko Prasetyo', type: 'Ekskul Basket', amount: 150000, date: '2026-10-07', status: 'success', method: 'QRIS' },
];

const salaryData = [
  { id: 'T-001', name: 'Pak Budi', role: 'Guru Matematika', salary: 4500000, status: 'paid', date: '2026-10-01' },
  { id: 'T-002', name: 'Bu Rina', role: 'Guru Bahasa Inggris', salary: 4200000, status: 'paid', date: '2026-10-01' },
  { id: 'T-003', name: 'Pak Andi', role: 'Guru Olahraga', salary: 4000000, status: 'pending', date: '2026-10-01' },
];

const revenueData = [
  { name: 'Jan', spp: 45, building: 20 },
  { name: 'Feb', spp: 48, building: 15 },
  { name: 'Mar', spp: 50, building: 10 },
  { name: 'Apr', spp: 47, building: 12 },
  { name: 'May', spp: 49, building: 18 },
  { name: 'Jun', spp: 52, building: 25 },
];

export function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'spp' | 'salary'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-8 h-8 text-blue-600" />
            Keuangan & SPP
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola pembayaran SPP, gaji guru, dan laporan keuangan sekolah.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export Laporan
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700">
            <PlusIcon className="w-4 h-4" /> Catat Transaksi
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200">
        {[
          { id: 'overview', label: 'Ringkasan', icon: TrendingUp },
          { id: 'spp', label: 'Pembayaran SPP', icon: CreditCard },
          { id: 'salary', label: 'Gaji Guru', icon: Banknote },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative whitespace-nowrap",
              activeTab === tab.id ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">+12.5%</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Total Pemasukan (Bulan Ini)</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">Rp 145.250.000</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">Stabil</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Total Pengeluaran (Bulan Ini)</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">Rp 82.100.000</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Aman</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Saldo Kas Sekolah</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">Rp 320.500.000</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Tren Pemasukan</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="spp" name="SPP" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="building" name="Uang Gedung" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Transaksi Terbaru</h3>
              <div className="space-y-4">
                {transactions.slice(0, 4).map((trx) => (
                  <div key={trx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        trx.status === 'success' ? "bg-green-100 text-green-600" :
                        trx.status === 'pending' ? "bg-yellow-100 text-yellow-600" : "bg-red-100 text-red-600"
                      )}>
                        {trx.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                         trx.status === 'pending' ? <Clock className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{trx.student}</p>
                        <p className="text-xs text-slate-500">{trx.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(trx.amount)}</p>
                      <p className="text-xs text-slate-500">{trx.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                Lihat Semua Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'spp' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">Daftar Pembayaran SPP</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari siswa..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">ID Transaksi</th>
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">Jenis Pembayaran</th>
                  <th className="px-6 py-4">Metode</th>
                  <th className="px-6 py-4">Jumlah</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-slate-600">{trx.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{trx.student}</td>
                    <td className="px-6 py-4 text-slate-600">{trx.type}</td>
                    <td className="px-6 py-4 text-slate-600">{trx.method}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(trx.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold border",
                        trx.status === 'success' ? "bg-green-50 text-green-700 border-green-200" :
                        trx.status === 'pending' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {trx.status === 'success' ? 'Lunas' : trx.status === 'pending' ? 'Menunggu' : 'Gagal'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Penggajian Guru & Staf</h2>
            <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700">
              Proses Penggajian
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">ID Guru</th>
                  <th className="px-6 py-4">Nama</th>
                  <th className="px-6 py-4">Jabatan</th>
                  <th className="px-6 py-4">Gaji Pokok</th>
                  <th className="px-6 py-4">Status (Okt)</th>
                  <th className="px-6 py-4">Tanggal Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaryData.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-slate-600">{staff.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{staff.name}</td>
                    <td className="px-6 py-4 text-slate-600">{staff.role}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(staff.salary)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold border",
                        staff.status === 'paid' ? "bg-green-50 text-green-700 border-green-200" :
                        "bg-yellow-50 text-yellow-700 border-yellow-200"
                      )}>
                        {staff.status === 'paid' ? 'Dibayarkan' : 'Belum Dibayar'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{staff.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
