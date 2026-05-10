import { ChevronRight } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

import { cn } from "@/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({
  items,
  className,
}: BreadcrumbProps): React.JSX.Element {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-xs", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            )}
            {isLast || !item.href ? (
              <span
                {...(isLast ? { "aria-current": "page" as const } : {})}
                className={cn(
                  "font-medium truncate max-w-[200px]",
                  isLast
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
