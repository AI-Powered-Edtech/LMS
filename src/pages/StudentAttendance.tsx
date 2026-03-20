import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { EmptyState } from '@/src/components/ui';

const STATUS_CONFIG = {
  hadir: { label: 'Hadir', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', icon: CheckCircle },
  sakit: { label: 'Sakit', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', icon: AlertCircle },
  izin:  { label: 'Izin',  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100',   icon: Clock },
  alpha: { label: 'Alpha', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100',    icon: XCircle },
};

export function StudentAttendance() {
  const { user, tenantId, profile } = useAuth();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['student-attendance', user?.id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, scan_date, present_count, absent_count, sick_count, permit_count, details, class_id, classes(name)')
        .eq('tenant_id', tenantId!)
        .order('scan_date', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId && !!user,
  });

  // Find this student's status in each record
  const myName = profile ? `${profile.first_name} ${profile.last_name}`.toLowerCase() : '';

  const myRecords = (records as any[]).map(r => {
    const details: { name: string; status: string }[] = r.details ?? [];
    const entry = details.find(d => d.name?.toLowerCase().includes(myName.split(' ')[0]));
    return {
      id: r.id,
      date: r.scan_date,
      className: r.classes?.name ?? 'Kelas',
      status: entry?.status ?? 'hadir', // default to hadir if in the records
      present: r.present_count,
      total: r.present_count + r.absent_count + r.sick_count + r.permit_count,
    };
  });

  const totalHadir = myRecords.filter(r => r.status === 'hadir').length;
  const totalAlpha = myRecords.filter(r => r.status === 'alpha').length;
  const totalSakit = myRecords.filter(r => r.status === 'sakit').length;
  const pct = myRecords.length > 0 ? Math.round((totalHadir / myRecords.length) * 100) : 0;

  return (
    <div className="flex-1 bg-slate-50 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Rekap Kehadiran
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Riwayat kehadiran kamu berdasarkan data scan guru.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Kehadiran', value: `${pct}%`, sub: `${totalHadir} pertemuan`, color: 'bg-green-600 text-white' },
            { label: 'Hadir', value: totalHadir, sub: 'pertemuan', color: 'bg-white border border-slate-200' },
            { label: 'Sakit', value: totalSakit, sub: 'pertemuan', color: 'bg-white border border-slate-200' },
            { label: 'Alpha', value: totalAlpha, sub: 'pertemuan', color: 'bg-white border border-slate-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 shadow-sm ${s.color}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${s.color.includes('green-600') ? 'text-green-100' : 'text-slate-500'}`}>{s.label}</p>
              <p className={`text-3xl font-black ${s.color.includes('green-600') ? 'text-white' : 'text-slate-800'}`}>{s.value}</p>
              <p className={`text-xs mt-0.5 ${s.color.includes('green-600') ? 'text-green-100' : 'text-slate-400'}`}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Records list */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800">Riwayat Pertemuan</h2>
          </div>
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : myRecords.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Calendar className="w-10 h-10" />}
                title="Belum ada data kehadiran"
                description="Data akan muncul setelah guru melakukan scan absensi."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myRecords.map(r => {
                const cfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.hadir;
                const Icon = cfg.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{r.className}</p>
                      <p className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
