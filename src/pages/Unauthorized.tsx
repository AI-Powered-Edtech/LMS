import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 text-red-500 mb-6">
            <ShieldX size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Akses Ditolak</h1>
          <p className="text-slate-400 text-lg">
            Anda tidak memiliki izin untuk mengakses halaman ini.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
            <span>Kembali</span>
          </button>

          <button
            onClick={() => navigate('/app')}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Home size={20} />
            <span>Ke Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
