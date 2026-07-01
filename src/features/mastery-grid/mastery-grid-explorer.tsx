"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import {
  filterMasteryNodesByQuery,
  pickDefaultMasteryUnitNumber,
  summarizeMasteryGrid,
} from "@/features/mastery-grid/mastery-grid-pure";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import { Input } from "@/shared/ui/input";
import { skillTreeUnitTriggerLabel } from "@/shared/ui/accordion-messages-pure";

type SubjectOption = {
  key: string;
  name: string;
  active: boolean;
};

export function MasteryGridExplorer({
  data,
  subjects,
}: {
  data: MasteryGridData;
  subjects: SubjectOption[];
}) {
  const defaultUnit = pickDefaultMasteryUnitNumber(data);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(defaultUnit);
  const [searchQuery, setSearchQuery] = useState("");

  const summary = useMemo(() => summarizeMasteryGrid(data), [data]);
  const searchResults = useMemo(
    () => filterMasteryNodesByQuery(data, searchQuery),
    [data, searchQuery],
  );

  const activeUnit = data.units.find((unit) => unit.unitNumber === selectedUnit) ?? data.units[0] ?? null;
  const filteredData: MasteryGridData | null = activeUnit
    ? {
        ...data,
        units: [activeUnit],
      }
    : null;

  const searching = searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/student"
            className="text-xs font-medium text-violet-300 transition hover:text-violet-100"
          >
            Back to home
          </Link>
          <h1 className={`mt-2 text-xl font-bold ${mentrixStudent.textOnDark}`}>Skill tree</h1>
          <p className="mt-1 text-sm text-violet-200/80">
            One subject, one unit at a time. Search scales to hundreds of skills without stacking the home page.
          </p>
        </div>
        <p className="text-xs text-violet-200/70">
          {summary.verifiedCount} verified · {summary.totalNodes} skills · {data.units.length} units
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {subjects.map((subject) => (
          <span
            key={subject.key}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold",
              subject.active
                ? "border-violet-400/60 bg-violet-600/30 text-violet-50"
                : "border-white/10 bg-white/5 text-violet-200/50",
            )}
          >
            {subject.name}
            {!subject.active ? (
              <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-violet-300/60">
                Soon
              </span>
            ) : null}
          </span>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/60" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search skills across all units"
          className="h-10 border-violet-500/25 bg-[#0B1220]/80 pl-9 text-sm text-violet-50 placeholder:text-violet-300/40"
        />
      </div>

      {searching ? (
        <section className={`${mentrixStudent.cardArena} p-5 sm:p-6`}>
          <p className={mentrixStudent.sectionEyebrow}>Search results</p>
          {searchResults.length === 0 ? (
            <p className="mt-3 text-sm text-violet-200/80">No skills match that query.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {searchResults.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedUnit(node.unitNumber);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-violet-400/40"
                  >
                    <span className="text-sm font-medium text-violet-50">{node.nodeName}</span>
                    <span className="shrink-0 text-[11px] text-violet-300/70">
                      {skillTreeUnitTriggerLabel(node.unitNumber, node.unitName)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex min-w-max gap-2">
              {data.units.map((unit) => {
                const active = unit.unitNumber === selectedUnit;
                const weakCount = unit.nodes.filter((node) => node.state === "weak" || node.state === "none").length;
                return (
                  <button
                    key={unit.unitNumber}
                    type="button"
                    onClick={() => setSelectedUnit(unit.unitNumber)}
                    className={cn(
                      "inline-flex min-h-10 max-w-[14rem] flex-col items-start rounded-xl border px-3 py-2 text-left transition",
                      active
                        ? "border-violet-400/60 bg-violet-600/25 text-violet-50"
                        : "border-white/10 bg-white/5 text-violet-200/80 hover:border-violet-400/30",
                    )}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      Unit {unit.unitNumber}
                    </span>
                    <span className="line-clamp-2 text-xs font-medium">{unit.unitName}</span>
                    <span className="mt-1 text-[10px] text-violet-300/70">
                      {unit.nodes.length} skills · {weakCount} open
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredData ? (
            <MasteryGrid
              data={filteredData}
              showLegend
              collapsibleUnits={false}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
