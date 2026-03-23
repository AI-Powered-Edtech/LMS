export type Annotation = {
  id: string
  x: number
  y: number
  text: string
  isOpen: boolean
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type ActiveTool = 'pointer' | 'comment'

export interface RubricLevel {
  points: number
  desc: string
}

export interface RubricItem {
  id: string
  criterion: string
  description: string
  maxPoints: number
  levels: RubricLevel[]
}

export interface StudentGradeEntry {
  score: number | null
  status: string
}

export interface SpeedGraderStudent {
  id: string
  name: string
  gradeEntry: StudentGradeEntry
}

export const DEFAULT_RUBRIC: RubricItem[] = [
  {
    id: 'r1',
    criterion: 'Tata Bahasa & Ejaan',
    description: 'Penggunaan tanda baca, struktur kalimat, dan kosakata.',
    maxPoints: 40,
    levels: [
      { points: 10, desc: 'Banyak kesalahan, sulit dipahami.' },
      { points: 20, desc: 'Beberapa kesalahan, makna masih bisa ditangkap.' },
      { points: 30, desc: 'Sedikit kesalahan, struktur kalimat baik.' },
      { points: 40, desc: 'Sempurna, kosakata variatif dan tepat.' },
    ],
  },
  {
    id: 'r2',
    criterion: 'Kualitas Argumen',
    description: 'Kedalaman analisis dan dukungan bukti.',
    maxPoints: 60,
    levels: [
      { points: 20, desc: 'Argumen lemah, tidak ada bukti pendukung.' },
      { points: 40, desc: 'Argumen cukup baik, bukti kurang relevan.' },
      { points: 60, desc: 'Argumen sangat kuat, didukung bukti valid.' },
    ],
  },
]

export const QUICK_COMMENTS = [
  'Bagus sekali, argumen sangat kuat!',
  'Perlu referensi lebih lanjut untuk mendukung klaim Anda.',
  'Periksa kembali tata bahasa dan tanda baca.',
  'Struktur kalimat sudah baik, pertahankan!',
  'Analisis kurang mendalam, coba tambahkan contoh konkret.',
] as const
