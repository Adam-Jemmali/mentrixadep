"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setFocusedDivision } from "@/app/actions/quest";
import {
  getDivisionTheme,
  divisionTeaser,
} from "@/lib/division-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type DivisionCatalogItem = {
  key: string;
  name: string;
  description: string | null;
};

type Props =
  | {
      mode: "focus";
      divisions: DivisionCatalogItem[];
      /** null = automatic (highest XP) */
      selectedKey: string | null;
      /** "auto" means highest-XP mode */
      showAutomaticOption?: boolean;
      compact?: boolean;
    }
  | {
      mode: "select";
      divisions: DivisionCatalogItem[];
      selectedKey: string;
      onSelect: (key: string) => void;
      compact?: boolean;
    };

/** Optional XP per division (e.g. from stats) for badges */
export function DivisionPickerCards(
  props: Props & { xpByKey?: Record<string, number> }
) {
  const { divisions, compact, xpByKey = {} } = props;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return divisions;
    return divisions.filter(
      (d) =>
        d.key.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.description?.toLowerCase().includes(q) ?? false)
    );
  }, [divisions, query]);

  async function handleFocusClick(key: string | "auto") {
    if (props.mode !== "focus") return;
    setPending(key);
    const next = key === "auto" ? null : key;
    await setFocusedDivision(next);
    setPending(null);
    router.refresh();
  }

  function handleSelectClick(key: string) {
    if (props.mode === "select") {
      props.onSelect(key);
    }
  }

  const isFocus = props.mode === "focus";
  const selected =
    props.mode === "focus"
      ? props.selectedKey
      : props.selectedKey;
  const showAuto = isFocus && (props.showAutomaticOption ?? true);

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {!compact && (
        <Input
          type="search"
          placeholder="Search subjects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md bg-white border-slate-200"
          aria-label="Search divisions"
        />
      )}
      {compact && (
        <Input
          type="search"
          placeholder="Filter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-xs bg-white border-slate-200"
          aria-label="Filter divisions"
        />
      )}
      <div
        className={cn(
          "grid gap-2 sm:gap-3",
          compact
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {showAuto && (
          <button
            type="button"
            disabled={!!pending}
            onClick={() => void handleFocusClick("auto")}
            className={cn(
              "text-left rounded-xl border-2 p-3 sm:p-4 transition-all duration-200",
              "hover:shadow-md hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-500",
              selected === null
                ? "border-mentrixa-500 bg-mentrixa-50 shadow-sm ring-2 ring-mentrixa-200"
                : "border-slate-200 bg-white"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold",
                  "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
                )}
              >
                ∞
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm">
                  Smart default
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  We show the division where you have the most XP—switch anytime.
                </p>
              </div>
            </div>
            {pending === "auto" && (
              <p className="text-[11px] text-mentrixa-600 mt-2">Saving…</p>
            )}
          </button>
        )}
        {filtered.map((d) => {
          const theme = getDivisionTheme(d.key);
          const xp = xpByKey[d.key];
          const active =
            props.mode === "focus"
              ? props.selectedKey === d.key
              : props.selectedKey === d.key;

          return (
            <button
              key={d.key}
              type="button"
              disabled={!!pending}
              onClick={() => {
                if (isFocus) void handleFocusClick(d.key);
                else handleSelectClick(d.key);
              }}
              className={cn(
                "text-left rounded-xl border-2 p-3 sm:p-4 transition-all duration-200",
                "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                active
                  ? cn("shadow-md ring-2 ring-offset-1", theme.ring, theme.softBg)
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-inner",
                    "bg-gradient-to-br",
                    theme.gradient
                  )}
                  aria-hidden
                >
                  {theme.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm leading-tight">
                      {d.name.replace(/\s+Division$/i, "")}
                    </p>
                    {typeof xp === "number" && xp > 0 && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {xp.toLocaleString()} XP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                    {divisionTeaser(d.description, d.name)}
                  </p>
                </div>
              </div>
              {pending === d.key && (
                <p className="text-[11px] text-mentrixa-600 mt-2">Saving…</p>
              )}
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-slate-400 py-4 text-center">
          No subjects match “{query}”.
        </p>
      )}
    </div>
  );
}
