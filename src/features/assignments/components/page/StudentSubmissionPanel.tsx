import {
  Camera,
  CheckCircle2,
  FileText,
  FileUp,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  UploadCloud,
  Users2,
  X,
} from 'lucide-react'
import type { RefObject } from 'react'

import type { AssignmentUiState } from '@/features/assignments/types'
import { PeerReviewList } from '@/features/peer-review'

import { getStatusBadge } from './assignmentPageUtils'

interface StudentSubmissionPanelProps {
  assignment: AssignmentUiState
  selectedFile: File | null
  isUploading: boolean
  uploadProgress: Record<string, number>
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileChange: (assignmentId: string, file: File | null) => void
  onClearFile: (assignmentId: string) => void
  onTurnIn: (id: string) => void
  onUnsubmit: (id: string) => void
  /** Optional — if provided, shows assigned peer reviews section */
  userId?: string
  tenantId?: string
}

export function StudentSubmissionPanel({
  assignment,
  selectedFile,
  isUploading,
  uploadProgress,
  fileInputRef,
  onFileChange,
  onClearFile,
  onTurnIn,
  onUnsubmit,
  userId,
  tenantId,
}: StudentSubmissionPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Tugas Anda</h3>
        {getStatusBadge(assignment.status)}
      </div>

      {/* Student Attachments Area */}
      <div className="space-y-3 mb-6">
        {assignment.status === 'assigned' || assignment.status === 'late' ? (
          selectedFile ? (
            <div className="relative overflow-hidden rounded-xl">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                      {selectedFile.type || 'FILE'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onClearFile(assignment.id)}
                  className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label="Hapus file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {isUploading && uploadProgress[assignment.id] !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-200"
                    style={{ width: `${uploadProgress[assignment.id]}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Belum ada file yang dilampirkan
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tambahkan file untuk diserahkan
              </p>
            </div>
          )
        ) : assignment.submittedAt ? (
          <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tugas diserahkan
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(assignment.submittedAt).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Tidak ada file lampiran</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {assignment.status === 'assigned' || assignment.status === 'late' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled
              title="Fitur segera hadir"
              className="flex items-center justify-center gap-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
            >
              <FileUp className="w-4 h-4" /> Drive
            </button>
            <button
              disabled
              title="Fitur segera hadir"
              className="flex items-center justify-center gap-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
            >
              <LinkIcon className="w-4 h-4" /> Link
            </button>
            <button
              className="flex items-center justify-center gap-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4 text-blue-500" /> File
            </button>
            <button
              disabled
              title="Fitur segera hadir"
              className="flex items-center justify-center gap-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
            >
              <Camera className="w-4 h-4" /> Kamera
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => onFileChange(assignment.id, e.target.files?.[0] || null)}
          />
          <button
            onClick={() => onTurnIn(assignment.id)}
            disabled={isUploading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {Math.round(uploadProgress[assignment.id] ?? 0)}%
              </>
            ) : (
              'Serahkan Tugas'
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={() => onUnsubmit(assignment.id)}
          className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
        >
          Batalkan Penyerahan
        </button>
      )}

      {/* Peer Review Section */}
      {userId && tenantId && (
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Users2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tugas Peer Review
            </h4>
          </div>
          <PeerReviewList userId={userId} tenantId={tenantId} />
        </div>
      )}
    </div>
  )
}
