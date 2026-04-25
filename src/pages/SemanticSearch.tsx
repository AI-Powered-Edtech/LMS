import { Search, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/services/db'
import { useToast } from '@/hooks/useToast'
import { usePageTitle } from '@/hooks/usePageTitle'

interface SearchHit {
  id: string
  source_type: string
  source_id: string
  title: string | null
  snippet: string | null
  similarity: number
}

const TYPE_LABEL: Record<string, string> = {
  lesson: 'Pelajaran',
  announcement: 'Pengumuman',
  forum_post: 'Forum',
  rapor: 'Rapor',
}

export function SemanticSearch() {
  usePageTitle('Pencarian Semantik')
  const { tenantId } = useAuth()
  const { addToast } = useToast()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [isSearching, setIsSearching] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || !tenantId) return
    setIsSearching(true)
    try {
      // Real semantic search requires embedding the query first via the AI
      // proxy, then vector cosine search. Until that endpoint ships, fall back
      // to ILIKE on title + snippet — still useful, surfaces lexical matches
      // and avoids a misleading empty state.
      const { data, error } = await db
        .from('semantic_search_index')
        .select('id, source_type, source_id, title, snippet')
        .eq('tenant_id', tenantId)
        .or(`title.ilike.%${query}%,snippet.ilike.%${query}%`)
        .limit(20)

      if (error) throw error
      setResults(
        ((data ?? []) as Array<Omit<SearchHit, 'similarity'>>).map((r) => ({
          ...r,
          similarity: 0, // unknown until vector search wired
        })),
      )
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Pencarian gagal',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      })
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-500" />
          Pencarian Semantik Lintas Modul
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cari materi pelajaran, pengumuman, forum, dan rapor dengan kata kunci natural.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input
            placeholder="Contoh: limit fungsi trigonometri, atau kapan SPP April?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            icon={<Search className="w-4 h-4" />}
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? 'Mencari...' : 'Cari'}
          </Button>
        </form>
      </Card>

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {r.title ?? '(tanpa judul)'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {TYPE_LABEL[r.source_type] ?? r.source_type}
                </span>
              </div>
              {r.snippet && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                  {r.snippet}
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        query &&
        !isSearching && (
          <Card>
            <p className="py-6 text-center text-sm text-slate-500">Tidak ada hasil.</p>
          </Card>
        )
      )}
    </div>
  )
}
