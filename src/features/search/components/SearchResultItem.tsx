import { Award, BookOpen, FileText, MessageSquare, Users } from "lucide-react";

import type { SearchResult } from "../api/searchService";

const typeIcons: Record<SearchResult["type"], React.ReactNode> = {
  course: <BookOpen className="w-4 h-4" />,
  lesson: <FileText className="w-4 h-4" />,
  module: <BookOpen className="w-4 h-4" />,
  question: <MessageSquare className="w-4 h-4" />,
  assignment: <FileText className="w-4 h-4" />,
  quiz: <Award className="w-4 h-4" />,
  discussion: <MessageSquare className="w-4 h-4" />,
  user: <Users className="w-4 h-4" />,
};

const typeLabels: Record<SearchResult["type"], string> = {
  course: "Kursus",
  lesson: "Pelajaran",
  module: "Modul",
  question: "Pertanyaan",
  assignment: "Tugas",
  quiz: "Kuis",
  discussion: "Diskusi",
  user: "Pengguna",
};

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: () => void;
}

/**
 * Single search result item with icon, title, description, and type badge.
 */
export function SearchResultItem({ result, onSelect }: SearchResultItemProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      aria-label={`${typeLabels[result.type]}: ${result.title}`}
    >
      <div className="mt-0.5 text-slate-500 dark:text-slate-400 flex-shrink-0">
        {typeIcons[result.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white truncate">
          {result.title}
        </p>
        {result.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {result.description}
          </p>
        )}
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5">
        {typeLabels[result.type]}
      </span>
    </button>
  );
}
