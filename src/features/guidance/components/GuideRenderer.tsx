import { AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { useApplicableGuides, useRecordInteraction } from '../queries/useGuidanceQueries'
import type { ApplicableGuide } from '../types'
import { BannerGuide } from './BannerGuide'
import { CheckpointGuide } from './CheckpointGuide'
import { TooltipGuide } from './TooltipGuide'
import { WalkthroughGuide } from './WalkthroughGuide'

interface Props {
  targetType: 'lesson' | 'course' | 'quiz'
  targetId: string
}

const SESSION_KEY = (guideId: string) => `guide_dismissed_${guideId}`

function getNextGuide(guides: ApplicableGuide[]): ApplicableGuide | null {
  // Find highest-priority guide not yet dismissed this session or permanently
  for (const guide of guides) {
    if (
      !sessionStorage.getItem(SESSION_KEY(guide.id)) &&
      !localStorage.getItem(SESSION_KEY(guide.id))
    ) {
      return guide
    }
  }
  return null
}

export function GuideRenderer({ targetType, targetId }: Props) {
  const { data: guides = [] } = useApplicableGuides(targetType, targetId)
  const { mutate: recordInteraction } = useRecordInteraction()

  const [activeGuide, setActiveGuide] = useState<ApplicableGuide | null>(null)
  const shownRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Idle detection for on_idle trigger
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleGuideRef = useRef<ApplicableGuide | null>(null)

  const showGuide = (guide: ApplicableGuide) => {
    if (
      sessionStorage.getItem(SESSION_KEY(guide.id)) ||
      localStorage.getItem(SESSION_KEY(guide.id))
    )
      return
    setActiveGuide(guide)
    shownRef.current = true
    recordInteraction({ guideId: guide.id, action: 'viewed' })
  }

  const handleDismiss = () => {
    if (activeGuide) {
      sessionStorage.setItem(SESSION_KEY(activeGuide.id), '1')
      localStorage.setItem(SESSION_KEY(activeGuide.id), '1') // Persist dismissal across sessions
      recordInteraction({ guideId: activeGuide.id, action: 'dismissed' })
    }
    setActiveGuide(null)
    shownRef.current = false
  }

  const handleComplete = () => {
    if (activeGuide) {
      sessionStorage.setItem(SESSION_KEY(activeGuide.id), '1')
      localStorage.setItem(SESSION_KEY(activeGuide.id), '1') // Persist completion across sessions
      recordInteraction({ guideId: activeGuide.id, action: 'completed' })
    }
    setActiveGuide(null)
    shownRef.current = false
  }

  useEffect(() => {
    if (guides.length === 0 || shownRef.current) return

    const guide = getNextGuide(guides)
    if (!guide) return

    if (guide.trigger_type === 'on_enter') {
      shownRef.current = true
      showGuide(guide)
    } else if (guide.trigger_type === 'after_seconds') {
      shownRef.current = true
      timerRef.current = setTimeout(
        () => {
          showGuide(guide)
        },
        (guide.trigger_value || 30) * 1000
      )
    } else if (guide.trigger_type === 'on_idle') {
      idleGuideRef.current = guide
      const resetIdle = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        idleTimerRef.current = setTimeout(
          () => {
            if (!shownRef.current && idleGuideRef.current) {
              shownRef.current = true
              showGuide(idleGuideRef.current)
            }
          },
          (guide.trigger_value || 60) * 1000
        )
      }
      resetIdle()
      window.addEventListener('mousemove', resetIdle)
      window.addEventListener('keydown', resetIdle)
      return () => {
        window.removeEventListener('mousemove', resetIdle)
        window.removeEventListener('keydown', resetIdle)
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      }
    }
    // on_struggle: server-side filtered by engagement_segment='at_risk' or struggle_score>=3
    // If guide is returned, it means the student qualifies — show on_enter
    else if (guide.trigger_type === 'on_struggle') {
      shownRef.current = true
      showGuide(guide)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guides])

  if (!activeGuide) return null

  return (
    <div className="my-3">
      <AnimatePresence>
        {activeGuide.guide_type === 'banner' && (
          <BannerGuide key={activeGuide.id} guide={activeGuide} onDismiss={handleDismiss} />
        )}
        {activeGuide.guide_type === 'tooltip' && (
          <TooltipGuide key={activeGuide.id} guide={activeGuide} onDismiss={handleDismiss} />
        )}
        {activeGuide.guide_type === 'walkthrough' && (
          <WalkthroughGuide
            key={activeGuide.id}
            guide={activeGuide}
            onDismiss={handleDismiss}
            onComplete={handleComplete}
          />
        )}
        {activeGuide.guide_type === 'checkpoint' && (
          <CheckpointGuide
            key={activeGuide.id}
            guide={activeGuide}
            onDismiss={handleDismiss}
            onComplete={handleComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
