import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { cn } from '@/src/utils/cn'
import { katexSanitizeSchema } from '@/src/utils/sanitizeMarkdown'

interface MarkdownBlockProps {
  content: string
  className?: string
}

export function MarkdownBlock({ content, className }: MarkdownBlockProps) {
  // Lazy-load KaTeX CSS for math rendering
  useEffect(() => {
    import('katex/dist/katex.min.css')
  }, [])

  return (
    <div
      className={cn(
        'prose prose-slate dark:prose-invert max-w-none',
        'prose-headings:font-semibold prose-a:text-blue-600',
        'prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:rounded prose-code:px-1',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
