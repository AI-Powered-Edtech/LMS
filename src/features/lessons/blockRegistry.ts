import type { ComponentType } from 'react'
import { Type, Video, Image, File, HelpCircle, FileText } from 'lucide-react'

export interface BlockDefinition {
  /** Indonesian UI label shown in builder menus */
  label: string
  /** Lucide icon component */
  icon: ComponentType<{ className?: string }>
  /** Tailwind classes for the block card accent in the builder */
  color: string
  /** Whether this block type stores a URL (video, image, file) */
  hasUrl: boolean
  /** How lesson progress is tracked for this block type */
  completionRule: 'scroll' | 'watch' | 'submit' | 'view'
}

export const BLOCK_REGISTRY = {
  text: {
    label: 'Teks',
    icon: Type,
    color: 'text-slate-700 bg-white border-slate-200',
    hasUrl: false,
    completionRule: 'scroll',
  },
  video: {
    label: 'Video',
    icon: Video,
    color: 'text-blue-600 bg-blue-50/30 border-blue-100',
    hasUrl: true,
    completionRule: 'watch',
  },
  image: {
    label: 'Gambar',
    icon: Image,
    color: 'text-emerald-600 bg-emerald-50/30 border-emerald-100',
    hasUrl: true,
    completionRule: 'view',
  },
  file: {
    label: 'File',
    icon: File,
    color: 'text-orange-600 bg-orange-50/30 border-orange-100',
    hasUrl: true,
    completionRule: 'view',
  },
  quiz: {
    label: 'Kuis',
    icon: HelpCircle,
    color: 'text-rose-600 bg-rose-50/30 border-rose-100',
    hasUrl: false,
    completionRule: 'submit',
  },
  assignment: {
    label: 'Tugas',
    icon: FileText,
    color: 'text-indigo-600 bg-indigo-50/30 border-indigo-100',
    hasUrl: false,
    completionRule: 'submit',
  },
} as const satisfies Record<string, BlockDefinition>

export type BlockType = keyof typeof BLOCK_REGISTRY
export const isValidBlockType = (type: string): type is BlockType => type in BLOCK_REGISTRY
