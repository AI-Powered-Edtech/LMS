/**
 * Responsive Breakpoints Hook
 *
 * Provides viewport-aware responsive utilities that match Tailwind breakpoints.
 * Centralizes breakpoint detection for consistent responsive behavior across the app.
 *
 * Breakpoints (matching Tailwind defaults):
 * - sm: 640px
 * - md: 768px
 * - lg: 1024px
 * - xl: 1280px
 * - 2xl: 1536px
 *
 * Usage:
 * ```tsx
 * const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive()
 *
 * if (isMobile) {
 *   return <MobileView />
 * }
 * return <DesktopView />
 * ```
 */

import { useEffect, useState } from "react";

// ─── Breakpoint Constants ─────────────────────────────────────────────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean; // < 768px (md)
  isTablet: boolean; // 768px - 1024px
  isDesktop: boolean; // > 1024px
  isSmallScreen: boolean; // < 640px (sm)
  isLargeScreen: boolean; // > 1280px (xl)
  breakpoint: Breakpoint | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useResponsive(): ResponsiveState {
  const [dimensions, setDimensions] = useState<ResponsiveState>(() =>
    getResponsiveState(),
  );

  useEffect(() => {
    let ticking = false;

    const handleResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setDimensions(getResponsiveState());
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // Also listen to orientation changes on mobile
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return dimensions;
}

// ─── Helper Function ──────────────────────────────────────────────────────────

function getResponsiveState(): ResponsiveState {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const isSmallScreen = width < BREAKPOINTS.sm;
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isLargeScreen = width >= BREAKPOINTS.xl;

  let breakpoint: Breakpoint | null = null;
  if (width >= BREAKPOINTS["2xl"]) breakpoint = "2xl";
  else if (width >= BREAKPOINTS.xl) breakpoint = "xl";
  else if (width >= BREAKPOINTS.lg) breakpoint = "lg";
  else if (width >= BREAKPOINTS.md) breakpoint = "md";
  else if (width >= BREAKPOINTS.sm) breakpoint = "sm";

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    isLargeScreen,
    breakpoint,
  };
}

export default useResponsive;
