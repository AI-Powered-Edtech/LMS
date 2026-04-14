import { api } from "@/src/lib/api"
import type { Discussion } from '@/src/features/discussions/api/discussionService'
import type { ForumPost } from '@/src/features/discussions/types/forum'

export const FORUM_CATEGORIES = [
  'Semua',
  'Matematika',
  'Fisika',
  'Kimia',
  'Biologi',
  'Pemrograman',
  'Umum',
] as const

/** Human-readable relative time in Bahasa Indonesia */
export function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'Baru saja'
  if (s < 3600) return `${Math.floor(s / 60)} menit yang lalu`
  if (s < 86400) return `${Math.floor(s / 3600)} jam yang lalu`
  return `${Math.floor(s / 86400)} hari yang lalu`
}

/** Simple profanity check for Bahasa Indonesia */
export function checkProfanity(text: string): boolean {
  const badWords = ['bodoh', 'goblok', 'tolol', 'anjing']
  return badWords.some((word) => text.toLowerCase().includes(word))
}

/** Map a raw Discussion record + its replies into a ForumPost view-model */
export function mapToPost(d: Discussion, repliesMap: Record<string, Discussion[]>): ForumPost {
  const isAnon = d.is_anonymous ?? false
  const replies = (repliesMap[d.id] ?? []).sort(
    (a, b) =>
      (b.is_best_answer ? 1 : 0) - (a.is_best_answer ? 1 : 0) || (b.upvotes ?? 0) - (a.upvotes ?? 0)
  )
  const bestReply = replies.find((r) => r.is_best_answer)

  return {
    id: d.id,
    author: isAnon ? 'Anonim' : (d.author?.full_name ?? 'Pengguna'),
    avatar: isAnon
      ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anon'
      : (d.author?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.author_id}`),
    role: 'Siswa',
    points: 0,
    badges: [],
    time: timeAgo(d.created_at),
    title: d.title ?? '(Tanpa judul)',
    content: d.content,
    category: d.category ?? 'Umum',
    tags: d.tags ?? [],
    upvotes: d.upvotes ?? 0,
    isAnonymous: isAnon,
    bestAnswerId: bestReply?.id,
    comments: replies.map((r) => ({
      id: r.id,
      author: r.is_anonymous ? 'Anonim' : (r.author?.full_name ?? 'Pengguna'),
      avatar:
        r.author?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.author_id}`,
      role: 'Siswa',
      points: 0,
      badges: [],
      content: r.content,
      upvotes: r.upvotes ?? 0,
      time: timeAgo(r.created_at),
      isBestAnswer: r.is_best_answer ?? false,
    })),
  }
}

/** Build posts from raw discussions: separate top-level from replies, then map */
export function buildForumPosts(rawDiscussions: Discussion[]): ForumPost[] {
  const topLevel = rawDiscussions.filter((d) => !d.parent_id)
  const repliesMap: Record<string, Discussion[]> = {}
  rawDiscussions
    .filter((d) => !!d.parent_id)
    .forEach((r) => {
      const pid = r.parent_id!
      if (!repliesMap[pid]) repliesMap[pid] = []
      repliesMap[pid].push(r)
    })
  return topLevel.map((d) => mapToPost(d, repliesMap))
}
