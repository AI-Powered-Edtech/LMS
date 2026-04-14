/**
 * notificationFormatter — Format notification messages into human-readable Bahasa Indonesia.
 *
 * Converts raw notification type + metadata into user-facing text.
 * Handles all event types from both student/teacher and admin contexts.
 */

import type { NotificationType } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationMeta {
  /** Actor / sender display name */
  actorName?: string
  /** Course or class name */
  courseName?: string
  /** Assignment title */
  assignmentTitle?: string
  /** Quiz title */
  quizTitle?: string
  /** Score value (0–100) */
  score?: number
  /** Badge name for gamification */
  badgeName?: string
  /** Reply thread or post title */
  threadTitle?: string
  /** Any additional context string */
  context?: string
}

export interface FormattedNotification {
  /** Short title for the notification (1 line) */
  title: string
  /** Longer descriptive body message */
  body: string
  /** Aria label combining title + body for screen readers */
  ariaLabel: string
}

// ─── Label maps ───────────────────────────────────────────────────────────────

/** Icon color class per notification type for visual hints */
export const NOTIFICATION_TYPE_COLOR: Partial<Record<NotificationType, string>> = {
  grade_posted: 'text-green-500',
  grade: 'text-green-500',
  assignment_due: 'text-orange-500',
  quiz_available: 'text-purple-500',
  quiz_result: 'text-purple-500',
  announcement: 'text-blue-500',
  course_enrolled: 'text-indigo-500',
  badge_earned: 'text-yellow-500',
  discussion_reply: 'text-teal-500',
  message_received: 'text-cyan-500',
  system: 'text-slate-500',
  system_alert: 'text-yellow-500',
  invitation_accepted: 'text-green-500',
  moderation_report: 'text-red-500',
  sync_failure: 'text-orange-500',
  user_joined: 'text-blue-500',
}

/** Short type label in Bahasa Indonesia */
export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  grade_posted: 'Nilai Diposting',
  grade: 'Nilai',
  assignment_due: 'Batas Waktu Tugas',
  quiz_available: 'Kuis Tersedia',
  quiz_result: 'Hasil Kuis',
  announcement: 'Pengumuman',
  course_enrolled: 'Pendaftaran Kursus',
  badge_earned: 'Lencana Diperoleh',
  discussion_reply: 'Balasan Diskusi',
  message_received: 'Pesan Masuk',
  system: 'Sistem',
  system_alert: 'Peringatan Sistem',
  invitation_accepted: 'Undangan Diterima',
  moderation_report: 'Laporan Moderasi',
  sync_failure: 'Gagal Sinkronisasi',
  user_joined: 'Pengguna Baru',
}

// ─── Event type formatter (from telemetry / event bus) ────────────────────────

type LMSEventType =
  | 'LESSON_COMPLETED'
  | 'QUIZ_COMPLETED'
  | 'ASSIGNMENT_SUBMITTED'
  | 'CLASS_JOINED'
  | 'AI_TUTOR_INTERACTION'
  | 'INVITATION_ACCEPTED'
  | 'MODERATION_REPORT'
  | 'SYNC_FAILURE'
  | 'SYSTEM_ALERT'
  | 'USER_JOINED'

/**
 * Format a system event type into a human-readable Bahasa Indonesia notification message.
 * Used when generating notifications from the event bus.
 */
export function formatEventNotification(
  eventType: LMSEventType,
  meta: NotificationMeta = {}
): FormattedNotification {
  const { actorName, courseName, assignmentTitle, quizTitle, score, context } = meta

  switch (eventType) {
    case 'LESSON_COMPLETED':
      return {
        title: 'Pelajaran Selesai',
        body: courseName
          ? `Kamu telah menyelesaikan pelajaran di "${courseName}".`
          : 'Kamu telah menyelesaikan satu pelajaran.',
        ariaLabel: `Notifikasi: Pelajaran selesai${courseName ? ` di ${courseName}` : ''}.`,
      }

    case 'QUIZ_COMPLETED':
      return {
        title: 'Kuis Selesai',
        body: quizTitle
          ? score !== undefined
            ? `Kuis "${quizTitle}" selesai dengan nilai ${score}.`
            : `Kamu telah menyelesaikan kuis "${quizTitle}".`
          : score !== undefined
            ? `Kuis selesai dengan nilai ${score}.`
            : 'Kamu telah menyelesaikan satu kuis.',
        ariaLabel: `Notifikasi: Kuis selesai${quizTitle ? ` — ${quizTitle}` : ''}${score !== undefined ? `, nilai ${score}` : ''}.`,
      }

    case 'ASSIGNMENT_SUBMITTED':
      return {
        title: 'Tugas Dikumpulkan',
        body: assignmentTitle
          ? `Tugas "${assignmentTitle}" berhasil dikumpulkan.`
          : 'Tugas berhasil dikumpulkan.',
        ariaLabel: `Notifikasi: Tugas dikumpulkan${assignmentTitle ? ` — ${assignmentTitle}` : ''}.`,
      }

    case 'CLASS_JOINED':
      return {
        title: 'Bergabung ke Kelas',
        body: courseName
          ? `Kamu berhasil bergabung ke kelas "${courseName}".`
          : 'Kamu berhasil bergabung ke kelas baru.',
        ariaLabel: `Notifikasi: Bergabung ke kelas${courseName ? ` — ${courseName}` : ''}.`,
      }

    case 'AI_TUTOR_INTERACTION':
      return {
        title: 'Sesi AI Tutor',
        body: context ?? 'Sesi belajar dengan AI Tutor telah dimulai.',
        ariaLabel: 'Notifikasi: Sesi AI Tutor.',
      }

    case 'INVITATION_ACCEPTED':
      return {
        title: 'Undangan Diterima',
        body: actorName
          ? `${actorName} telah menerima undangan dan bergabung ke platform.`
          : 'Undangan berhasil diterima.',
        ariaLabel: `Notifikasi: Undangan diterima${actorName ? ` oleh ${actorName}` : ''}.`,
      }

    case 'MODERATION_REPORT':
      return {
        title: 'Laporan Moderasi',
        body: context ?? 'Konten baru dilaporkan untuk moderasi.',
        ariaLabel: 'Notifikasi admin: Laporan moderasi baru.',
      }

    case 'SYNC_FAILURE':
      return {
        title: 'Gagal Sinkronisasi',
        body: context ?? 'Terjadi kegagalan sinkronisasi data. Periksa log sistem.',
        ariaLabel: 'Notifikasi admin: Gagal sinkronisasi data.',
      }

    case 'SYSTEM_ALERT':
      return {
        title: 'Peringatan Sistem',
        body: context ?? 'Ada peringatan sistem yang memerlukan perhatian.',
        ariaLabel: 'Notifikasi admin: Peringatan sistem.',
      }

    case 'USER_JOINED':
      return {
        title: 'Pengguna Baru Bergabung',
        body: actorName
          ? `${actorName} baru saja bergabung ke platform.`
          : 'Pengguna baru bergabung ke platform.',
        ariaLabel: `Notifikasi admin: Pengguna baru bergabung${actorName ? ` — ${actorName}` : ''}.`,
      }

    default:
      return {
        title: 'Notifikasi',
        body: context ?? 'Anda memiliki notifikasi baru.',
        ariaLabel: 'Notifikasi baru.',
      }
  }
}

/**
 * Format a stored Notification record type into a human-readable message.
 * Used in NotificationCenter / NotificationPanel for display.
 */
export function formatNotificationMessage(
  type: NotificationType,
  title: string,
  message: string,
  meta: NotificationMeta = {}
): FormattedNotification {
  // If both title and message are already meaningful, use them directly
  if (title && message) {
    return {
      title,
      body: message,
      ariaLabel: `${title}: ${message}`,
    }
  }

  // Fallback: generate from type
  const { actorName, courseName, assignmentTitle, quizTitle, score, badgeName, threadTitle } = meta

  switch (type) {
    case 'grade_posted':
    case 'grade':
      return {
        title: title || 'Nilai Diposting',
        body:
          message ||
          (score !== undefined
            ? `Nilai kamu${courseName ? ` untuk ${courseName}` : ''} adalah ${score}.`
            : `Nilai baru telah diposting${courseName ? ` untuk ${courseName}` : ''}.`),
        ariaLabel: `Nilai diposting${courseName ? ` — ${courseName}` : ''}`,
      }

    case 'assignment_due':
      return {
        title: title || 'Pengingat Tugas',
        body:
          message ||
          (assignmentTitle
            ? `Tugas "${assignmentTitle}" segera jatuh tempo.`
            : 'Ada tugas yang segera jatuh tempo.'),
        ariaLabel: `Pengingat tugas${assignmentTitle ? ` — ${assignmentTitle}` : ''}`,
      }

    case 'quiz_available':
      return {
        title: title || 'Kuis Tersedia',
        body:
          message ||
          (quizTitle
            ? `Kuis "${quizTitle}" sudah bisa dikerjakan.`
            : 'Kuis baru tersedia untuk dikerjakan.'),
        ariaLabel: `Kuis tersedia${quizTitle ? ` — ${quizTitle}` : ''}`,
      }

    case 'quiz_result':
      return {
        title: title || 'Hasil Kuis',
        body:
          message ||
          (score !== undefined
            ? `Nilai kuis${quizTitle ? ` "${quizTitle}"` : ''} kamu adalah ${score}.`
            : `Hasil kuis${quizTitle ? ` "${quizTitle}"` : ''} sudah tersedia.`),
        ariaLabel: `Hasil kuis${quizTitle ? ` — ${quizTitle}` : ''}`,
      }

    case 'announcement':
      return {
        title: title || 'Pengumuman',
        body: message || 'Ada pengumuman baru dari sekolah.',
        ariaLabel: `Pengumuman: ${title || 'baru'}`,
      }

    case 'course_enrolled':
      return {
        title: title || 'Terdaftar di Kursus',
        body:
          message ||
          (courseName
            ? `Kamu berhasil terdaftar di kursus "${courseName}".`
            : 'Kamu berhasil terdaftar di kursus baru.'),
        ariaLabel: `Terdaftar di kursus${courseName ? ` — ${courseName}` : ''}`,
      }

    case 'badge_earned':
      return {
        title: title || 'Lencana Baru',
        body:
          message ||
          (badgeName
            ? `Selamat! Kamu mendapatkan lencana "${badgeName}".`
            : 'Selamat! Kamu mendapatkan lencana baru.'),
        ariaLabel: `Lencana diperoleh${badgeName ? ` — ${badgeName}` : ''}`,
      }

    case 'discussion_reply':
      return {
        title: title || 'Balasan Baru',
        body:
          message ||
          (actorName
            ? `${actorName} membalas diskusi${threadTitle ? ` "${threadTitle}"` : ''}.`
            : `Ada balasan baru di diskusi${threadTitle ? ` "${threadTitle}"` : ''}.`),
        ariaLabel: `Balasan diskusi${threadTitle ? ` — ${threadTitle}` : ''}`,
      }

    case 'message_received':
      return {
        title: title || 'Pesan Baru',
        body:
          message ||
          (actorName ? `${actorName} mengirimkan pesan kepada Anda.` : 'Anda menerima pesan baru.'),
        ariaLabel: `Pesan baru${actorName ? ` dari ${actorName}` : ''}`,
      }

    case 'system':
    case 'system_alert':
      return {
        title: title || 'Informasi Sistem',
        body: message || 'Ada pembaruan sistem.',
        ariaLabel: `Sistem: ${title || 'informasi baru'}`,
      }

    case 'invitation_accepted':
      return {
        title: title || 'Undangan Diterima',
        body:
          message ||
          (actorName ? `${actorName} menerima undangan bergabung.` : 'Undangan berhasil diterima.'),
        ariaLabel: `Undangan diterima${actorName ? ` oleh ${actorName}` : ''}`,
      }

    case 'moderation_report':
      return {
        title: title || 'Laporan Moderasi',
        body: message || 'Ada konten yang dilaporkan untuk moderasi.',
        ariaLabel: 'Laporan moderasi baru',
      }

    case 'sync_failure':
      return {
        title: title || 'Gagal Sinkronisasi',
        body: message || 'Terjadi kegagalan sinkronisasi. Periksa log sistem.',
        ariaLabel: 'Gagal sinkronisasi data',
      }

    case 'user_joined':
      return {
        title: title || 'Pengguna Baru',
        body:
          message ||
          (actorName
            ? `${actorName} baru bergabung ke platform.`
            : 'Pengguna baru bergabung ke platform.'),
        ariaLabel: `Pengguna baru bergabung${actorName ? ` — ${actorName}` : ''}`,
      }

    default:
      return {
        title: title || 'Notifikasi',
        body: message || 'Anda memiliki notifikasi baru.',
        ariaLabel: title || 'Notifikasi baru',
      }
  }
}

// ─── Date group helpers ───────────────────────────────────────────────────────

export type DateGroup = 'Hari Ini' | 'Kemarin' | 'Minggu Lalu' | 'Lebih Lama'

/**
 * Returns the date group label for a given ISO date string.
 */
export function getDateGroup(dateStr: string): DateGroup {
  const now = new Date()
  const date = new Date(dateStr)

  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Same calendar day
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return 'Hari Ini'
  }

  if (diffDays === 1) return 'Kemarin'
  if (diffDays <= 7) return 'Minggu Lalu'
  return 'Lebih Lama'
}

/**
 * Relative time label in Bahasa Indonesia.
 */
export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days === 1) return 'kemarin'
  return `${days} hari lalu`
}
