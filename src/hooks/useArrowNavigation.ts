/**
 * useArrowNavigation — navigasi keyboard dengan tombol panah untuk list item
 * dalam sebuah nav container.
 *
 * Mendukung:
 * - ArrowDown / ArrowUp  : pindah ke item berikutnya / sebelumnya
 * - Home                 : pindah ke item pertama
 * - End                  : pindah ke item terakhir
 * - Fokus wraps: item terakhir → item pertama, dan sebaliknya
 *
 * Target elemen yang difokus: `a[href]` dan `button:not([disabled])`
 */

import { useCallback, useRef } from "react";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled])";

export interface UseArrowNavigationReturn {
  containerRef: React.RefObject<HTMLElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

export function useArrowNavigation(): UseArrowNavigationReturn {
  const containerRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const { key } = e;

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;

    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.closest("[inert]"));

    if (items.length === 0) return;

    const currentIndex = items.findIndex((el) => el === document.activeElement);

    let nextIndex: number;

    if (key === "ArrowDown") {
      e.preventDefault();
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    } else if (key === "ArrowUp") {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    } else if (key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else {
      // End
      e.preventDefault();
      nextIndex = items.length - 1;
    }

    items[nextIndex]?.focus();
  }, []);

  return { containerRef, handleKeyDown };
}
