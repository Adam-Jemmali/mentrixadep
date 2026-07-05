"use client";

import { PromptWithMathInline } from "@/features/quest/ui/prompt-with-math";
import { cn } from "@/shared/core/utils";

export function QuestPromptTable({
  headers,
  rows,
  variant = "light",
  highlightKeyTerms = false,
}: {
  headers: string[];
  rows: string[][];
  variant?: "light" | "dark";
  highlightKeyTerms?: boolean;
}) {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length));
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "my-4 overflow-x-auto rounded-xl border",
        isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50/50",
      )}
    >
      <table className="w-full min-w-[280px] border-collapse text-sm">
        <thead>
          <tr
            className={cn(
              "border-b",
              isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-100/90",
            )}
          >
            {Array.from({ length: colCount }, (_, ci) => (
              <th
                key={`h-${ci}`}
                className={cn(
                  "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide",
                  isDark ? "text-slate-400" : "text-slate-600",
                )}
              >
                <PromptWithMathInline
                  text={headers[ci] ?? ""}
                  variant={variant}
                  highlightKeyTerms={highlightKeyTerms}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={`r-${ri}`}
              className={
                isDark
                  ? ri % 2 === 0
                    ? "bg-white/[0.03]"
                    : "bg-transparent"
                  : ri % 2 === 0
                    ? "bg-white"
                    : "bg-slate-50/80"
              }
            >
              {Array.from({ length: colCount }, (_, ci) => (
                <td
                  key={`c-${ri}-${ci}`}
                  className={cn(
                    "border-t px-4 py-2.5 font-mono text-[13px] tabular-nums",
                    isDark ? "border-white/5 text-slate-200" : "border-slate-100 text-slate-800",
                  )}
                >
                  <PromptWithMathInline
                    text={row[ci] ?? ""}
                    plainNumeric
                    variant={variant}
                    highlightKeyTerms={highlightKeyTerms}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
