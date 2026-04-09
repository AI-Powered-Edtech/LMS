import {
  BookOpen,
  FileText,
  History,
  LayoutList,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { useBuilder } from '@/contexts/BuilderContext'
import { cn } from '@/utils/cn'

import { useBuilderAICopilotStore } from '../store/builderAICopilot.store'
import type { CopilotTab } from '../types'

import { AssessmentTab } from './AssessmentTab'
import { HistoryTab } from './HistoryTab'
import { ImproveTab } from './ImproveTab'
import { LessonDraftTab } from './LessonDraftTab'
import { OutlineTab } from './OutlineTab'

interface TabConfig {
  id: CopilotTab
  label: string
  icon: typeof Sparkles
  requiresLesson: boolean
  requiresBlock: boolean
}

const TABS: TabConfig[] = [
  { id: 'outline', label: 'Kerangka', icon: LayoutList, requiresLesson: false, requiresBlock: false },
  { id: 'lesson_draft', label: 'Draft', icon: FileText, requiresLesson: true, requiresBlock: false },
  { id: 'assessment', label: 'Asesmen', icon: BookOpen, requiresLesson: true, requiresBlock: false },
  { id: 'improve', label: 'Perbaiki', icon: Wand2, requiresLesson: true, requiresBlock: false },
  { id: 'history', label: 'Riwayat', icon: History, requiresLesson: false, requiresBlock: false },
]

interface CourseBuilderAICopilotDrawerProps {
  onClose: () => void
}

export function CourseBuilderAICopilotDrawer({ onClose }: CourseBuilderAICopilotDrawerProps) {
  const { state, mobile } = useBuilder()
  const { activeTab, setActiveTab } = useBuilderAICopilotStore()

  const hasActiveLesson = !!state.activeLesson

  const isTabAvailable = (tab: TabConfig): boolean => {
    if (tab.requiresLesson && !hasActiveLesson) return false
    return true
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'outline':
        return <OutlineTab />
      case 'lesson_draft':
        return <LessonDraftTab />
      case 'assessment':
        return <AssessmentTab />
      case 'improve':
        return <ImproveTab />
      case 'history':
        return <HistoryTab />
      default:
        return <OutlineTab />
    }
  }

  // Mobile: full-screen overlay
  if (mobile.isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex"
        >
          <div
            role="presentation"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="complementary"
            aria-label="Asisten AI Kursus"
            className="relative z-10 ml-auto w-full max-w-md h-full bg-white dark:bg-slate-900 flex flex-col shadow-2xl"
          >
            <DrawerHeader onClose={onClose} />
            <TabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isTabAvailable={isTabAvailable}
            />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {renderTabContent()}
            </div>
          </motion.aside>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Desktop: right-side panel
  return (
    <aside
      role="complementary"
      aria-label="Asisten AI Kursus"
      className="w-96 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200/60 dark:border-slate-800/60 flex flex-col h-full animate-in slide-in-from-right duration-200"
    >
      <DrawerHeader onClose={onClose} />
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isTabAvailable={isTabAvailable}
      />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {renderTabContent()}
      </div>
    </aside>
  )
}

// ─── Drawer Header ────────────────────────────────────────────────────────────

function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Asisten AI</h2>
          <p className="text-[10px] text-slate-400 font-medium">Copilot Pembuat Kursus</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        aria-label="Tutup Asisten AI"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
  activeTab,
  onTabChange,
  isTabAvailable,
}: {
  activeTab: CopilotTab
  onTabChange: (tab: CopilotTab) => void
  isTabAvailable: (tab: TabConfig) => boolean
}) {
  return (
    <div
      role="tablist"
      aria-label="Tab Asisten AI"
      className="flex border-b border-slate-200/60 dark:border-slate-800/60 px-2 shrink-0 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const available = isTabAvailable(tab)
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={!available}
            onClick={() => available && onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap',
              isActive
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : available
                  ? 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  : 'border-transparent text-slate-300 dark:text-slate-600 cursor-not-allowed'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
