import { useState } from 'react';
import { motion } from 'motion/react';
import { ScanFace, Upload, CheckCircle2, Users, Camera, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';

export function ScanAttendance() {
  const { user, tenantId } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { data: classes = [] } = useQuery({
    queryKey: ['teacher-classes', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .eq('tenant_id', tenantId!)
        .eq('teacher_id', user!.id);
      return data ?? [];
    },
    enabled: !!tenantId && !!user,
  });

  const handleScan = () => {
    setIsScanning(true);
    setSaveStatus('idle');
    // Mock scanning process
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        date: new Date().toISOString().split('T')[0],
        class: 'XII IPA 1',
        present: 28,
        absent: 2,
        sick: 1,
        permit: 1,
        details: [
          { name: 'Andi Wijaya', status: 'hadir' },
          { name: 'Budi Santoso', status: 'sakit' },
          { name: 'Citra Lestari', status: 'hadir' },
          { name: 'Dewi Sartika', status: 'izin' },
          { name: 'Eko Prasetyo', status: 'alpha' },
        ]
      });
    }, 2000);
  };

  const handleSave = async () => {
    if (!tenantId || !user || !scanResult) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const { error } = await supabase.from('attendance_records').upsert({
        tenant_id: tenantId,
        class_id: selectedClassId || null,
        scan_date: scanResult.date,
        scanned_by: user.id,
        present_count: scanResult.present,
        absent_count: scanResult.absent,
        sick_count: scanResult.sick,
        permit_count: scanResult.permit,
        details: scanResult.details,
      }, { onConflict: 'class_id,scan_date' });

      if (error) throw error;
      setSaveStatus('success');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel: Record<string, string> = {
    hadir: 'Hadir',
    sakit: 'Sakit',
    izin: 'Izin',
    alpha: 'Alpa',
  };

  const statusStyle: Record<string, string> = {
    hadir: 'bg-blue-50 text-blue-700',
    sakit: 'bg-yellow-50 text-yellow-700',
    izin: 'bg-purple-50 text-purple-700',
    alpha: 'bg-red-50 text-red-700',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Scan Buku Absensi</h1>
        <p className="text-slate-500 mt-2">Otomatisasi pencatatan kehadiran dengan memindai buku absensi kelas menggunakan AI.</p>
      </div>

      {/* Class selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Kelas</label>
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className="w-full md:w-80 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        >
          <option value="">-- Pilih kelas (opsional) --</option>
          {(classes as { id: string; name: string }[]).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
              <p className="text-green-800 mt-1">Data absensi kelas {scanResult.class} untuk tanggal {new Date(scanResult.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} telah berhasil didigitalkan.</p>
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
                onClick={() => { setScanResult(null); setSaveStatus('idle'); }}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Scan Ulang
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {scanResult.details.map((student: any, idx: number) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{student.name}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle[student.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {statusLabel[student.status] ?? student.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
              {saveStatus === 'success' && (
                <div className="text-sm font-bold text-green-600 text-center">Data kehadiran berhasil disimpan.</div>
              )}
              {saveStatus === 'error' && (
                <div className="text-sm font-bold text-red-600 text-center">Gagal menyimpan. Coba lagi.</div>
              )}
              <button
                onClick={handleSave}
                disabled={saving || saveStatus === 'success'}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Simpan ke Sistem
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
