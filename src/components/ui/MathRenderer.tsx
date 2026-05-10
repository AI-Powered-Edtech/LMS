import DOMPurify from "dompurify";
import React, { Suspense, useMemo } from "react";

import { Skeleton } from "./Skeleton";

/* ─── Lazy-load KaTeX ──────────────────────────────────────── */

const KaTeXCore = React.lazy(() =>
  import("katex").then((mod) => ({
    default: ({
      expression,
      displayMode,
    }: {
      expression: string;
      displayMode: boolean;
    }) => {
      const rawHtml = mod.default.renderToString(expression, {
        displayMode,
        throwOnError: false,
        output: "html",
      });
      const html = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: [
          "semantics",
          "annotation",
          "mrow",
          "mi",
          "mo",
          "mn",
          "msup",
          "msub",
          "mfrac",
          "msqrt",
          "mroot",
          "munder",
          "mover",
          "munderover",
          "mtable",
          "mtr",
          "mtd",
          "mtext",
          "mspace",
          "math",
        ],
        ADD_ATTR: [
          "xmlns",
          "encoding",
          "mathvariant",
          "stretchy",
          "fence",
          "separator",
          "accent",
          "accentunder",
          "columnalign",
          "rowalign",
          "columnspacing",
          "rowspacing",
          "columnlines",
          "rowlines",
          "frame",
          "framespacing",
          "displaystyle",
          "scriptlevel",
          "minsize",
          "maxsize",
          "lspace",
          "rspace",
          "linethickness",
          "depth",
          "height",
          "width",
          "aria-hidden",
        ],
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    },
  })),
);

/* ─── Math detection pattern ───────────────────────────────── */

const MATH_PATTERN = /\$\$|\\\(|\\\[|\\frac|\\sqrt|\\sum|\\int/;

/* ─── Props ────────────────────────────────────────────────── */

export interface MathRendererProps {
  expression: string;
  displayMode?: boolean;
  className?: string;
  /**
   * Human-readable description of the equation for screen readers.
   * WCAG 1.1.1 (Non-text Content) — blind students cannot read KaTeX-rendered SVG/HTML.
   * If not provided, falls back to the raw LaTeX expression as an approximation.
   * Example: ariaLabel="E equals m c squared" for "E = mc²"
   */
  ariaLabel?: string;
}

/* ─── Component ────────────────────────────────────────────── */

export function MathRenderer({
  expression,
  displayMode = false,
  className,
  ariaLabel,
}: MathRendererProps) {
  const hasMath = useMemo(() => MATH_PATTERN.test(expression), [expression]);

  // Strip delimiters for KaTeX rendering (always computed, used only when hasMath)
  const cleaned = useMemo(() => {
    const str = expression.trim();
    if (str.startsWith("$$") && str.endsWith("$$"))
      return str.slice(2, -2).trim();
    if (str.startsWith("\\[") && str.endsWith("\\]"))
      return str.slice(2, -2).trim();
    if (str.startsWith("\\(") && str.endsWith("\\)"))
      return str.slice(2, -2).trim();
    return str;
  }, [expression]);

  // If no math detected, render as plain text
  if (!hasMath) {
    return <span className={className}>{expression}</span>;
  }

  // ACCESSIBILITY (WCAG 1.1.1): Wrap in role="math" with aria-label so screen readers
  // can announce the mathematical content. The visual rendering (KaTeX HTML/SVG) is
  // hidden from assistive technology via the KaTeX aria-hidden="true" on inner elements.
  return (
    <Suspense
      fallback={
        <Skeleton
          className="inline-block align-middle"
          aria-label="Memuat persamaan matematika"
          width={displayMode ? "100%" : "80px"}
          height={displayMode ? "40px" : "20px"}
        />
      }
    >
      <span
        role="math"
        aria-label={ariaLabel ?? `Persamaan matematika: ${cleaned}`}
        className={className}
      >
        <KaTeXCore expression={cleaned} displayMode={displayMode} />
      </span>
    </Suspense>
  );
}
