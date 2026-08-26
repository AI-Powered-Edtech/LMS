import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/Modal";
import { sanitizeUrl } from "@/utils/sanitize";

import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { SearchResultItem } from "./SearchResultItem";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal pencarian global — diakses dari header atau keyboard shortcut (Ctrl+K / Cmd+K).
 * Mendukung pencarian lintas: kursus, pelajaran, tugas, kuis, diskusi, pengguna.
 */
export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { query, setQuery, results, loading, clear } = useGlobalSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      clear();
    }
  }, [isOpen, clear]);

  const handleSelect = useCallback(
    (url: string) => {
      onClose();
      // 🛡️ Sentinel: Sanitize dynamic URLs before navigation to prevent DOM XSS
      window.location.assign(sanitizeUrl(url));
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      ariaLabel="Pencarian Global"
    >
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-3 w-full">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari kursus, pelajaran, tugas, kuis..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-lg"
            aria-label="Kata kunci pencarian"
          />
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          )}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              aria-label="Hapus pencarian"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </ModalHeader>

      <ModalBody className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((result) => (
                <SearchResultItem
                  key={`${result.type}-${result.id}`}
                  result={result}
                  onSelect={() => handleSelect(result.url)}
                />
              ))}
            </div>
          ) : query.trim().length >= 2 && !loading ? (
            <EmptyState
              icon={<Search className="w-8 h-8" />}
              title="Tidak ditemukan"
              description={`Tidak ada hasil untuk "${query}"`}
            />
          ) : query.trim().length < 2 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Ketik minimal 2 karakter untuk mencari
            </div>
          ) : null}
        </div>
      </ModalBody>
    </Modal>
  );
}
