import { useState, useCallback } from 'react';

export type ModuleId = 'gradebook' | 'quiz' | 'assignments' | 'calendar' | 'announcements' | 'directory' | 'ai-creator' | 'analytics' | 'attendance' | 'documents' | 'speed-grader' | 'group-assignment' | 'forum';

export interface ModuleConfig {
  id: ModuleId;
  name: string;
  description: string;
  isEnabled: boolean;
  targetRoles: ('teacher' | 'student')[];
}

const defaultModules: ModuleConfig[] = [
  {
    id: 'gradebook',
    name: 'Buku Nilai',
    description: 'Sistem pencatatan dan rekap nilai siswa untuk guru.',
    isEnabled: true,
    targetRoles: ['teacher']
  },
  {
    id: 'quiz',
    name: 'Kuis Online',
    description: 'Platform ujian dan kuis interaktif untuk siswa.',
    isEnabled: true,
    targetRoles: ['student']
  },
  {
    id: 'assignments',
    name: 'Pusat Tugas',
    description: 'Manajemen pengumpulan dan penilaian tugas.',
    isEnabled: true,
    targetRoles: ['teacher', 'student']
  },
  {
    id: 'calendar',
    name: 'Jadwal & Kalender',
    description: 'Jadwal pelajaran dan agenda akademik sekolah.',
    isEnabled: true,
    targetRoles: ['teacher', 'student']
  },
  {
    id: 'announcements',
    name: 'Pengumuman',
    description: 'Papan informasi dan berita sekolah.',
    isEnabled: true,
    targetRoles: ['teacher', 'student']
  },
  {
    id: 'directory',
    name: 'Direktori Menu',
    description: 'Akses cepat ke semua fitur dalam satu halaman.',
    isEnabled: true,
    targetRoles: ['teacher', 'student']
  },
  {
    id: 'ai-creator',
    name: 'AI Creator',
    description: 'Buat kuis & materi otomatis dari dokumen/video.',
    isEnabled: true,
    targetRoles: ['teacher']
  },
  {
    id: 'analytics',
    name: 'Dasbor Analitik',
    description: 'Visualisasi data & prediksi risiko siswa.',
    isEnabled: true,
    targetRoles: ['teacher']
  },
  {
    id: 'attendance',
    name: 'Scan Absensi',
    description: 'Scan otomatis buku absensi siswa menggunakan AI.',
    isEnabled: true,
    targetRoles: ['teacher']
  },
  {
    id: 'documents',
    name: 'Surat & Dokumen',
    description: 'Smart editor & approval surat berjenjang.',
    isEnabled: true,
    targetRoles: ['teacher']
  },
  {
    id: 'speed-grader',
    name: 'SpeedGrader',
    description: 'Penilaian esai dengan matriks rubrik transparan.',
    isEnabled: true,
    targetRoles: ['teacher']
  },
  {
    id: 'group-assignment',
    name: 'Tugas Kelompok',
    description: 'Kolaborasi tugas kelompok dengan sinkronisasi Google Classroom.',
    isEnabled: true,
    targetRoles: ['teacher', 'student']
  },
  {
    id: 'forum',
    name: 'Forum Diskusi',
    description: 'Ruang tanya jawab dan kolaborasi sosial.',
    isEnabled: true,
    targetRoles: ['teacher', 'student']
  }
];

export function useModuleConfig() {
  const [modules] = useState<ModuleConfig[]>(defaultModules);

  const toggleModule = useCallback((id: ModuleId) => {
    // Note: This updates state but changes are not persisted
    // If persistence is needed, consider using localStorage or Zustand
  }, []);

  const isModuleEnabled = useCallback((id: ModuleId): boolean => {
    return modules.find(m => m.id === id)?.isEnabled ?? true;
  }, [modules]);

  return {
    modules,
    toggleModule,
    isModuleEnabled,
  };
}
