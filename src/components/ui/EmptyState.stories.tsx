import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from './EmptyState'
import { BookOpen, FileText, Users, Search } from 'lucide-react'
import { fn } from '@storybook/test'

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  args: {
    title: 'Tidak ada data',
  },
}

export const WithDescription: Story = {
  args: {
    title: 'Belum ada kursus',
    description: 'Anda belum terdaftar di kursus manapun. Mulai belajar sekarang!',
  },
}

export const WithIcon: Story = {
  args: {
    icon: <BookOpen className="w-12 h-12" />,
    title: 'Belum ada materi',
    description: 'Materi pelajaran belum tersedia untuk kelas ini.',
  },
}

export const WithAction: Story = {
  args: {
    icon: <FileText className="w-12 h-12" />,
    title: 'Belum ada tugas',
    description: 'Belum ada tugas yang diberikan untuk kelas ini.',
    action: {
      label: 'Buat Tugas Baru',
      onClick: fn(),
    },
  },
}

export const NoStudents: Story = {
  args: {
    icon: <Users className="w-12 h-12" />,
    title: 'Belum ada siswa',
    description: 'Kelas ini belum memiliki siswa terdaftar.',
    action: {
      label: 'Undang Siswa',
      onClick: fn(),
    },
  },
}

export const SearchEmpty: Story = {
  args: {
    icon: <Search className="w-12 h-12" />,
    title: 'Tidak ditemukan',
    description: 'Hasil pencarian tidak ditemukan. Coba gunakan kata kunci lain.',
  },
}
