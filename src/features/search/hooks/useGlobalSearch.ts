import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";

import type { SearchResult } from "../api/searchService";
import { globalSearch } from "../api/searchService";

/**
 * Hook untuk global search dengan debounce.
 *
 * Usage:
 *   const { query, setQuery, results, loading, clear } = useGlobalSearch()
 */
const DEBOUNCE_MS = 300;

export function useGlobalSearch() {
  const { tenantId } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!tenantId) return;
      setLoading(true);
      const searchResults = await globalSearch({
        tenantId,
        query: query.trim(),
      });
      setResults(searchResults);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tenantId]);

  return { query, setQuery, results, loading, clear };
}
