import { ArrowRight, Inbox } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { NavItem } from "@/shared/config/navigation";
import { cn } from "@/utils/cn";

interface HubViewProps {
  title: string;
  description: string;
  items: NavItem[];
  /** Optional custom title shown when items array is empty. */
  emptyTitle?: string;
  /** Optional explanation shown when items array is empty. */
  emptyDescription?: string;
  /**
   * Heading level for the section title. Defaults to h1 (when HubView is the
   * page's primary heading). Pass 'h2' when HubView is rendered as a section
   * under a page that already has a higher-level h1.
   */
  headingLevel?: "h1" | "h2";
}

export function HubView({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
  headingLevel = "h1",
}: HubViewProps) {
  const { t } = useTranslation();
  const HeadingTag = headingLevel;
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4 md:px-6 lg:px-8">
      {(title || description) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <HeadingTag className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </HeadingTag>
            )}
            {description && (
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
            <Inbox className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {emptyTitle ?? "Belum ada item untuk ditampilkan"}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            {emptyDescription ??
              "Halaman ini akan otomatis terisi saat admin mengaktifkan modul atau saat Anda terdaftar di kelas/peran yang sesuai."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map((page, index) => (
            <motion.div
              key={page.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              className="h-full"
            >
              <Link
                to={page.path}
                className={cn(
                  "relative block h-full bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group overflow-hidden",
                  "hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-700",
                )}
              >
                {/* Subtle background gradient that appears on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                        page.bg || "bg-slate-50",
                        page.color || "text-slate-700",
                        page.border || "border-slate-200",
                      )}
                    >
                      <page.icon className="w-7 h-7" strokeWidth={1.5} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shadow-sm">
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {t(page.name)}
                    </h3>
                    {page.notification && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                        {page.notification}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                    {page.description ? t(page.description) : null}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
