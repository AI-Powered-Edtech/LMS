import { supabase } from '@/services/supabase/client'

import type { RubricInsert } from '../types'

interface AIRubricLevel {
  label: string
  points: number
  description: string
}

interface AIRubricCriterion {
  title: string
  description: string
  max_points: number
  levels: AIRubricLevel[]
}

interface AIRubricData {
  title?: string
  criteria?: AIRubricCriterion[]
}

export const aiRubricService = {
  async suggestRubric(
    assignmentTitle: string,
    description: string,
    instructions: string
  ): Promise<RubricInsert> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Tidak terautentikasi')

    const prompt = `Buat rubrik penilaian untuk tugas berikut dalam Bahasa Indonesia.

Judul Tugas: ${assignmentTitle || 'Tugas'}
Deskripsi: ${description || 'Tidak ada deskripsi'}
Instruksi: ${instructions || 'Tidak ada instruksi'}

Buat rubrik dengan 3-5 kriteria penilaian yang relevan. Setiap kriteria harus memiliki 4 level: Sangat Baik, Baik, Cukup, Perlu Perbaikan.

Kembalikan HANYA JSON (tanpa teks lain):
{
  "title": "Rubrik Penilaian ${assignmentTitle || 'Tugas'}",
  "criteria": [
    {
      "title": "Nama Kriteria",
      "description": "Deskripsi kriteria",
      "max_points": 25,
      "levels": [
        { "label": "Sangat Baik", "points": 25, "description": "Deskripsi level sangat baik" },
        { "label": "Baik", "points": 20, "description": "Deskripsi level baik" },
        { "label": "Cukup", "points": 15, "description": "Deskripsi level cukup" },
        { "label": "Perlu Perbaikan", "points": 10, "description": "Deskripsi level perlu perbaikan" }
      ]
    }
  ]
}`

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-content`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'rubric', prompt, format: 'json' }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const errorMsg = (err as { error?: string }).error || ''
      throw new Error(
        errorMsg === 'Unauthorized'
          ? 'Tidak terautentikasi. Silakan masuk kembali.'
          : 'Gagal membuat saran rubrik. Coba lagi.'
      )
    }

    const data = await response.json()

    // The generate-ai-content function returns a mock — parse content if it's a string
    let rubricData: AIRubricData = {}
    try {
      if (typeof data.content === 'string') {
        rubricData = JSON.parse(data.content) as AIRubricData
      } else if (data.criteria) {
        rubricData = data as AIRubricData
      } else {
        // Fallback: build a sensible rubric from the mock response
        rubricData = buildFallbackRubric(assignmentTitle)
      }
    } catch {
      rubricData = buildFallbackRubric(assignmentTitle)
    }

    return {
      title: rubricData.title || `Rubrik Penilaian ${assignmentTitle || 'Tugas'}`,
      description: 'Dibuat oleh AI — silakan tinjau dan sesuaikan',
      is_template: false,
      assignment_id: null,
      created_by: '',
      criteria: (rubricData.criteria || buildFallbackRubric(assignmentTitle).criteria!).map(
        (c: AIRubricCriterion, i: number) => ({
          id: `ai-crit-${i}-${Date.now()}`,
          title: c.title,
          description: c.description || '',
          max_points: c.max_points || 25,
          order: i,
          levels: (c.levels || []).map((l: AIRubricLevel, j: number) => ({
            id: `ai-level-${i}-${j}-${Date.now()}`,
            label: l.label,
            description: l.description || '',
            points: l.points,
            order: j,
          })),
        })
      ),
    }
  },
}

function buildFallbackRubric(assignmentTitle: string): AIRubricData {
  const DEFAULT_LEVELS = [
    { label: 'Sangat Baik', points: 25, description: 'Memenuhi semua kriteria dengan sangat baik' },
    { label: 'Baik', points: 20, description: 'Memenuhi sebagian besar kriteria dengan baik' },
    { label: 'Cukup', points: 15, description: 'Memenuhi beberapa kriteria dengan cukup' },
    {
      label: 'Perlu Perbaikan',
      points: 10,
      description: 'Belum memenuhi kriteria yang diharapkan',
    },
  ]
  return {
    title: `Rubrik Penilaian ${assignmentTitle || 'Tugas'}`,
    criteria: [
      {
        title: 'Isi dan Konten',
        description: 'Kelengkapan dan kedalaman isi',
        max_points: 25,
        levels: DEFAULT_LEVELS,
      },
      {
        title: 'Struktur dan Organisasi',
        description: 'Sistematika penulisan dan alur pikiran',
        max_points: 25,
        levels: DEFAULT_LEVELS,
      },
      {
        title: 'Bahasa dan Ejaan',
        description: 'Ketepatan penggunaan bahasa dan ejaan',
        max_points: 25,
        levels: DEFAULT_LEVELS,
      },
      {
        title: 'Ketepatan Waktu',
        description: 'Pengumpulan tepat waktu sesuai batas',
        max_points: 25,
        levels: DEFAULT_LEVELS,
      },
    ],
  }
}
