import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion } from "motion/react";
import { NavItem } from "@/src/config/navigation";

interface HubViewProps {
  title: string;
  description: string;
  items: NavItem[];
}

export function HubView({ title, description, items }: HubViewProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {items.map((page, index) => (
          <motion.div
            key={page.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="h-full"
          >
            <Link
              to={page.path}
              className={cn(
                "relative block h-full bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group overflow-hidden",
                "hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-700"
              )}
            >
              {/* Subtle background gradient that appears on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", 
                    page.bg || "bg-slate-50", 
                    page.color || "text-slate-700", 
                    page.border || "border-slate-200"
                  )}>
                    <page.icon className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shadow-sm">
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                    {page.name}
                  </h3>
                  {page.notification && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                      {page.notification}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                  {page.description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
