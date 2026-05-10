import { memo } from "react";

import { cn } from "@/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "info" | "success" | "warning" | "danger" | "neutral";
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

const variants = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
} as const;

const sizes = {
  sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
  md: "text-xs px-2 py-0.5 gap-1",
} as const;

export const Badge = memo(function Badge({
  variant = "neutral",
  size = "sm",
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-lg whitespace-nowrap",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
});
