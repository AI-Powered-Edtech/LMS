// WCAG 2.1 SC 2.4.1 — Bypass Blocks
// First element in the DOM, visually hidden until focused

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className={[
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:left-4 focus:z-[9999]",
        "focus:px-4 focus:py-2 focus:rounded-lg",
        "focus:bg-blue-600 focus:text-white focus:font-semibold",
        "focus:shadow-lg focus:outline-none",
        "dark:focus:bg-blue-400 dark:focus:text-slate-900",
      ].join(" ")}
    >
      Langsung ke konten utama
    </a>
  );
}
