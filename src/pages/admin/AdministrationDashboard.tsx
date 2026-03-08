import React, { useState } from 'react';
import { 
  Building2, RefreshCw, CheckCircle, AlertTriangle, 
  Database, Server, Users, GraduationCap, FileText,
  Settings, Activity, ToggleLeft, ToggleRight, LayoutGrid
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useModuleConfig, ModuleId } from '@/src/contexts/ModuleConfigContext';

const syncStatus = [
  { id: 1, type: 'Data Siswa', lastSync: '2 jam yang lalu', status: 'success', records: 1245 },
  { id: 2, type: 'Data Guru & Staf', lastSync: '2 jam yang lalu', status: 'success', records: 85 },
  { id: 3, type: 'Data Kelas & Jadwal', lastSync: '1 hari yang lalu', status: 'warning', records: 42 },
  { id: 4, type: 'Nilai & Rapor', lastSync: '5 menit yang lalu', status: 'success', records: 15600 },
  { id: 5, type: 'Keuangan & SPP', lastSync: '10 menit yang lalu', status: 'success', records: 340 },
];

export function AdministrationDashboard() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { modules, toggleModule } = useModuleConfig();

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert('Sinkronisasi data berhasil!');
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Administrasi Terpusat
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola sinkronisasi data dengan PDDIKTI/Dapodik dan pengaturan sistem sekolah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Sistem Online</span>
            <span className="sm:hidden">Online</span>
          </div>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Data'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module Configuration Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-3">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Konfigurasi Modul & Fitur</h3>
              <p className="text-sm text-slate-500">Aktifkan atau nonaktifkan fitur sesuai kebutuhan sekolah.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <div key={module.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1 pr-4">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{module.name}</h4>
                  <p className="text-xs text-slate-500 mb-2">{module.description}</p>
                  <div className="flex gap-1 flex-wrap">
                    {module.targetRoles.map(role => (
                      <span key={role} className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                        {role === 'teacher' ? 'Guru' : 'Siswa'}
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => toggleModule(module.id)}
                  className={cn(
                    "shrink-0 transition-colors",
                    module.isEnabled ? "text-blue-600" : "text-slate-400"
                  )}
                >
                  {module.isEnabled ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PDDIKTI Status Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Status Integrasi PDDIKTI</h3>
                <p className="text-sm text-slate-500">Terhubung ke server pusat Kemendikbud</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200 uppercase tracking-wider">
              Terhubung
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Token API</p>
              <p className="font-mono text-slate-900 truncate">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Terakhir Sinkronisasi</p>
              <p className="font-medium text-slate-900">04 Mar 2026, 14:30 WIB</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Versi Aplikasi</p>
              <p className="font-medium text-slate-900">v2.4.0 (Build 20260301)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Server Status</p>
              <p className="font-medium text-green-600 flex items-center gap-2">
                <Server className="w-4 h-4" /> Operational (99.9% Uptime)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Aksi Cepat</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm">Konfigurasi Sekolah</span>
            </button>
            <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm">Manajemen Akun Staf</span>
            </button>
            <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm">Laporan Audit Log</span>
            </button>
            <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-3">
              <Database className="w-5 h-5 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm">Backup Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Riwayat Sinkronisasi Data</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Jenis Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Terakhir Sinkronisasi</th>
                <th className="px-6 py-4">Jumlah Record</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {syncStatus.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                    {item.type === 'Data Siswa' ? <GraduationCap className="w-4 h-4 text-blue-500" /> :
                     item.type === 'Data Guru & Staf' ? <Users className="w-4 h-4 text-purple-500" /> :
                     <Database className="w-4 h-4 text-slate-500" />}
                    {item.type}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold border flex items-center w-fit gap-1",
                      item.status === 'success' ? "bg-green-50 text-green-700 border-green-200" :
                      "bg-yellow-50 text-yellow-700 border-yellow-200"
                    )}>
                      {item.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {item.status === 'success' ? 'Berhasil' : 'Peringatan'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.lastSync}</td>
                  <td className="px-6 py-4 font-mono text-slate-600">{item.records.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 font-bold text-xs">Sync Now</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
