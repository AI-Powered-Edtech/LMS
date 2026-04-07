/**
 * builderSyncService — Service untuk sinkronisasi state builder ke server.
 *
 * Sebelumnya logic ini berada inline di BuilderContext.tsx (lines 143-190)
 * sebagai callback yang di-pass ke useBuilderOffline(). Memindahkan logic
 * ini ke service layer:
 * - Memisahkan business logic dari state orchestration
 * - Memudahkan testing individual sync steps
 * - Konsisten dengan pola service layer di fitur lain
 *
 * Dipanggil oleh: BuilderContext.tsx (via useBuilderOffline callback)
 */

import type { BuilderState } from '@/features/course-builder'

import { courseService } from '../../courses/api/courseService'
import { builderBlockService } from './blockService'
import { builderLessonService } from './lessonService'
import { builderModuleService } from './moduleService'

export interface BuilderSyncResult {
  success: boolean
  error?: unknown
}

/**
 * Sinkronisasi seluruh state builder ke server Supabase.
 *
 * Urutan sync:
 * 1. Metadata kursus (title, description)
 * 2. Semua module titles (allSettled — individual failure tidak stop sync)
 * 3. Semua lesson data (allSettled)
 * 4. Block data untuk active lesson (allSettled)
 * 5. Block data untuk semua lesson yang diedit offline lalu ditutup (pendingBlocksByLesson)
 */
export async function syncBuilderToServer(
  state: BuilderState,
  tenantId: string
): Promise<BuilderSyncResult> {
  if (!state.courseId) {
    return { success: false, error: new Error('courseId is required for sync') }
  }

  try {
    // 1. Sync course metadata
    await courseService.updateCourse(
      state.courseId,
      { title: state.courseTitle, description: state.courseDescription },
      tenantId
    )

    // 2. Sync module titles (existing modules yang diedit offline)
    await Promise.allSettled(
      state.modules.map((mod) =>
        builderModuleService.updateModule(mod.id, tenantId, { title: mod.title })
      )
    )

    // 3. Sync lesson data (existing lessons yang diedit offline)
    await Promise.allSettled(
      state.modules.flatMap((mod) =>
        mod.lessons.map((lesson) =>
          builderLessonService.updateLesson(lesson.id, tenantId, {
            title: lesson.title,
            isPublished: lesson.isPublished,
            durationMinutes: lesson.durationMinutes,
          })
        )
      )
    )

    // 4. Sync block data untuk active lesson (jika ada)
    if (state.activeLesson) {
      await Promise.allSettled(
        state.activeLesson.blocks.map((block) =>
          builderBlockService.updateBlock(block.id, tenantId, {
            title: block.title,
            content: block.content,
            url: block.url,
            metadata: block.metadata,
          })
        )
      )
    }

    // 5. Sync blocks untuk lesson yang diedit offline lalu ditutup (pendingBlocksByLesson)
    const pendingEntries = Object.entries(state.pendingBlocksByLesson)
    if (pendingEntries.length > 0) {
      const pendingResults = await Promise.allSettled(
        pendingEntries.flatMap(([_lessonId, blocks]) =>
          blocks.map((block) =>
            builderBlockService.updateBlock(block.id, tenantId, {
              title: block.title,
              content: block.content,
              url: block.url,
              metadata: block.metadata,
            })
          )
        )
      )

      // Log failures in dev mode for observability
      if (import.meta.env.DEV) {
        pendingResults.forEach((result, idx) => {
          if (result.status === 'rejected') {
            console.warn(
              `[syncBuilderToServer] pendingBlock sync failed at index ${idx}:`,
              result.reason
            )
          }
        })
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}
