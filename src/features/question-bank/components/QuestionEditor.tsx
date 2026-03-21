import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import {
  questionBankService,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from '@/src/features/question-bank/api/questionBankService'
import { QuestionType } from '@/src/features/quizzes'

interface QuestionEditorProps {
  isOpen: boolean
  onClose: () => void
  questionId?: string // If undefined, we are creating a new question
  onSaveSuccess?: () => void
}

const emptyQuestion: CreateQuestionPayload = {
  type: 'MCQ',
  text: '',
  explanation: '',
  difficulty_level: 3,
  tags: [],
  options: [
    { option_text: 'Opsi A', is_correct: true, order_index: 0 },
    { option_text: 'Opsi B', is_correct: false, order_index: 1 },
  ],
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  isOpen,
  onClose,
  questionId,
  onSaveSuccess,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CreateQuestionPayload | UpdateQuestionPayload>(
    emptyQuestion
  )
  const [tagInput, setTagInput] = useState('')

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isOpen) {
      if (questionId) {
        loadQuestion(questionId)
      } else {
        setFormData(emptyQuestion)
      }
    }
  }, [isOpen, questionId])
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadQuestion = async (id: string) => {
    setLoading(true)
    try {
      const question = await questionBankService.getQuestion(id)
      const options = await questionBankService.getQuestionOptions(id)
      setFormData({
        id: question.id,
        subject_id: question.subject_id || undefined,
        topic_id: question.topic_id || undefined,
        type: question.question_type,
        text: question.question_text,
        explanation: question.explanation || '',
        difficulty_level: question.difficulty_level,
        tags: question.tags || [],
        options: options.map((o) => ({
          id: o.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: o.order_index,
        })),
      })
    } catch (error) {
      console.error('Failed to load question:', error)
      alert('Gagal memuat soal.')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.text.trim()) {
      alert('Teks soal tidak boleh kosong.')
      return
    }

    setSaving(true)
    try {
      if (questionId) {
        await questionBankService.updateQuestion(formData as UpdateQuestionPayload)
      } else {
        await questionBankService.createQuestion(formData as CreateQuestionPayload)
      }
      if (onSaveSuccess) onSaveSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to save question:', error)
      alert('Gagal menyimpan soal.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { option_text: 'Opsi Baru', is_correct: false, order_index: prev.options.length },
      ],
    }))
  }

  const handleUpdateOption = (index: number, field: string, value: string | boolean) => {
    const newOptions = [...formData.options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }

  const handleSetCorrectOption = (index: number) => {
    const newOptions = [...formData.options]
    if (formData.type === 'MULTIPLE_SELECT') {
      newOptions[index].is_correct = !newOptions[index].is_correct
    } else {
      newOptions.forEach((o, i) => {
        o.is_correct = i === index
      })
    }
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }

  const handleRemoveOption = (index: number) => {
    const newOptions = [...formData.options]
    newOptions.splice(index, 1)
    // Re-order
    newOptions.forEach((o, i) => {
      o.order_index = i
    })
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim()],
        }))
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }))
  }

  const handleTypeChange = (type: QuestionType) => {
    let newOptions = [...formData.options]
    if (type === 'TRUE_FALSE') {
      newOptions = [
        { option_text: 'Benar', is_correct: true, order_index: 0 },
        { option_text: 'Salah', is_correct: false, order_index: 1 },
      ]
    } else if (type === 'SHORT_ANSWER' || type === 'ESSAY') {
      newOptions = []
    } else if ((type === 'MCQ' || type === 'MULTIPLE_SELECT') && newOptions.length === 0) {
      newOptions = [
        { option_text: 'Opsi A', is_correct: true, order_index: 0 },
        { option_text: 'Opsi B', is_correct: false, order_index: 1 },
      ]
    }
    setFormData((prev) => ({ ...prev, type, options: newOptions }))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {questionId ? 'Edit Soal' : 'Buat Soal Baru'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Tipe Soal
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="MCQ">Pilihan Ganda</option>
                      <option value="MULTIPLE_SELECT">Pilihan Ganda Kompleks</option>
                      <option value="TRUE_FALSE">Benar/Salah</option>
                      <option value="SHORT_ANSWER">Isian Singkat</option>
                      <option value="ESSAY">Esai</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Tingkat Kesulitan
                    </label>
                    <select
                      value={formData.difficulty_level}
                      onChange={(e) =>
                        setFormData({ ...formData, difficulty_level: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="1">1 - Sangat Mudah</option>
                      <option value="2">2 - Mudah</option>
                      <option value="3">3 - Sedang</option>
                      <option value="4">4 - Sulit</option>
                      <option value="5">5 - Sangat Sulit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Pertanyaan
                  </label>
                  <textarea
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-y"
                    placeholder="Tuliskan pertanyaan di sini..."
                  />
                </div>

                {formData.type !== 'SHORT_ANSWER' && formData.type !== 'ESSAY' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Pilihan Jawaban
                      </label>
                      {formData.type !== 'TRUE_FALSE' && (
                        <button
                          onClick={handleAddOption}
                          className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Opsi
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {formData.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                        >
                          <button
                            onClick={() => handleSetCorrectOption(idx)}
                            className={`w-6 h-6 shrink-0 flex items-center justify-center border-2 transition-colors ${
                              formData.type === 'MULTIPLE_SELECT' ? 'rounded' : 'rounded-full'
                            } ${
                              opt.is_correct
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'
                            }`}
                          >
                            {opt.is_correct && (
                              <span className="block w-2.5 h-2.5 bg-white rounded-full scale-100" />
                            )}
                          </button>

                          <input
                            type="text"
                            value={opt.option_text}
                            onChange={(e) => handleUpdateOption(idx, 'option_text', e.target.value)}
                            disabled={formData.type === 'TRUE_FALSE'}
                            placeholder="Teks opsi..."
                            className="flex-1 px-3 py-1.5 bg-transparent border-none outline-none text-sm disabled:opacity-75"
                          />

                          {formData.type !== 'TRUE_FALSE' && (
                            <button
                              onClick={() => handleRemoveOption(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Penjelasan (Opsional)
                  </label>
                  <textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] text-sm resize-y"
                    placeholder="Tambahkan penjelasan mengapa jawaban tersebut benar..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2.5 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Ketik tag dan tekan Enter..."
                  />
                </div>
              </>
            )}
          </div>

          <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2.5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-75"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Soal
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
