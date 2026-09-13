import { memo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { cn } from "@/utils/cn";
import { katexSanitizeSchema } from "@/utils/sanitizeMarkdown";

interface MarkdownBlockProps {
  content: string;
  className?: string;
}

// ⚡ Perf: Extract static arrays and objects to module scope to prevent ReactMarkdown
// from unnecessarily re-rendering or re-evaluating on every MarkdownBlock render.
const staticRemarkPlugins = [remarkGfm, remarkMath];
const staticRehypePlugins = [
  rehypeKatex,
  [rehypeSanitize, katexSanitizeSchema],
] as any;
const staticComponents = {
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only">(buka di tab baru)</span>
    </a>
  ),
};

// ⚡ Perf: Memoize MarkdownBlock to prevent expensive re-renders when parent renders but content is identical.
export const MarkdownBlock = memo(function MarkdownBlock({
  content,
  className,
}: MarkdownBlockProps) {
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
        remarkPlugins={staticRemarkPlugins as any}
        rehypePlugins={staticRehypePlugins}
        components={staticComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
