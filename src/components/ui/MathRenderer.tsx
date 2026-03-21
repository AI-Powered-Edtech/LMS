import React, { Suspense, useMemo } from 'react'
import { Skeleton } from './Skeleton'

/* ─── Lazy-load KaTeX ──────────────────────────────────────── */

const KaTeXCore = React.lazy(() =>
  import('katex').then((mod) => ({
    default: ({ expression, displayMode }: { expression: string; displayMode: boolean }) => {
      const html = mod.default.renderToString(expression, {
        displayMode,
        throwOnError: false,
        output: 'html',
      })
      return <span dangerouslySetInnerHTML={{ __html: html }} />
    },
  }))
)

/* ─── Math detection pattern ───────────────────────────────── */

const MATH_PATTERN = /\$\$|\\\(|\\\[|\\frac|\\sqrt|\\sum|\\int/

/* ─── Props ────────────────────────────────────────────────── */

export interface MathRendererProps {
  expression: string
  displayMode?: boolean
  className?: string
}

/* ─── Component ────────────────────────────────────────────── */

export function MathRenderer({ expression, displayMode = false, className }: MathRendererProps) {
  const hasMath = useMemo(() => MATH_PATTERN.test(expression), [expression])

  // Strip delimiters for KaTeX rendering (always computed, used only when hasMath)
  const cleaned = useMemo(() => {
    const str = expression.trim()
    if (str.startsWith('$$') && str.endsWith('$$')) return str.slice(2, -2).trim()
    if (str.startsWith('\\[') && str.endsWith('\\]')) return str.slice(2, -2).trim()
    if (str.startsWith('\\(') && str.endsWith('\\)')) return str.slice(2, -2).trim()
    return str
  }, [expression])

  // If no math detected, render as plain text
  if (!hasMath) {
    return <span className={className}>{expression}</span>
  }

  return (
    <Suspense
      fallback={
        <Skeleton
          className="inline-block align-middle"
          width={displayMode ? '100%' : 80}
          height={displayMode ? 40 : 20}
        />
      }
    >
      <span className={className}>
        <KaTeXCore expression={cleaned} displayMode={displayMode} />
      </span>
    </Suspense>
  )
}
