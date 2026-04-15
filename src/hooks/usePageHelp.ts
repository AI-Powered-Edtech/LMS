/**
 * usePageHelp — mengembalikan HelpItem yang cocok dengan pathname saat ini,
 * atau null jika tidak ada konten bantuan untuk halaman tersebut.
 */

import { useLocation } from 'react-router-dom'

import { helpContent, type HelpItem } from '@/src/data/helpContent'

function usePageHelp(): HelpItem | null {
  const { pathname } = useLocation()

  for (const item of helpContent) {
    if (item.matchType === 'exact' && pathname === item.path) return item
    if (item.matchType === 'prefix' && pathname.startsWith(item.path)) return item
  }

  return null
}
