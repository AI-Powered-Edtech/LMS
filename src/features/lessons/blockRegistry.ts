import {
  Calendar,
  File,
  FileText,
  HelpCircle,
  Image,
  Layers,
  ListOrdered,
  Move,
  Package,
  PenLine,
  Target,
  Type,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";

export interface BlockDefinition {
  /** Indonesian UI label shown in builder menus */
  label: string;
  /** Lucide icon component */
  icon: ComponentType<{ className?: string }>;
  /** Tailwind classes for the block card accent in the builder */
  color: string;
  /** Whether this block type stores a URL (video, image, file) */
  hasUrl: boolean;
  /** How lesson progress is tracked for this block type */
  completionRule: "scroll" | "watch" | "submit" | "view" | "interact";
  /** Optional description shown in builder picker */
  description?: string;
  /** Whether this block is an interactive activity */
  isInteractive?: boolean;
}

export const BLOCK_REGISTRY = {
  text: {
    label: "Teks",
    icon: Type,
    color:
      "text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    hasUrl: false,
    completionRule: "scroll",
  },
  video: {
    label: "Video",
    icon: Video,
    color:
      "text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800",
    hasUrl: true,
    completionRule: "watch",
  },
  image: {
    label: "Gambar",
    icon: Image,
    color:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800",
    hasUrl: true,
    completionRule: "view",
  },
  file: {
    label: "File",
    icon: File,
    color:
      "text-orange-600 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800",
    hasUrl: true,
    completionRule: "view",
  },
  quiz: {
    label: "Kuis",
    icon: HelpCircle,
    color:
      "text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800",
    hasUrl: false,
    completionRule: "submit",
  },
  assignment: {
    label: "Tugas",
    icon: FileText,
    color:
      "text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800",
    hasUrl: false,
    completionRule: "submit",
  },
  scorm: {
    label: "SCORM",
    icon: Package,
    color:
      "text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800",
    hasUrl: false,
    completionRule: "submit",
  },
  flashcard: {
    label: "Kartu Flash",
    icon: Layers,
    color:
      "text-cyan-600 dark:text-cyan-400 bg-cyan-50/30 dark:bg-cyan-900/30 border-cyan-100 dark:border-cyan-800",
    hasUrl: false,
    completionRule: "interact",
    description: "Kartu bolak-balik untuk membantu menghafal",
    isInteractive: true,
  },
  drag_drop: {
    label: "Seret & Cocokkan",
    icon: Move,
    color:
      "text-teal-600 dark:text-teal-400 bg-teal-50/30 dark:bg-teal-900/30 border-teal-100 dark:border-teal-800",
    hasUrl: false,
    completionRule: "submit",
    description: "Cocokkan item ke kategori yang tepat",
    isInteractive: true,
  },
  hotspot: {
    label: "Hotspot Gambar",
    icon: Target,
    color:
      "text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800",
    hasUrl: true,
    completionRule: "interact",
    description: "Klik area pada gambar untuk menjelajahi informasi",
    isInteractive: true,
  },
  timeline: {
    label: "Linimasa",
    icon: Calendar,
    color:
      "text-violet-600 dark:text-violet-400 bg-violet-50/30 dark:bg-violet-900/30 border-violet-100 dark:border-violet-800",
    hasUrl: false,
    completionRule: "scroll",
    description: "Rangkaian peristiwa dalam urutan kronologis",
    isInteractive: true,
  },
  sorting: {
    label: "Urutkan",
    icon: ListOrdered,
    color:
      "text-lime-600 dark:text-lime-400 bg-lime-50/30 dark:bg-lime-900/30 border-lime-100 dark:border-lime-800",
    hasUrl: false,
    completionRule: "submit",
    description: "Susun item ke urutan yang benar",
    isInteractive: true,
  },
  fill_blank: {
    label: "Isi Titik-Titik",
    icon: PenLine,
    color:
      "text-pink-600 dark:text-pink-400 bg-pink-50/30 dark:bg-pink-900/30 border-pink-100 dark:border-pink-800",
    hasUrl: false,
    completionRule: "submit",
    description: "Lengkapi kalimat dengan kata yang tepat",
    isInteractive: true,
  },
} as const satisfies Record<string, BlockDefinition>;

export type BlockType = keyof typeof BLOCK_REGISTRY;
export const isValidBlockType = (type: string): type is BlockType =>
  type in BLOCK_REGISTRY;
