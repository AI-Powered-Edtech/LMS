import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useRef, useState } from "react";

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T, index: number) => React.ReactNode;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  getRowKey: (row: T, index: number) => string;
  emptyState?: React.ReactNode;
  className?: string;
  caption?: string;
  "data-testid"?: string;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 52,
  maxHeight = 600,
  getRowKey,
  emptyState,
  className = "",
  caption,
  "data-testid": testId,
  onRowClick,
  rowClassName,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!onRowClick || data.length === 0) return;

      let nextIndex = focusedIndex;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          nextIndex = Math.min(focusedIndex + 1, data.length - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          nextIndex = Math.max(focusedIndex - 1, 0);
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = data.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < data.length) {
            onRowClick(data[focusedIndex], focusedIndex);
          }
          return;
        default:
          return;
      }
      setFocusedIndex(nextIndex);
      virtualizer.scrollToIndex(nextIndex);
    },
    [focusedIndex, data, onRowClick, virtualizer],
  );

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      ref={parentRef}
      data-testid={testId}
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
      tabIndex={onRowClick ? 0 : undefined}
      role="grid"
      aria-label={caption}
      onKeyDown={handleKeyDown}
    >
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width }}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index];
            const isFocused = focusedIndex === virtualRow.index;
            return (
              <tr
                key={getRowKey(row, virtualRow.index)}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                onClick={
                  onRowClick
                    ? () => onRowClick(row, virtualRow.index)
                    : undefined
                }
                tabIndex={onRowClick ? -1 : undefined}
                aria-selected={onRowClick ? isFocused : undefined}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                  rowClassName ? rowClassName(row, virtualRow.index) : ""
                } ${onRowClick ? "cursor-pointer" : ""} ${
                  isFocused ? "ring-2 ring-inset ring-blue-500" : ""
                }`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ width: col.width }}
                    className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                  >
                    {col.render(row, virtualRow.index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
