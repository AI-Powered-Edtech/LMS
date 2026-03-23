import { Link as LinkIcon, Play, Video } from 'lucide-react'

import { useBuilder } from '@/src/contexts/BuilderContext'
import { parseVideoUrl } from '@/src/utils/videoUtils'

interface VideoBlockEditorProps {
  blockId: string
}

export function VideoBlockEditor({ blockId }: VideoBlockEditorProps) {
  const { state, actions } = useBuilder()
  const block = state.activeLesson?.blocks.find((b) => b.id === blockId)

  if (!block) return null

  const url = block.url || ''
  const { type: videoType, embedUrl } = parseVideoUrl(url)

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="relative group">
        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input
          type="text"
          placeholder="Tempel tautan YouTube atau video di sini..."
          value={url}
          onChange={(e) => {
            actions.updateBlock(blockId, { url: e.target.value })
          }}
          onBlur={() => {
            actions.saveBlock(blockId)
          }}
          className="w-full pl-11 pr-4 py-3 border border-slate-200/60 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all bg-slate-50/50 focus:bg-white placeholder:text-slate-300 shadow-inner"
        />
      </div>

      {/* Video Preview */}
      {embedUrl ? (
        <div className="rounded-[24px] overflow-hidden border border-slate-200/50 bg-black aspect-video shadow-lg">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Pratinjau video"
          />
        </div>
      ) : url ? (
        <div className="rounded-[24px] overflow-hidden border border-slate-200/50 bg-slate-900 aspect-video flex items-center justify-center shadow-lg">
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
        <div className="py-12 border-2 border-dashed border-slate-100 rounded-[28px] bg-slate-50/30 flex flex-col items-center justify-center text-slate-300">
          <div className="p-4 bg-white rounded-2xl mb-3 shadow-sm">
            <Video className="w-8 h-8" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.1em]">
            Belum ada video ditambahkan
          </p>
        </div>
      )}
    </div>
  )
}
