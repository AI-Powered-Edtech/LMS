import { describe, expect, it } from 'vitest'

import type { Discussion } from '@/features/discussions/api/discussionService'

import { buildForumPosts, checkProfanity, mapToPost, timeAgo } from '../forumUtils'

describe('forumUtils', () => {
  describe('timeAgo', () => {
    it('returns "Baru saja" for less than 60 seconds', () => {
      const now = new Date()
      now.setSeconds(now.getSeconds() - 30)
      expect(timeAgo(now.toISOString())).toBe('Baru saja')
    })

    it('returns minutes for less than 1 hour', () => {
      const now = new Date()
      now.setMinutes(now.getMinutes() - 5)
      expect(timeAgo(now.toISOString())).toBe('5 menit yang lalu')
    })

    it('returns hours for less than 24 hours', () => {
      const now = new Date()
      now.setHours(now.getHours() - 3)
      expect(timeAgo(now.toISOString())).toBe('3 jam yang lalu')
    })

    it('returns days for 24 hours or more', () => {
      const now = new Date()
      now.setDate(now.getDate() - 2)
      expect(timeAgo(now.toISOString())).toBe('2 hari yang lalu')
    })
  })

  describe('checkProfanity', () => {
    it('should return false for clean text', () => {
      expect(checkProfanity('Halo, apa kabar?')).toBe(false)
      expect(checkProfanity('Ini adalah diskusi yang sehat.')).toBe(false)
    })

    it('returns false if text does not contain profanity', () => {
      expect(checkProfanity('Ini sangat bagus')).toBe(false)
      expect(checkProfanity('Halo semuanya')).toBe(false)
    })

    it('should return true for text containing exact bad words', () => {
      expect(checkProfanity('dasar bodoh')).toBe(true)
      expect(checkProfanity('kamu goblok ya')).toBe(true)
      expect(checkProfanity('tolol sekali')).toBe(true)
      expect(checkProfanity('anjing kamu')).toBe(true)
    })

    it('returns true if text contains profanity', () => {
      expect(checkProfanity('Ini bodoh sekali')).toBe(true)
      expect(checkProfanity('Dasar Goblok')).toBe(true)
      expect(checkProfanity('Anjing menggonggong')).toBe(true)
    })

    it('should return true for text containing bad words in mixed case', () => {
      expect(checkProfanity('BoDoh')).toBe(true)
      expect(checkProfanity('Goblok')).toBe(true)
      expect(checkProfanity('TOLOL')).toBe(true)
      expect(checkProfanity('anJing')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(checkProfanity('bOdOh')).toBe(true)
    })

    it('should return true for text containing bad words within other words', () => {
      expect(checkProfanity('kebodohan')).toBe(true)
      expect(checkProfanity('kegoblokan')).toBe(true)
      expect(checkProfanity('ketololan')).toBe(true)
      expect(checkProfanity('menganjingkan')).toBe(true)
    })
  })

  describe('mapToPost', () => {
    const baseDiscussion: Discussion = {
      id: 'post-1',
      tenant_id: 'tenant-1',
      author_id: 'author-1',
      content: 'This is a test post',
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      title: 'Test Post',
      category: 'Umum',
      tags: ['test'],
      is_anonymous: false,
      upvotes: 10,
      author: {
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    }

    it('maps a discussion with all fields correctly', () => {
      const post = mapToPost(baseDiscussion, {})

      expect(post).toEqual({
        id: 'post-1',
        author: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
        role: 'Siswa',
        points: 0,
        badges: [],
        time: 'Baru saja',
        title: 'Test Post',
        content: 'This is a test post',
        category: 'Umum',
        tags: ['test'],
        upvotes: 10,
        isAnonymous: false,
        bestAnswerId: undefined,
        comments: [],
      })
    })

    it('handles missing optional fields', () => {
      const partialDiscussion: Discussion = {
        id: 'post-2',
        tenant_id: 'tenant-1',
        author_id: 'author-2',
        content: 'No title or category',
        is_pinned: false,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const post = mapToPost(partialDiscussion, {})

      expect(post.title).toBe('(Tanpa judul)')
      expect(post.category).toBe('Umum')
      expect(post.tags).toEqual([])
      expect(post.upvotes).toBe(0)
      expect(post.author).toBe('Pengguna')
      expect(post.avatar).toBe('https://api.dicebear.com/7.x/avataaars/svg?seed=author-2')
    })

    it('handles anonymous author', () => {
      const anonDiscussion = { ...baseDiscussion, is_anonymous: true }
      const post = mapToPost(anonDiscussion, {})

      expect(post.author).toBe('Anonim')
      expect(post.avatar).toBe('https://api.dicebear.com/7.x/avataaars/svg?seed=Anon')
      expect(post.isAnonymous).toBe(true)
    })

    it('maps comments and sorts them correctly (best answer first, then upvotes)', () => {
      const replies: Discussion[] = [
        {
          id: 'reply-1',
          tenant_id: 'tenant-1',
          parent_id: 'post-1',
          author_id: 'author-2',
          content: 'Reply 1',
          is_pinned: false,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          upvotes: 2,
        },
        {
          id: 'reply-2',
          tenant_id: 'tenant-1',
          parent_id: 'post-1',
          author_id: 'author-3',
          content: 'Reply 2 (Best)',
          is_pinned: false,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          upvotes: 1,
          is_best_answer: true,
        },
        {
          id: 'reply-3',
          tenant_id: 'tenant-1',
          parent_id: 'post-1',
          author_id: 'author-4',
          content: 'Reply 3',
          is_pinned: false,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          upvotes: 5,
        },
      ]

      const post = mapToPost(baseDiscussion, { 'post-1': replies })

      expect(post.bestAnswerId).toBe('reply-2')
      expect(post.comments).toHaveLength(3)

      // Expected order:
      // 1. reply-2 (best answer)
      // 2. reply-3 (5 upvotes)
      // 3. reply-1 (2 upvotes)
      expect(post.comments[0].id).toBe('reply-2')
      expect(post.comments[0].isBestAnswer).toBe(true)

      expect(post.comments[1].id).toBe('reply-3')
      expect(post.comments[1].upvotes).toBe(5)

      expect(post.comments[2].id).toBe('reply-1')
      expect(post.comments[2].upvotes).toBe(2)
    })
  })

  describe('buildForumPosts', () => {
    it('builds forum posts from raw discussions separating top level and replies', () => {
      const discussions: Discussion[] = [
        {
          id: 'post-1',
          tenant_id: 'tenant-1',
          author_id: 'author-1',
          content: 'Top level post',
          is_pinned: false,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: 'Title 1',
        },
        {
          id: 'reply-1',
          tenant_id: 'tenant-1',
          parent_id: 'post-1',
          author_id: 'author-2',
          content: 'Reply to post 1',
          is_pinned: false,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'post-2',
          tenant_id: 'tenant-1',
          author_id: 'author-3',
          content: 'Another top level post',
          is_pinned: false,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: 'Title 2',
        },
      ]

      const posts = buildForumPosts(discussions)

      expect(posts).toHaveLength(2)

      const post1 = posts.find((p) => p.id === 'post-1')
      expect(post1).toBeDefined()
      expect(post1?.comments).toHaveLength(1)
      expect(post1?.comments[0].id).toBe('reply-1')

      const post2 = posts.find((p) => p.id === 'post-2')
      expect(post2).toBeDefined()
      expect(post2?.comments).toHaveLength(0)
    })
  })
})
