"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { mentrixStudent, mentrixProfileType, mentrixBrandUi } from "@/features/student-profile/mentrix-student-ui";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import {
  filterMasteryNodesByQuery,
  pickDefaultMasteryUnitNumber,
  summarizeMasteryGrid,
} from "@/features/mastery-grid/mastery-grid-pure";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import { Input } from "@/shared/ui/input";
import { skillTreeUnitTriggerLabel } from "@/shared/ui/accordion-messages-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

function VocabMetric({
  value,
  icon,
  label,
  gold,
  iconClassName,
}: {
  value: number | string;
  icon: VocabIconName;
  label: string;
  gold?: boolean;
  iconClassName?: string;
}) {
  return (
    <span
      className="inline-flex min-w-[3.5rem] flex-col items-center gap-1.5"
      aria-label={`${value} ${label}`}
      title={`${value} ${label}`}
    >
      <span className="text-xl font-black tabular-nums leading-none text-violet-50 sm:text-2xl">{value}</span>
      <MentrixaVocabIcon
        name={icon}
        size={32}
        gold={gold}
        className={iconClassName ?? "text-violet-200"}
      />
    </span>
  );
}

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
      <section className={`${mentrixStudent.card} space-y-5 p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/student"
              className="inline-flex items-center"
              aria-label="Back to home"
              title="Back to home"
            >
              <MentrixaVocabIcon name="home" size={28} className="text-violet-200" />
            </Link>
            <h1 className="mt-3 flex items-center" aria-label="Skill tree">
              <MentrixaVocabIcon name="skills" size={36} className="text-violet-200" />
              <span className="sr-only">Skill tree</span>
            </h1>
            <p className={`mt-1 ${mentrixProfileType.pageSubtitleOnDark}`}>
              One subject, one unit at a time. Search scales to hundreds of skills without stacking the home page.
            </p>
          </div>
          <div className={`${mentrixProfileType.statLabelOnDark} flex flex-wrap items-end justify-start gap-5 sm:justify-end`}>
            <VocabMetric
              value={summary.verifiedCount}
              icon="verified"
              label="verified"
              gold
              iconClassName="text-amber-300"
            />
            <VocabMetric value={summary.totalNodes} icon="skills" label="skills" />
            <VocabMetric value={data.units.length} icon="unit" label="units" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <span
              key={subject.key}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold",
                subject.active ? mentrixBrandUi.chipActive : mentrixBrandUi.chipIdle,
                !subject.active && "opacity-70",
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
            className={mentrixBrandUi.input}
          />
        </div>

        {!searching ? (
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex min-w-max gap-2">
              {data.units.map((unit) => {
                const active = unit.unitNumber === selectedUnit;
                const weakCount = unit.nodes.filter(
                  (node) => node.state === "weak" || node.state === "none",
                ).length;
                return (
                  <button
                    key={unit.unitNumber}
                    type="button"
                    onClick={() => setSelectedUnit(unit.unitNumber)}
                    className={cn(
                      "inline-flex min-h-10 max-w-[14rem] flex-col items-start rounded-xl border px-3 py-2 text-left transition",
                      active
                        ? "border-violet-400/70 bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white shadow-md shadow-violet-600/25"
                        : "border-indigo-500/30 bg-indigo-950/50 text-violet-100 hover:border-violet-400/45 hover:bg-violet-950/60",
                    )}
                  >
                    <span className="inline-flex w-full items-center gap-2">
                      <MentrixaVocabIcon
                        name="unit"
                        size={24}
                        className={active ? "text-violet-50" : "text-violet-200"}
                      />
                      <span
                        className={cn(
                          "text-sm font-black tabular-nums",
                          active ? "text-white" : "text-violet-100",
                        )}
                        aria-label={`Unit ${unit.unitNumber}`}
                      >
                        {unit.unitNumber}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-xs font-semibold">{unit.unitName}</span>
                    <span
                      className={cn(
                        "mt-1 text-[10px]",
                        active ? "text-violet-100/90" : "text-violet-300/65",
                      )}
                    >
                      {unit.nodes.length} skills · {weakCount} open
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {searching ? (
        <section className={`${mentrixStudent.card} p-5 sm:p-6`}>
          <p className={mentrixStudent.sectionEyebrow}>Search results</p>
          {searchResults.length === 0 ? (
            <p className={`mt-3 text-sm ${mentrixStudent.textMutedOnDark}`}>No skills match that query.</p>
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
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-indigo-500/30 bg-indigo-950/45 px-3 py-2 text-left transition hover:border-violet-400/45 hover:bg-violet-950/55"
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
      ) : filteredData ? (
        <MasteryGrid data={filteredData} showLegend collapsibleUnits={false} />
      ) : null}
    </div>
  );
}
