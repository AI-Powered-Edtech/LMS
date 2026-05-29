import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { cn } from "@/utils/cn";
import { sanitizeUrl } from "@/utils/sanitize";
import { katexSanitizeSchema } from "@/utils/sanitizeMarkdown";

interface MarkdownBlockProps {
  content: string;
  className?: string;
}

export function MarkdownBlock({ content, className }: MarkdownBlockProps) {
  // Lazy-load KaTeX CSS for math rendering
  useEffect(() => {
    void import("katex/dist/katex.min.css");
  }, []);

  if (!content?.trim()) {
    return (
      <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">
        Konten belum tersedia.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        "prose-headings:font-semibold prose-a:text-blue-600",
        "prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:rounded prose-code:px-1",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}
        components={{
          a: ({ href, children }) => (
            <a
              href={sanitizeUrl(href)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
              <span className="sr-only">(buka di tab baru)</span>
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
