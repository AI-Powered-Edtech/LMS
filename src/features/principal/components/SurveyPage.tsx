// ==========================================================================
// SurveyPage — Halaman utama manajemen survey kepuasan
// Task 30.5
// ==========================================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

import { useSurveys } from '../hooks/useExecutiveData'
import type { CreateSurveyInput, SatisfactionSurvey } from '../types'
import { SurveyBuilder } from './SurveyBuilder'
import { SurveyResults } from './SurveyResults'

// ── Constants ──────────────────────────────────────────────────

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  draft: 'warning',
  closed: 'neutral',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  draft: 'Draft',
  closed: 'Ditutup',
}

const AUDIENCE_LABELS: Record<string, string> = {
  teachers: 'Guru',
  students: 'Siswa',
  parents: 'Orang Tua',
  all: 'Semua',
}

// ── Survey Card ────────────────────────────────────────────────

interface SurveyCardProps {
  survey: SatisfactionSurvey
  onView: () => void
  onEdit: () => void
  onPublish: () => void
  onClose: () => void
  onDelete: () => void
  isUpdating: boolean
}

function SurveyCard({
  survey,
  onView,
  onEdit,
  onPublish,
  onClose,
  onDelete,
  isUpdating,
}: SurveyCardProps) {
  const createdAt = new Date(survey.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {survey.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={STATUS_VARIANTS[survey.status]} size="sm">
              {STATUS_LABELS[survey.status]}
            </Badge>
            <Badge variant="info" size="sm">
              {AUDIENCE_LABELS[survey.target_audience]}
            </Badge>
            <span className="text-xs text-slate-400 dark:text-slate-500">{createdAt}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>📝 {survey.questions.length} pertanyaan</span>
        {survey.start_date && (
          <>
            <span>·</span>
            <span>
              {new Date(survey.start_date).toLocaleDateString('id-ID')}
              {survey.end_date ? ` – ${new Date(survey.end_date).toLocaleDateString('id-ID')}` : ''}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onView}>
          📊 Lihat Hasil
        </Button>

        {survey.status === 'draft' && (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              ✏️ Edit
            </Button>
            <Button variant="primary" size="sm" onClick={onPublish} disabled={isUpdating}>
              {isUpdating ? <Spinner size="sm" /> : null}
              Publikasikan
            </Button>
          </>
        )}

        {survey.status === 'active' && (
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isUpdating}>
            {isUpdating ? <Spinner size="sm" /> : null}
            Tutup Survey
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isUpdating}
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-auto"
        >
          🗑️
        </Button>
      </div>
    </Card>
  )
}

// ── Empty State ────────────────────────────────────────────────

function EmptySurveys({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="text-5xl">📋</span>
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Belum Ada Survey</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Buat survey kepuasan untuk mendapatkan masukan dari guru, siswa, dan orang tua tentang
            platform EduSync.
          </p>
        </div>
        <Button variant="primary" onClick={onCreateNew}>
          + Buat Survey Pertama
        </Button>
      </div>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────

export function SurveyPage() {
  const navigate = useNavigate()

  const {
    surveys,
    isLoading,
    error,
    createSurvey,
    isCreating,
    updateSurvey,
    publishSurvey,
    isPublishing,
    closeSurvey,
    isClosing,
    deleteSurvey,
    isDeleting,
  } = useSurveys()

  const [showBuilder, setShowBuilder] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<SatisfactionSurvey | null>(null)
  const [viewingSurvey, setViewingSurvey] = useState<SatisfactionSurvey | null>(null)
  const [pendingPublish, setPendingPublish] = useState<string | null>(null)

  const activeSurveys = surveys.filter((s) => s.status === 'active')

  const handleCreate = async (input: CreateSurveyInput) => {
    await createSurvey(input)
  }

  const handleCreateAndPublish = async (input: CreateSurveyInput) => {
    const created = await createSurvey(input)
    await publishSurvey(created.id)
  }

  const handleUpdate = async (input: CreateSurveyInput) => {
    if (!editingSurvey) return
    await updateSurvey({ id: editingSurvey.id, input })
  }

  const handleUpdateAndPublish = async (input: CreateSurveyInput) => {
    if (!editingSurvey) return
    await updateSurvey({ id: editingSurvey.id, input })
    await publishSurvey(editingSurvey.id)
  }

  const handlePublish = async (id: string) => {
    setPendingPublish(id)
    try {
      await publishSurvey(id)
    } finally {
      setPendingPublish(null)
    }
  }

  const handleClose = async (id: string) => {
    await closeSurvey(id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus survey ini? Tindakan ini tidak dapat dibatalkan.')) return
    await deleteSurvey(id)
    if (viewingSurvey?.id === id) setViewingSurvey(null)
  }

  const handleOpenBuilder = () => {
    setEditingSurvey(null)
    setShowBuilder(true)
  }

  const handleEditSurvey = (survey: SatisfactionSurvey) => {
    setEditingSurvey(survey)
    setShowBuilder(true)
  }

  // If viewing results, show results panel
  if (viewingSurvey) {
    return (
      <div className="min-h-full space-y-6">
        <SurveyResults survey={viewingSurvey} onClose={() => setViewingSurvey(null)} />
        <SurveyBuilder
          open={showBuilder}
          onClose={() => {
            setShowBuilder(false)
            setEditingSurvey(null)
          }}
          survey={editingSurvey}
          onSave={editingSurvey ? handleUpdate : handleCreate}
          onPublish={editingSurvey ? handleUpdateAndPublish : handleCreateAndPublish}
          isSaving={isCreating}
        />
      </div>
    )
  }

  return (
    <div className="min-h-full space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/app/principal')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-sm"
            >
              ← Kembali
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📋</span>
            <span>Kelola Survey Kepuasan</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Kirim dan analisis survey kepuasan kepada guru, siswa, dan orang tua
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenBuilder}>
          + Buat Survey Baru
        </Button>
      </div>

      {/* ── Active survey summary ── */}
      {activeSurveys.length > 0 && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {activeSurveys.length} survey aktif saat ini
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {activeSurveys.map((s) => s.title).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <Card>
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">
            Gagal memuat daftar survey. Silakan refresh halaman.
          </p>
        </Card>
      )}

      {/* ── Empty ── */}
      {!isLoading && !error && surveys.length === 0 && (
        <EmptySurveys onCreateNew={handleOpenBuilder} />
      )}

      {/* ── Survey List ── */}
      {!isLoading && surveys.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              onView={() => setViewingSurvey(survey)}
              onEdit={() => handleEditSurvey(survey)}
              onPublish={() => handlePublish(survey.id)}
              onClose={() => handleClose(survey.id)}
              onDelete={() => handleDelete(survey.id)}
              isUpdating={(pendingPublish === survey.id && isPublishing) || isClosing || isDeleting}
            />
          ))}
        </div>
      )}

      {/* ── Survey Builder Modal ── */}
      <SurveyBuilder
        open={showBuilder}
        onClose={() => {
          setShowBuilder(false)
          setEditingSurvey(null)
        }}
        survey={editingSurvey}
        onSave={editingSurvey ? handleUpdate : handleCreate}
        onPublish={editingSurvey ? handleUpdateAndPublish : handleCreateAndPublish}
        isSaving={isCreating}
      />
    </div>
  )
}
