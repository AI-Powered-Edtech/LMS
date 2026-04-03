import { useId, useMemo } from 'react'

import type { FillBlankAnswer, FillBlankData } from '../types'

interface FillBlankEditorProps {
  data: FillBlankData
  onChange: (data: FillBlankData) => void
}

// Extract blank IDs from template string: {{blank_id}}
function extractBlankIds(template: string): string[] {
  const matches = [...template.matchAll(/\{\{([\w-]+)\}\}/g)]
  const seen = new Set<string>()
  return matches
    .map((m) => m[1])
    .filter((id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
}

// Render a preview of the fill-blank template
function renderPreview(template: string): React.ReactNode[] {
  const segments: React.ReactNode[] = []
  const regex = /\{\{([\w-]+)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push(<span key={key++}>{template.slice(lastIndex, match.index)}</span>)
    }
    segments.push(
      <span
        key={key++}
        className="inline-block border-b-2 border-indigo-400 dark:border-indigo-500 min-w-[60px] mx-1 text-center text-indigo-400 dark:text-indigo-500 text-sm"
      >
        ___
      </span>
    )
    lastIndex = regex.lastIndex
  }
  if (lastIndex < template.length) {
    segments.push(<span key={key++}>{template.slice(lastIndex)}</span>)
  }
  return segments
}

export function FillBlankEditor({ data, onChange }: FillBlankEditorProps) {
  const toggleId = useId()

  const detectedIds = useMemo(() => extractBlankIds(data?.template ?? ''), [data?.template])

  const handleTemplateChange = (template: string) => {
    const ids = extractBlankIds(template)
    // Sync answers array: keep existing, add missing, preserve order
    const existingMap = new Map((data?.answers ?? []).map((a) => [a.id, a]))
    const answers: FillBlankAnswer[] = ids.map(
      (id) =>
        existingMap.get(id) ?? {
          id,
          acceptedAnswers: [],
          caseSensitive: false,
        }
    )
    onChange({ ...data, template, answers })
  }

  const updateAnswer = (
    id: string,
    field: 'acceptedAnswers' | 'caseSensitive',
    value: string | boolean
  ) => {
    onChange({
      ...data,
      answers: (data?.answers ?? []).map((a) =>
        a.id === id
          ? {
              ...a,
              [field]:
                field === 'acceptedAnswers'
                  ? (value as string)
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : value,
            }
          : a
      ),
    })
  }

  const getAcceptedAnswersString = (id: string) =>
    ((data?.answers ?? []).find((a) => a.id === id)?.acceptedAnswers ?? []).join(', ')

  const isCaseSensitive = (id: string) =>
    (data?.answers ?? []).find((a) => a.id === id)?.caseSensitive ?? false

  return (
    <div className="space-y-4">
      {/* Template textarea */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
          Template Teks
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          Gunakan{' '}
          <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{blank_1}}'}</code> untuk
          menandai titik-titik. Contoh:{' '}
          <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">
            {'Ibu kota Indonesia adalah {{blank_1}}'}
          </code>
        </p>
        <textarea
          value={data?.template ?? ''}
          onChange={(e) => handleTemplateChange(e.target.value)}
          rows={4}
          placeholder="Tulis teks dengan {{blank_id}} sebagai titik-titik..."
          className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400 font-mono"
        />
      </div>

      {/* Detected blanks */}
      {detectedIds.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Jawaban Titik-Titik ({detectedIds.length} titik terdeteksi)
          </h4>
          <div className="space-y-2">
            {detectedIds.map((id) => (
              <div
                key={id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono">
                    {`{{${id}}}`}
                  </code>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Jawaban yang diterima{' '}
                    <span className="text-slate-400">(pisahkan dengan koma)</span>
                  </label>
                  <input
                    type="text"
                    value={getAcceptedAnswersString(id)}
                    onChange={(e) => updateAnswer(id, 'acceptedAnswers', e.target.value)}
                    placeholder="Contoh: Jakarta, jakarta, JAKARTA"
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCaseSensitive(id)}
                    onChange={(e) => updateAnswer(id, 'caseSensitive', e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-500 focus:ring-indigo-400"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Peka huruf besar/kecil
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint toggle */}
      <label className="flex items-center justify-between cursor-pointer" htmlFor={toggleId}>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Tampilkan petunjuk (huruf pertama jawaban)
        </span>
        <button
          id={toggleId}
          role="switch"
          aria-checked={data?.showHints ?? false}
          onClick={() => onChange({ ...data, showHints: !(data?.showHints ?? false) })}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            data?.showHints ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
              data?.showHints ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </label>

      {/* Preview */}
      {data?.template && detectedIds.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Pratinjau
          </h4>
          <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 leading-loose">
            {renderPreview(data.template)}
          </div>
        </div>
      )}
    </div>
  )
}
