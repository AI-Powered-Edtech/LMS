import React, { Suspense, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Skeleton } from './Skeleton'

/* ─── Lazy-load KaTeX ──────────────────────────────────────── */

const KaTeXCore = React.lazy(() =>
  import('katex').then((mod) => ({
    default: ({ expression, displayMode }: { expression: string; displayMode: boolean }) => {
      const rawHtml = mod.default.renderToString(expression, {
        displayMode,
        throwOnError: false,
        output: 'html',
      })
      const html = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: [
          'semantics',
          'annotation',
          'mrow',
          'mi',
          'mo',
          'mn',
          'msup',
          'msub',
          'mfrac',
          'msqrt',
          'mroot',
          'munder',
          'mover',
          'munderover',
          'mtable',
          'mtr',
          'mtd',
          'mtext',
          'mspace',
          'math',
        ],
        ADD_ATTR: [
          'xmlns',
          'encoding',
          'mathvariant',
          'stretchy',
          'fence',
          'separator',
          'accent',
          'accentunder',
          'columnalign',
          'rowalign',
          'columnspacing',
          'rowspacing',
          'columnlines',
          'rowlines',
          'frame',
          'framespacing',
          'displaystyle',
          'scriptlevel',
          'minsize',
          'maxsize',
          'lspace',
          'rspace',
          'linethickness',
          'depth',
          'height',
          'width',
          'aria-hidden',
        ],
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
