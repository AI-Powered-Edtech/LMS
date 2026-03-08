import { useState } from 'react';
import { motion } from 'motion/react';
import { ScanFace, Upload, CheckCircle2, AlertCircle, Users, Camera } from 'lucide-react';

export function ScanAttendance() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleScan = () => {
    setIsScanning(true);
    // Mock scanning process
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        date: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        class: 'XII IPA 1',
        present: 28,
        absent: 2,
        sick: 1,
        permit: 1,
        details: [
          { name: 'Andi Wijaya', status: 'Hadir' },
          { name: 'Budi Santoso', status: 'Sakit' },
          { name: 'Citra Lestari', status: 'Hadir' },
          { name: 'Dewi Sartika', status: 'Izin' },
          { name: 'Eko Prasetyo', status: 'Alpa' },
        ]
      });
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Scan Buku Absensi</h1>
        <p className="text-slate-500 mt-2">Otomatisasi pencatatan kehadiran dengan memindai buku absensi kelas menggunakan AI.</p>
      </div>

      {!scanResult ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <Camera className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Pindai Buku Absensi</h2>
          <p className="text-slate-500 max-w-md mb-8">
            Arahkan kamera ke halaman buku absensi atau unggah foto buku absensi untuk mendigitalkan data kehadiran secara otomatis.
          </p>
          
          <div className="flex gap-4">
            <button 
              onClick={handleScan}
              disabled={isScanning}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memindai...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Buka Kamera
                </>
              )}
            </button>
            <button className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
              <Upload className="w-5 h-5" />
              Unggah Foto
            </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-900">Pemindaian Berhasil!</h3>
              <p className="text-green-800 mt-1">Data absensi kelas {scanResult.class} untuk tanggal {scanResult.date} telah berhasil didigitalkan.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="text-3xl font-black text-blue-600 mb-1">{scanResult.present}</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Hadir</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="text-3xl font-black text-yellow-600 mb-1">{scanResult.sick}</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sakit</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="text-3xl font-black text-purple-600 mb-1">{scanResult.permit}</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Izin</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="text-3xl font-black text-red-600 mb-1">{scanResult.absent}</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Alpa</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                Detail Kehadiran
              </h3>
              <button 
                onClick={() => setScanResult(null)}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Scan Ulang
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {scanResult.details.map((student: any, idx: number) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{student.name}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    student.status === 'Hadir' ? 'bg-blue-50 text-blue-700' :
                    student.status === 'Sakit' ? 'bg-yellow-50 text-yellow-700' :
                    student.status === 'Izin' ? 'bg-purple-50 text-purple-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {student.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm">
                Simpan ke Sistem
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
