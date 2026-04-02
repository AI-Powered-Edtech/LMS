import { Clock, Link as LinkIcon, Play, Video } from 'lucide-react'
import { useState } from 'react'

import { useBuilder } from '@/contexts/BuilderContext'
import { InteractiveVideoEditor } from '@/features/courses/components/InteractiveVideoEditor'
import type { InteractiveVideoMetadata } from '@/features/lessons/types'
import { parseVideoUrl } from '@/utils/videoUtils'

interface VideoBlockEditorProps {
  blockId: string
}

export function VideoBlockEditor({ blockId }: VideoBlockEditorProps) {
  const { state, actions } = useBuilder()
  const block = state.activeLesson?.blocks.find((b) => b.id === blockId)
  const [showInteractiveEditor, setShowInteractiveEditor] = useState(false)

  if (!block) return null

  const url = block.url || ''
  const { type: videoType, embedUrl } = parseVideoUrl(url)

  const handleSaveInteractiveMetadata = (newMetadata: InteractiveVideoMetadata) => {
    actions.updateBlock(blockId, { metadata: newMetadata as Record<string, unknown> })
    actions.saveBlock(blockId)
  }

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="flex gap-2">
        <div className="relative group flex-1">
          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            aria-label="URL video YouTube atau Vimeo"
            placeholder="Tempel tautan YouTube atau video di sini..."
            value={url}
            onChange={(e) => {
              actions.updateBlock(blockId, { url: e.target.value })
            }}
            onBlur={() => {
              actions.saveBlock(blockId)
            }}
            className="w-full pl-11 pr-4 py-3 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 focus:border-indigo-300 dark:focus:border-indigo-600 outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white shadow-inner"
          />
        </div>
        <button
          onClick={() => setShowInteractiveEditor(true)}
          className="flex-shrink-0 px-4 py-3 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors"
          title="Edit Interaksi (Kuis Pop-up)"
        >
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">Interaksi</span>
        </button>
      </div>

      {/* Video Preview */}
      {embedUrl ? (
        <div className="rounded-[24px] overflow-hidden border border-slate-200/50 dark:border-slate-700/50 bg-black aspect-video shadow-lg">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Pratinjau video"
          />
        </div>
      ) : url ? (
        <div className="rounded-[24px] overflow-hidden border border-slate-200/50 dark:border-slate-700/50 bg-slate-900 aspect-video flex items-center justify-center shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <Play className="w-8 h-8 text-white/60" />
            </div>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">
              {url.startsWith('http')
                ? videoType === 'vimeo'
                  ? 'VIMEO VIDEO'
                  : 'VIDEO EKSTERNAL'
                : 'URL TIDAK VALID'}
            </p>
          </div>
        </div>
      ) : (
        <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-[28px] bg-slate-50/30 dark:bg-slate-800/20 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl mb-3 shadow-sm">
            <Video className="w-8 h-8" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.1em]">
            Belum ada video ditambahkan
          </p>
        </div>
      )}

      {showInteractiveEditor && (
        <InteractiveVideoEditor
          metadata={(block.metadata as InteractiveVideoMetadata) || {}}
          onSave={handleSaveInteractiveMetadata}
          onClose={() => setShowInteractiveEditor(false)}
          lessonId={state.activeLesson?.id}
          blockId={blockId}
        />
      )}
    </div>
  )
}
