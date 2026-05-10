import { useEffect, useRef, useState } from "react";

interface ScrollProgressBarProps {
  scrollContainerId?: string; // ID of the scroll container to track
}

export function ScrollProgressBar({
  scrollContainerId,
}: ScrollProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = scrollContainerId
      ? document.getElementById(scrollContainerId)
      : null;

    const getProgress = () => {
      if (container) {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        return scrollHeight > 0
          ? Math.min((scrollTop / scrollHeight) * 100, 100)
          : 0;
      }
      // Fallback to window
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      return docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
    };

    function handleScroll() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setProgress(getProgress());
      });
    }

    const target: Window | HTMLElement = container || window;
    target.addEventListener("scroll", handleScroll, { passive: true });
    // Set initial value
    handleScroll();

    return () => {
      target.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [scrollContainerId]);

  return (
    <div className="sticky top-0 z-30 w-full h-[3px] bg-slate-100/80 dark:bg-slate-800/80">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
      {/* Glowing leading edge dot */}
      {progress > 0 && progress < 100 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_6px_2px_rgba(139,92,246,0.6)] -translate-x-1/2 transition-[left] duration-150 ease-out"
          style={{ left: `${progress}%` }}
        />
      )}
    </div>
  );
}
