import { Search } from "lucide-react";

import { FORUM_CATEGORIES } from "@/features/discussions/utils/forumUtils";
import { cn } from "@/utils/cn";

interface ForumSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function ForumSearchBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: ForumSearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari pertanyaan atau kata kunci..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
        {FORUM_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={cn(
              "px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all",
              selectedCategory === cat
                ? "bg-slate-800 text-white shadow-md dark:bg-slate-200 dark:text-slate-900"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700",
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
