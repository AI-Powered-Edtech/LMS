import { File, FileText, HelpCircle, Image, Package, Type, Video } from 'lucide-react'
import type { ComponentType } from 'react'

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
    color: 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    hasUrl: false,
    completionRule: 'scroll',
  },
  video: {
    label: 'Video',
    icon: Video,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800',
    hasUrl: true,
    completionRule: 'watch',
  },
  image: {
    label: 'Gambar',
    icon: Image,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800',
    hasUrl: true,
    completionRule: 'view',
  },
  file: {
    label: 'File',
    icon: File,
    color: 'text-orange-600 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800',
    hasUrl: true,
    completionRule: 'view',
  },
  quiz: {
    label: 'Kuis',
    icon: HelpCircle,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800',
    hasUrl: false,
    completionRule: 'submit',
  },
  assignment: {
    label: 'Tugas',
    icon: FileText,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800',
    hasUrl: false,
    completionRule: 'submit',
  },
  scorm: {
    label: 'SCORM',
    icon: Package,
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800',
    hasUrl: false,
    completionRule: 'submit',
  },
} as const satisfies Record<string, BlockDefinition>

export type BlockType = keyof typeof BLOCK_REGISTRY
export const isValidBlockType = (type: string): type is BlockType => type in BLOCK_REGISTRY
