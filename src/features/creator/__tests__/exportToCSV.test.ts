import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GeneratedOpenQuestion, GeneratedQuestion, GeneratedQuizQuestion } from '../types'
import { exportQuestionsToCSV } from '../utils/exportToCSV'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function buatSoalQuiz(overrides: Partial<GeneratedQuizQuestion> = {}): GeneratedQuizQuestion {
  return {
    id: 'q-1',
    question_type: 'MCQ',
    text: 'Ibu kota Indonesia adalah?',
    options: [
      { text: 'Surabaya', is_correct: false },
      { text: 'Jakarta', is_correct: true },
      { text: 'Bandung', is_correct: false },
      { text: 'Medan', is_correct: false },
    ],
    explanation: 'Jakarta adalah ibu kota Indonesia.',
    bloomLevel: 'C1',
    ...overrides,
  }
}

function buatSoalTerbuka(overrides: Partial<GeneratedOpenQuestion> = {}): GeneratedOpenQuestion {
  return {
    id: 'q-open-1',
    question_type: 'OPEN',
    text: 'Jelaskan proses fotosintesis!',
    answer: 'Fotosintesis adalah proses tumbuhan mengubah cahaya matahari menjadi energi.',
    bloomLevel: 'C2',
    ...overrides,
  }
}

// ─── DOM Mock Setup ───────────────────────────────────────────────────────────

let capturedBlobContent = ''
let capturedBlobType = ''
let mockAnchor: {
  href: string
  download: string
  click: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  capturedBlobContent = ''
  capturedBlobType = ''

  vi.stubGlobal(
    'Blob',
    class MockBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        capturedBlobContent = (parts as string[]).join('')
        capturedBlobType = options?.type ?? ''
      }
    }
  )

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  })

  mockAnchor = { href: '', download: '', click: vi.fn() }
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockAnchor as unknown as HTMLElement
    return document.createElement(tag)
  })
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as Node)
  vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as unknown as Node)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('exportQuestionsToCSV', () => {
  describe('ketika array soal kosong', () => {
    it('tidak melakukan apa-apa (tidak membuat Blob atau memanggil DOM)', () => {
      exportQuestionsToCSV([], 'quiz', 'materi')
      expect(capturedBlobContent).toBe('')
      expect(mockAnchor.click).not.toHaveBeenCalled()
    })
  })

  describe('format CSV tipe quiz', () => {
    it('menggunakan header yang benar untuk tipe quiz', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      const header = lines[0].replace('\uFEFF', '')
      expect(header).toBe(
        'No,Pertanyaan,Opsi A,Opsi B,Opsi C,Opsi D,Jawaban Benar,Penjelasan,Level Bloom'
      )
    })

    it('memetakan is_correct ke huruf jawaban benar (A, B, C, atau D)', () => {
      // opsi pertama benar → A
      exportQuestionsToCSV(
        [
          buatSoalQuiz({
            options: [
              { text: 'Opsi1', is_correct: true },
              { text: 'Opsi2', is_correct: false },
              { text: 'Opsi3', is_correct: false },
              { text: 'Opsi4', is_correct: false },
            ],
          }),
        ],
        'quiz',
        'materi'
      )
      let lines = capturedBlobContent.split('\r\n')
      expect(lines[1].split(',')[6]).toBe('A')

      // opsi kedua benar → B
      exportQuestionsToCSV(
        [
          buatSoalQuiz({
            options: [
              { text: 'Opsi1', is_correct: false },
              { text: 'Opsi2', is_correct: true },
              { text: 'Opsi3', is_correct: false },
              { text: 'Opsi4', is_correct: false },
            ],
          }),
        ],
        'quiz',
        'materi'
      )
      lines = capturedBlobContent.split('\r\n')
      expect(lines[1].split(',')[6]).toBe('B')

      // opsi ketiga benar → C
      exportQuestionsToCSV(
        [
          buatSoalQuiz({
            options: [
              { text: 'Opsi1', is_correct: false },
              { text: 'Opsi2', is_correct: false },
              { text: 'Opsi3', is_correct: true },
              { text: 'Opsi4', is_correct: false },
            ],
          }),
        ],
        'quiz',
        'materi'
      )
      lines = capturedBlobContent.split('\r\n')
      expect(lines[1].split(',')[6]).toBe('C')

      // opsi keempat benar → D
      exportQuestionsToCSV(
        [
          buatSoalQuiz({
            options: [
              { text: 'Opsi1', is_correct: false },
              { text: 'Opsi2', is_correct: false },
              { text: 'Opsi3', is_correct: false },
              { text: 'Opsi4', is_correct: true },
            ],
          }),
        ],
        'quiz',
        'materi'
      )
      lines = capturedBlobContent.split('\r\n')
      expect(lines[1].split(',')[6]).toBe('D')
    })

    it('menempatkan teks opsi di kolom yang benar', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      const cols = lines[1].split(',')
      expect(cols[2]).toBe('Surabaya')
      expect(cols[3]).toBe('Jakarta')
      expect(cols[4]).toBe('Bandung')
      expect(cols[5]).toBe('Medan')
    })

    it('menyertakan penjelasan di kolom ke-8', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      const cols = lines[1].split(',')
      expect(cols[7]).toBe('Jakarta adalah ibu kota Indonesia.')
    })

    it('menyertakan bloomLevel di kolom ke-9', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      const cols = lines[1].split(',')
      expect(cols[8]).toBe('C1')
    })

    it('menggunakan string kosong untuk penjelasan/bloomLevel yang tidak ada', () => {
      exportQuestionsToCSV(
        [buatSoalQuiz({ explanation: undefined, bloomLevel: undefined })],
        'quiz',
        'materi'
      )
      const lines = capturedBlobContent.split('\r\n')
      const cols = lines[1].split(',')
      expect(cols[7]).toBe('')
      expect(cols[8]).toBe('')
    })

    it('menomori baris mulai dari 1', () => {
      const questions: GeneratedQuestion[] = [
        buatSoalQuiz({ id: 'q1' }),
        buatSoalQuiz({ id: 'q2' }),
      ]
      exportQuestionsToCSV(questions, 'quiz', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      expect(lines[1].startsWith('1,')).toBe(true)
      expect(lines[2].startsWith('2,')).toBe(true)
    })
  })

  describe('format CSV tipe reading', () => {
    it('menggunakan header yang benar untuk tipe reading', () => {
      exportQuestionsToCSV([buatSoalTerbuka()], 'reading', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      const header = lines[0].replace('\uFEFF', '')
      expect(header).toBe('No,Pertanyaan,Kunci Jawaban,Level Bloom')
    })

    it('mengisi kolom pertanyaan dan kunci jawaban', () => {
      exportQuestionsToCSV([buatSoalTerbuka()], 'reading', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      // answer berisi koma → di-wrap dengan kutip
      expect(lines[1]).toContain('Jelaskan proses fotosintesis!')
    })
  })

  describe('format CSV tipe writing', () => {
    it('menggunakan header Topik dan Rubrik Penilaian untuk tipe writing', () => {
      exportQuestionsToCSV([buatSoalTerbuka()], 'writing', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      const header = lines[0].replace('\uFEFF', '')
      expect(header).toBe('No,Topik,Rubrik Penilaian,Level Bloom')
    })
  })

  describe('BOM dan encoding', () => {
    it('konten CSV diawali dengan BOM (\\uFEFF)', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      expect(capturedBlobContent.startsWith('\uFEFF')).toBe(true)
    })

    it('menggunakan MIME type text/csv;charset=utf-8;', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      expect(capturedBlobType).toBe('text/csv;charset=utf-8;')
    })
  })

  describe('escaping karakter khusus CSV', () => {
    it('membungkus field dengan koma dalam kutip ganda', () => {
      const q = buatSoalQuiz({ text: 'Pilih A, B, atau C?' })
      exportQuestionsToCSV([q], 'quiz', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      expect(lines[1]).toContain('"Pilih A, B, atau C?"')
    })

    it('meng-escape kutip ganda dengan dua kutip ganda', () => {
      const q = buatSoalQuiz({ text: 'Apa arti "merdeka"?' })
      exportQuestionsToCSV([q], 'quiz', 'materi')
      expect(capturedBlobContent).toContain('"Apa arti ""merdeka""?"')
    })

    it('tidak membungkus nilai biasa tanpa karakter khusus', () => {
      const q = buatSoalQuiz({ text: 'Teks biasa' })
      exportQuestionsToCSV([q], 'quiz', 'materi')
      expect(capturedBlobContent).toContain('Teks biasa')
      expect(capturedBlobContent).not.toContain('"Teks biasa"')
    })
  })

  describe('nama file unduhan', () => {
    it('menghapus ekstensi file dan menambahkan _quiz.csv', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi.pdf')
      expect(mockAnchor.download).toBe('materi_quiz.csv')
    })

    it('menggunakan soal_ai sebagai fallback untuk nama file kosong', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', '')
      expect(mockAnchor.download).toBe('soal_ai_quiz.csv')
    })

    it('menambahkan _reading.csv untuk tipe reading', () => {
      exportQuestionsToCSV([buatSoalTerbuka()], 'reading', 'bahan.docx')
      expect(mockAnchor.download).toBe('bahan_reading.csv')
    })

    it('menambahkan _writing.csv untuk tipe writing', () => {
      exportQuestionsToCSV([buatSoalTerbuka()], 'writing', 'topik.txt')
      expect(mockAnchor.download).toBe('topik_writing.csv')
    })
  })

  describe('interaksi DOM', () => {
    it('memanggil click() pada elemen <a>', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      expect(mockAnchor.click).toHaveBeenCalledOnce()
    })

    it('memanggil URL.createObjectURL dan URL.revokeObjectURL', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      expect(URL.createObjectURL).toHaveBeenCalledOnce()
      expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    })

    it('mengatur href elemen <a> ke URL blob', () => {
      exportQuestionsToCSV([buatSoalQuiz()], 'quiz', 'materi')
      expect(mockAnchor.href).toBe('blob:mock-url')
    })
  })

  describe('format baris CSV', () => {
    it('baris CSV dipisahkan oleh CRLF (\\r\\n)', () => {
      const questions: GeneratedQuestion[] = [
        buatSoalQuiz({ id: 'q1' }),
        buatSoalQuiz({ id: 'q2' }),
      ]
      exportQuestionsToCSV(questions, 'quiz', 'materi')
      const lines = capturedBlobContent.split('\r\n')
      expect(lines.length).toBe(3) // header + 2 data rows (no trailing newline)
    })
  })
})
