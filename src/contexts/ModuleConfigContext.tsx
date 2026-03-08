import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ModuleId = 'gradebook' | 'quiz' | 'assignments' | 'calendar' | 'announcements' | 'directory' | 'ai-creator' | 'analytics' | 'attendance' | 'documents' | 'speed-grader' | 'group-assignment' | 'forum';

export interface ModuleConfig {
  id: ModuleId;
  name: string;
  description: string;
  isEnabled: boolean;
  targetRoles: ('teacher' | 'student')[];
}

interface ModuleConfigContextType {
  modules: ModuleConfig[];
  toggleModule: (id: ModuleId) => void;
  isModuleEnabled: (id: ModuleId) => boolean;
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

const ModuleConfigContext = createContext<ModuleConfigContextType | undefined>(undefined);

export function ModuleConfigProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<ModuleConfig[]>(defaultModules);

  const toggleModule = (id: ModuleId) => {
    setModules(prev => prev.map(m =>
      m.id === id ? { ...m, isEnabled: !m.isEnabled } : m
    ));
  };

  const isModuleEnabled = (id: ModuleId) => {
    return modules.find(m => m.id === id)?.isEnabled ?? true;
  };

  return (
    <ModuleConfigContext.Provider value={{ modules, toggleModule, isModuleEnabled }}>
      {children}
    </ModuleConfigContext.Provider>
  );
}

export function useModuleConfig() {
  const context = useContext(ModuleConfigContext);
  if (context === undefined) {
    throw new Error('useModuleConfig must be used within a ModuleConfigProvider');
  }
  return context;
}
