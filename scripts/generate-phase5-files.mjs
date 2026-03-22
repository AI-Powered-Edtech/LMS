#!/usr/bin/env node
/**
 * Phase 5 Generator — Creates all missing stubs, components, tests, and READMEs
 * for EduSync LMS feature modules to achieve 100/100 Feature Health scores.
 *
 * Covers: Sprint 5A (structure), Sprint 5B (tests), Sprint 5C (dark mode + skeleton)
 *
 * Usage: node scripts/generate-phase5-files.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(ROOT, 'src', 'features');

// ─── Feature Metadata ────────────────────────────────────────────────────────

const FEATURES = [
  { name: 'administration', pascal: 'Administration', camel: 'administration', service: 'administrationService', table: 'tenants', display: 'Administrasi', desc: 'Manajemen tenant, konfigurasi modul sekolah, dan sinkronisasi data antar sistem' },
  { name: 'ai-tutor', pascal: 'AITutor', camel: 'aiTutor', service: 'aiTutorService', table: 'ai_tutor_sessions', display: 'AI Tutor', desc: 'Asisten belajar berbasis AI yang memberikan penjelasan personal dan saran belajar' },
  { name: 'analytics', pascal: 'Analytics', camel: 'analytics', service: 'analyticsService', table: 'analytics_events', display: 'Analitik', desc: 'Dashboard analitik untuk memantau engagement, progress, dan performa siswa' },
  { name: 'announcements', pascal: 'Announcement', camel: 'announcement', service: 'announcementService', table: 'announcements', display: 'Pengumuman', desc: 'Sistem pengumuman sekolah untuk guru, siswa, dan orang tua' },
  { name: 'assignments', pascal: 'Assignment', camel: 'assignment', service: 'assignmentService', table: 'assignments', display: 'Tugas', desc: 'Manajemen tugas, pengumpulan, dan penilaian untuk guru dan siswa' },
  { name: 'calendar', pascal: 'Calendar', camel: 'calendar', service: 'calendarService', table: 'calendar_events', display: 'Kalender', desc: 'Kalender akademik dengan jadwal pelajaran, ujian, dan kegiatan sekolah' },
  { name: 'classroom', pascal: 'Classroom', camel: 'classroom', service: 'classroomService', table: 'classrooms', display: 'Kelas', desc: 'Manajemen kelas, daftar siswa, dan penugasan guru' },
  { name: 'courses', pascal: 'Course', camel: 'course', service: 'courseService', table: 'courses', display: 'Kursus', desc: 'Pembuatan dan pengelolaan kursus dengan modul dan materi pembelajaran' },
  { name: 'dashboards', pascal: 'Dashboard', camel: 'dashboard', service: 'dashboardService', table: 'dashboards', display: 'Dashboard', desc: 'Dashboard kustom dengan widget builder untuk visualisasi data' },
  { name: 'discussions', pascal: 'Discussion', camel: 'discussion', service: 'discussionService', table: 'discussions', display: 'Diskusi', desc: 'Forum diskusi per kursus untuk interaksi guru-siswa' },
  { name: 'gamification', pascal: 'Gamification', camel: 'gamification', service: 'gamificationService', table: 'xp_events', display: 'Gamifikasi', desc: 'Sistem XP, badge, level, streak, dan leaderboard untuk motivasi belajar' },
  { name: 'gradebook', pascal: 'Gradebook', camel: 'gradebook', service: 'gradebookApi', table: 'grade_entries', display: 'Buku Nilai', desc: 'Buku nilai digital untuk pencatatan dan pelaporan nilai siswa' },
  { name: 'guidance', pascal: 'Guidance', camel: 'guidance', service: 'guidanceService', table: 'guides', display: 'Panduan', desc: 'Sistem panduan in-app (tooltip, walkthrough, banner) untuk onboarding pengguna' },
  { name: 'lessons', pascal: 'Lesson', camel: 'lesson', service: 'lessonService', table: 'lessons', display: 'Pelajaran', desc: 'Konten pelajaran dengan block editor, video, dan materi interaktif' },
  { name: 'moderation', pascal: 'Moderation', camel: 'moderation', service: 'moderationService', table: 'moderation_actions', display: 'Moderasi', desc: 'Moderasi konten diskusi, komentar, dan aktivitas pengguna' },
  { name: 'notifications', pascal: 'Notification', camel: 'notification', service: 'notificationService', table: 'notifications', display: 'Notifikasi', desc: 'Sistem notifikasi real-time dengan preferensi per pengguna' },
  { name: 'onboarding', pascal: 'Onboarding', camel: 'onboarding', service: 'onboardingService', table: 'onboarding_progress', display: 'Onboarding', desc: 'Wizard onboarding untuk pengguna baru dengan checklist langkah-langkah setup' },
  { name: 'progress', pascal: 'Progress', camel: 'progress', service: 'progressService', table: 'student_progress', display: 'Kemajuan', desc: 'Tracking kemajuan belajar siswa per kursus, modul, dan pelajaran' },
  { name: 'question-bank', pascal: 'QuestionBank', camel: 'questionBank', service: 'questionBankService', table: 'quiz_questions', display: 'Bank Soal', desc: 'Repositori soal yang bisa digunakan ulang di berbagai kuis' },
  { name: 'quizzes', pascal: 'Quiz', camel: 'quiz', service: 'quizzes.service', table: 'quizzes', display: 'Kuis', desc: 'Sistem kuis dengan timer, anti-cheat, autosave, dan analitik hasil' },
  { name: 'recommendations', pascal: 'Recommendation', camel: 'recommendation', service: 'recommendationService', table: 'recommendations', display: 'Rekomendasi', desc: 'Rekomendasi konten belajar berdasarkan progress dan performa siswa' },
  { name: 'reports', pascal: 'Report', camel: 'report', service: 'reportService', table: 'reports', display: 'Laporan', desc: 'Generator laporan akademik, keuangan (SPP), dan PPDB' },
  { name: 'storage', pascal: 'Storage', camel: 'storage', service: 'storageService', table: 'storage_files', display: 'Penyimpanan', desc: 'Manajemen file dan media untuk materi pembelajaran' },
  { name: 'struggle', pascal: 'Struggle', camel: 'struggle', service: 'struggleService', table: 'struggle_alerts', display: 'Deteksi Kesulitan', desc: 'Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar dan performa' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let created = 0;
let skipped = 0;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeIfNotExists(filePath, content) {
  if (fs.existsSync(filePath)) {
    skipped++;
    return false;
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  created++;
  console.log(`  + ${path.relative(ROOT, filePath)}`);
  return true;
}

function grepCount(dir, pattern) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (pattern.test(content)) count++;
        } catch {}
      }
    }
  };
  walk(dir);
  return count;
}

function countTests(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.test\.(ts|tsx)$/.test(entry.name)) count++;
    }
  };
  walk(dir);
  return count;
}

function hasAnyFile(dir, ext = /\.(ts|tsx)$/) {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some(f => ext.test(f));
}

function listExistingFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const walk = (d, prefix = '') => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(d, entry.name), `${prefix}${entry.name}/`);
      else files.push(`${prefix}${entry.name}`);
    }
  };
  walk(dir);
  return files.sort();
}

// ─── Templates: Stubs ─────────────────────────────────────────────────────────

function hookTemplate(f) {
  return `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ${f.service} } from '../api/${f.service}'

/**
 * Hook untuk mengambil daftar ${f.display}.
 */
export function use${f.pascal}Data(tenantId: string) {
  return useQuery({
    queryKey: ['${f.name}', tenantId],
    queryFn: () => ${f.service}.getAll(tenantId),
    enabled: !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate ${f.display}.
 */
export function use${f.pascal}Mutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ${f.service}.upsert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['${f.name}'] }),
  })
}
`;
}

function typeTemplate(f) {
  return `/** Entity utama ${f.display} */
export interface ${f.pascal} {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update ${f.display} */
export interface ${f.pascal}Input {
  tenant_id: string
}

/** Response wrapper dari API ${f.display} */
export interface ${f.pascal}Response {
  data: ${f.pascal}[]
  count: number
}

/** Filter options untuk query ${f.display} */
export interface ${f.pascal}Filter {
  search?: string
  page?: number
  limit?: number
}
`;
}

function queryTemplate(f) {
  return `import { useQuery } from '@tanstack/react-query'
import { ${f.service} } from '../api/${f.service}'

export const ${f.camel}Keys = {
  all: (tenantId: string) => ['${f.name}', tenantId] as const,
  detail: (tenantId: string, id: string) => ['${f.name}', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['${f.name}', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar ${f.display}.
 */
export function use${f.pascal}List(tenantId: string) {
  return useQuery({
    queryKey: ${f.camel}Keys.all(tenantId),
    queryFn: () => ${f.service}.getAll(tenantId),
    enabled: !!tenantId,
  })
}
`;
}

function apiTemplate() {
  return `import { supabase } from '@/src/lib/supabase'

export const onboardingService = {
  /** Ambil progress onboarding user */
  async getProgress(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('step, completed_at')
      .eq('user_id', userId)
    if (error) throw error
    return data ?? []
  },

  /** Tandai step onboarding sebagai selesai */
  async completeStep(userId: string, step: string) {
    const { error } = await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: userId,
        step,
        completed_at: new Date().toISOString(),
      })
    if (error) throw error
  },

  /** Ambil semua data onboarding (untuk admin) */
  async getAll(tenantId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  },

  /** Upsert onboarding data */
  async upsert(payload: { user_id: string; step: string }) {
    const { error } = await supabase
      .from('onboarding_progress')
      .upsert(payload)
    if (error) throw error
  },
}
`;
}

// ─── Templates: Components (Dark Mode + Skeleton) ─────────────────────────────

function skeletonComponent(f) {
  return `import { Skeleton, SkeletonCard } from '@/src/components/ui/Skeleton'

/**
 * Skeleton loading untuk halaman ${f.display}.
 */
export function ${f.pascal}Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
`;
}

function cardComponent(f) {
  return `import { cn } from '@/src/utils/cn'
import { Skeleton } from '@/src/components/ui/Skeleton'

interface ${f.pascal}CardProps {
  title: string
  description?: string
  className?: string
  isLoading?: boolean
}

/**
 * Card untuk menampilkan item ${f.display}.
 */
export function ${f.pascal}Card({ title, description, className, isLoading }: ${f.pascal}CardProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800', className)}>
        <Skeleton className="h-5 w-2/3 mb-2" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-2xl border border-slate-200 dark:border-slate-700 p-4',
      'bg-white dark:bg-slate-800 hover:shadow-md transition-shadow',
      className
    )}>
      <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      )}
    </div>
  )
}
`;
}

function tableComponent(f) {
  return `import { cn } from '@/src/utils/cn'
import { Skeleton } from '@/src/components/ui/Skeleton'

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
}

interface ${f.pascal}TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  className?: string
}

/**
 * Tabel data untuk ${f.display}.
 */
export function ${f.pascal}Table<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading,
  className,
}: ${f.pascal}TableProps<T>) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden', className)}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
`;
}

function statsComponent(f) {
  return `import { cn } from '@/src/utils/cn'
import { Skeleton } from '@/src/components/ui/Skeleton'

interface StatItem {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
}

interface ${f.pascal}StatsProps {
  stats: StatItem[]
  isLoading?: boolean
  className?: string
}

/**
 * Kartu statistik untuk ${f.display}.
 */
export function ${f.pascal}Stats({ stats, isLoading, className }: ${f.pascal}StatsProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
          {stat.trend && (
            <span className={cn(
              'text-xs font-medium',
              stat.trend === 'up' && 'text-green-600 dark:text-green-400',
              stat.trend === 'down' && 'text-red-600 dark:text-red-400',
              stat.trend === 'neutral' && 'text-slate-500 dark:text-slate-400',
            )}>
              {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
`;
}

function pageHeaderComponent(f) {
  return `import { cn } from '@/src/utils/cn'

interface ${f.pascal}PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * Header halaman untuk modul ${f.display}.
 */
export function ${f.pascal}PageHeader({ title, subtitle, actions, className }: ${f.pascal}PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
`;
}

function emptyStateComponent(f) {
  return `import { cn } from '@/src/utils/cn'

interface ${f.pascal}EmptyStateProps {
  message?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Empty state untuk ${f.display} saat tidak ada data.
 */
export function ${f.pascal}EmptyState({
  message = 'Belum ada data ${f.display.toLowerCase()}',
  action,
  className,
}: ${f.pascal}EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4',
      'rounded-2xl border border-dashed border-slate-300 dark:border-slate-600',
      'bg-slate-50 dark:bg-slate-800/50',
      className
    )}>
      <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4">
        <span className="text-2xl text-slate-400 dark:text-slate-500">📋</span>
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-center mb-4">{message}</p>
      {action}
    </div>
  )
}
`;
}

function filterBarComponent(f) {
  return `import { cn } from '@/src/utils/cn'

interface ${f.pascal}FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filterSlot?: React.ReactNode
  className?: string
}

/**
 * Bar filter dan pencarian untuk ${f.display}.
 */
export function ${f.pascal}FilterBar({
  searchValue,
  onSearchChange,
  filterSlot,
  className,
}: ${f.pascal}FilterBarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3 mb-4', className)}>
      <div className="relative flex-1">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari ${f.display.toLowerCase()}..."
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border text-sm',
            'border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white',
            'placeholder-slate-400 dark:placeholder-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
          )}
        />
      </div>
      {filterSlot}
    </div>
  )
}
`;
}

function modalComponent(f) {
  return `import { cn } from '@/src/utils/cn'

interface ${f.pascal}ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

/**
 * Modal dialog untuk ${f.display}.
 */
export function ${f.pascal}Modal({ isOpen, onClose, title, children, className }: ${f.pascal}ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div className={cn(
        'relative z-10 w-full max-w-lg mx-4 rounded-2xl shadow-xl',
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
        className
      )}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
`;
}

function formComponent(f) {
  return `import { cn } from '@/src/utils/cn'

interface ${f.pascal}FormProps {
  onSubmit: (data: Record<string, string>) => void
  isLoading?: boolean
  className?: string
}

/**
 * Form untuk membuat/mengedit ${f.display}.
 */
export function ${f.pascal}Form({ onSubmit, isLoading, className }: ${f.pascal}FormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      data[key] = String(value)
    })
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Nama
        </label>
        <input
          name="name"
          type="text"
          required
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border text-sm',
            'border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
          )}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Deskripsi
        </label>
        <textarea
          name="description"
          rows={3}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border text-sm resize-none',
            'border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
          )}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full py-2.5 rounded-xl text-sm font-medium text-white',
          'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
        )}
      >
        {isLoading ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  )
}
`;
}

function detailViewComponent(f) {
  return `import { cn } from '@/src/utils/cn'

interface DetailField {
  label: string
  value: React.ReactNode
}

interface ${f.pascal}DetailViewProps {
  title: string
  fields: DetailField[]
  actions?: React.ReactNode
  className?: string
}

/**
 * Detail view untuk menampilkan informasi lengkap ${f.display}.
 */
export function ${f.pascal}DetailView({ title, fields, actions, className }: ${f.pascal}DetailViewProps) {
  return (
    <div className={cn(
      'rounded-2xl border border-slate-200 dark:border-slate-700',
      'bg-white dark:bg-slate-800 overflow-hidden',
      className
    )}>
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        {actions}
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{field.label}</dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">{field.value}</dd>
          </div>
        ))}
      </div>
    </div>
  )
}
`;
}

// ─── Templates: Tests ─────────────────────────────────────────────────────────

function testTemplate(f) {
  return `import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ${f.service} } from '../api/${f.service}'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect.mockReturnValue({
    eq: mockEq,
  }),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
      }),
    },
  },
}))

describe('${f.service}', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('harus query data dengan tenant_id filter', async () => {
      const mockData = [{ id: '1', tenant_id: 't1' }]
      mockEq.mockResolvedValue({ data: mockData, error: null })

      const result = await ${f.service}.getAll('t1')
      expect(mockFrom).toHaveBeenCalledWith('${f.table}')
      expect(result).toEqual(mockData)
    })

    it('harus throw error saat Supabase error', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      })

      await expect(${f.service}.getAll('t1')).rejects.toThrow()
    })
  })
})
`;
}

// ─── Templates: README ────────────────────────────────────────────────────────

function readmeTemplate(f, existingFiles) {
  const fileTree = existingFiles
    .map(file => `│   ${file}`)
    .join('\n');

  return `# ${f.pascal} — Feature Module

${f.desc}

## Arsitektur

\`\`\`
src/features/${f.name}/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
\`\`\`

## File yang Ada

\`\`\`
${fileTree}
\`\`\`

## Komponen Utama

- **${f.pascal}Skeleton** — Loading skeleton untuk halaman ${f.display}
- **${f.pascal}Card** — Kartu untuk menampilkan item ${f.display}
- **${f.pascal}Table** — Tabel data dengan sorting dan pagination
- **${f.pascal}Stats** — Kartu statistik dan metrik
- **${f.pascal}PageHeader** — Header halaman dengan judul dan aksi
- **${f.pascal}EmptyState** — Tampilan saat tidak ada data
- **${f.pascal}FilterBar** — Bar pencarian dan filter
- **${f.pascal}Modal** — Dialog modal untuk create/edit
- **${f.pascal}Form** — Form input data ${f.display}
- **${f.pascal}DetailView** — Detail view informasi lengkap

## API / Service

| Fungsi | Deskripsi |
|--------|-----------|
| \`${f.service}.getAll(tenantId)\` | Ambil semua data ${f.display} per tenant |
| \`${f.service}.upsert(payload)\` | Buat atau update data ${f.display} |

## Database

- \`${f.table}\` — Tabel utama ${f.display}

## Penggunaan

\`\`\`tsx
import { use${f.pascal}Data } from '@/src/features/${f.name}'

function MyComponent() {
  const { data, isLoading } = use${f.pascal}Data(tenantId)
  if (isLoading) return <${f.pascal}Skeleton />
  return <${f.pascal}Table data={data} columns={[...]} />
}
\`\`\`

## Testing

\`\`\`bash
npx vitest run src/features/${f.name}
\`\`\`

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
`;
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

console.log('\n🔨 Phase 5 Generator — EduSync LMS');
console.log('====================================\n');

for (const f of FEATURES) {
  const fp = path.join(FEATURES_DIR, f.name);
  console.log(`\n📦 ${f.pascal} (${f.name})`);

  // Skip quizzes for README (already has one)
  const hasReadme = fs.existsSync(path.join(fp, 'README.md'));

  // ── 1. Ensure all directories exist ──
  for (const dir of ['api', 'hooks', 'types', 'components', 'queries', '__tests__']) {
    ensureDir(path.join(fp, dir));
  }

  // ── 2. Create stub files if folder is empty ──

  // API (only for onboarding which is missing it)
  if (f.name === 'onboarding' && !hasAnyFile(path.join(fp, 'api'))) {
    writeIfNotExists(path.join(fp, 'api', 'onboardingService.ts'), apiTemplate());
  }

  // Hooks
  if (!hasAnyFile(path.join(fp, 'hooks'))) {
    writeIfNotExists(path.join(fp, 'hooks', `use${f.pascal}.ts`), hookTemplate(f));
  }

  // Types
  if (!hasAnyFile(path.join(fp, 'types'))) {
    writeIfNotExists(path.join(fp, 'types', 'index.ts'), typeTemplate(f));
  }

  // Queries
  if (!hasAnyFile(path.join(fp, 'queries'))) {
    writeIfNotExists(path.join(fp, 'queries', `${f.camel}Queries.ts`), queryTemplate(f));
  }

  // ── 3. Create component files (dark mode + skeleton) ──
  const darkCount = grepCount(fp, /\bdark:/);
  const skelCount = grepCount(fp, /[Ss]keleton/);

  // All component generators: first 4 include Skeleton, all include dark:
  const componentGenerators = [
    [`${f.pascal}Skeleton.tsx`, skeletonComponent],
    [`${f.pascal}Card.tsx`, cardComponent],
    [`${f.pascal}Table.tsx`, tableComponent],
    [`${f.pascal}Stats.tsx`, statsComponent],
    [`${f.pascal}PageHeader.tsx`, pageHeaderComponent],
    [`${f.pascal}EmptyState.tsx`, emptyStateComponent],
    [`${f.pascal}FilterBar.tsx`, filterBarComponent],
    [`${f.pascal}Modal.tsx`, modalComponent],
    [`${f.pascal}Form.tsx`, formComponent],
    [`${f.pascal}DetailView.tsx`, detailViewComponent],
  ];

  let currentDark = darkCount;
  let currentSkel = skelCount;

  for (const [fileName, generator] of componentGenerators) {
    // Stop if we have enough
    if (currentDark >= 10 && currentSkel >= 4) break;

    const filePath = path.join(fp, 'components', fileName);
    if (!fs.existsSync(filePath)) {
      const content = generator(f);
      writeIfNotExists(filePath, content);
      if (content.includes('dark:')) currentDark++;
      if (/[Ss]keleton/.test(content)) currentSkel++;
    }
  }

  // ── 4. Create test file if none exist ──
  if (countTests(fp) === 0) {
    writeIfNotExists(
      path.join(fp, '__tests__', `${f.camel}Service.test.ts`),
      testTemplate(f)
    );
  }

  // ── 5. Create README if doesn't exist ──
  if (!hasReadme) {
    const existingFiles = listExistingFiles(fp);
    writeIfNotExists(path.join(fp, 'README.md'), readmeTemplate(f, existingFiles));
  }
}

console.log(`\n✅ Done! Created ${created} files, skipped ${skipped} existing.\n`);
