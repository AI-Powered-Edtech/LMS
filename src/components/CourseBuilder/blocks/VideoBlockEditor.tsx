import { useBuilder } from '@/src/contexts/BuilderContext';
import { Link as LinkIcon, Play } from 'lucide-react';
import { cn } from '@/src/utils/cn';

interface VideoBlockEditorProps {
    blockId: string;
}

export function VideoBlockEditor({ blockId }: VideoBlockEditorProps) {
    const { state, actions } = useBuilder();
    const block = state.activeLesson?.blocks.find(b => b.id === blockId);

    if (!block) return null;

    const url = block.url || '';
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

    const getYoutubeEmbedUrl = (rawUrl: string): string | null => {
        try {
            const urlObj = new URL(rawUrl);
            let videoId = '';
            if (urlObj.hostname.includes('youtube.com')) {
                videoId = urlObj.searchParams.get('v') || '';
            } else if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        } catch {
            return null;
        }
    };

    const embedUrl = isYoutube ? getYoutubeEmbedUrl(url) : null;

    return (
        <div className="space-y-3">
            {/* URL Input */}
            <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Paste YouTube or video URL..."
                    value={url}
                    onChange={(e) => {
                        actions.updateBlock(blockId, { url: e.target.value });
                    }}
                    onBlur={() => {
                        actions.saveBlock(blockId);
                    }}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all bg-white"
                />
            </div>

            {/* Video Preview */}
            {embedUrl ? (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-black aspect-video">
                    <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Video preview"
                    />
                </div>
            ) : url ? (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                    <div className="text-center">
                        <Play className="w-8 h-8 text-white/40 mx-auto mb-1" />
                        <p className="text-[10px] text-white/50 font-medium">
                            {url.startsWith('http') ? 'External video' : 'Invalid URL'}
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
