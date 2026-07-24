"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";
import { Input } from "@/shared/ui/input";
import { mxUi } from "@/components/ui/mentrixa-ui-tokens";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  filterValue?: (row: T) => string;
  className?: string;
};

export type DataTableProps<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  filterPlaceholder?: string;
  emptyMessage?: ReactNode;
  tone?: "dark" | "light";
  className?: string;
};

type SortDir = "asc" | "desc";

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  filterPlaceholder = "Filter rows",
  emptyMessage = "No rows match.",
  tone = "light",
  className,
}: DataTableProps<T>) {
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const isDark = tone === "dark";

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const raw = col.filterValue?.(row) ?? String(col.sortValue?.(row) ?? "");
        return raw.toLowerCase().includes(q);
      }),
    );
  }, [rows, columns, filter]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const col = columns.find((c) => c.id === sortCol);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortCol, sortDir, columns]);

  const toggleSort = (id: string, canSort: boolean) => {
    if (!canSort) return;
    if (sortCol === id) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortCol(id);
    setSortDir("asc");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            isDark ? mxUi.muted : mxUi.mutedLight,
          )}
          aria-hidden
        />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={filterPlaceholder}
          className={cn(
            "h-9 pl-9 text-sm",
            isDark
              ? "border-white/10 bg-[var(--mx-surface-3)] text-slate-100 placeholder:text-slate-500"
              : "border-[#E0E7FF] bg-white/90 text-[var(--mx-navy)]",
          )}
          aria-label={filterPlaceholder}
        />
      </div>

      <div
        className={cn(
          "overflow-x-auto rounded-[var(--radius-card)] border",
          isDark ? mxUi.border : mxUi.borderLight,
        )}
      >
        <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
          <thead>
            <tr className={isDark ? "border-b border-white/10 bg-white/5" : "border-b border-[#E0E7FF] bg-[#EDE9FE]/40"}>
              {columns.map((col) => {
                const canSort = Boolean(col.sortValue);
                const active = sortCol === col.id;
                return (
                  <th key={col.id} className={cn("px-3 py-2 font-semibold", col.className)}>
                    <button
                      type="button"
                      disabled={!canSort}
                      onClick={() => toggleSort(col.id, canSort)}
                      className={cn(
                        "inline-flex items-center gap-1.5 transition-colors duration-200",
                        canSort && "cursor-pointer hover:text-[var(--mx-violet)]",
                        !canSort && "cursor-default",
                        isDark ? "text-slate-200" : "text-[var(--mx-navy)]",
                        active && mxUi.primary,
                      )}
                    >
                      {col.header}
                      {canSort ? (
                        active ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                        )
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className={cn("px-3 py-6 text-center text-sm", isDark ? mxUi.muted : mxUi.mutedLight)}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sorted.map((row, index) => (
                  <motion.tr
                    key={getRowKey(row)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "border-b last:border-b-0 transition-colors duration-200",
                      isDark
                        ? "border-white/5 hover:bg-white/[0.04]"
                        : "border-[#E0E7FF]/80 hover:bg-[#EDE9FE]/30",
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "px-3 py-2.5",
                          isDark ? "text-slate-100" : "text-[var(--mx-navy)]",
                          col.className,
                        )}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
