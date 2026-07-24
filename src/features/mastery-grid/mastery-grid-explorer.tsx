"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { STUDENT_ROUTE_HEADER_VARIANT } from "@/features/student-profile/student-sticky-variants";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import {
  filterMasteryNodesByQuery,
  pickDefaultMasteryUnitNumber,
  summarizeMasteryGrid,
} from "@/features/mastery-grid/mastery-grid-pure";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import { Input } from "@/shared/ui/input";
import { skillTreeUnitTriggerLabel } from "@/shared/ui/accordion-messages-pure";
import { unitDisplayName } from "@/features/quest/ap-calc-unit-labels-pure";
import { SkillConceptIcon, UnitConceptIcon } from "@/features/quest/ui/skill-concept-icon";
import {
  MentrixaVocabIcon,
  VocabCountMetric,
  VocabSectionHeading,
  VOCAB_HEADING_ICON_SIZE,
} from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

function VocabMetric({
  value,
  icon,
  label,
  gold,
  surface = "light",
}: {
  value: number | string;
  icon: VocabIconName;
  label: string;
  gold?: boolean;
  surface?: "dark" | "light";
}) {
  return (
    <VocabCountMetric
      value={value}
      icon={icon}
      label={label}
      gold={gold}
      surface={surface}
      iconSize={VOCAB_HEADING_ICON_SIZE}
      valueClassName="text-xl font-black tabular-nums leading-none text-[var(--mx-navy)] sm:text-2xl"
    />
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
  unlockedNodeIds,
}: {
  data: MasteryGridData;
  subjects: SubjectOption[];
  unlockedNodeIds?: ReadonlySet<string> | null;
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
      <StudentStickyNote variant={STUDENT_ROUTE_HEADER_VARIANT.skills}>
        <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/student"
              className="inline-flex items-center text-[var(--mx-indigo)] hover:text-[#4F46E5]"
              aria-label="Back to home"
              title="Back to home"
            >
              <MentrixaVocabIcon name="home" size={32} surface="light" title="Home" />
            </Link>
            <h1 className="mt-3" aria-label="Skill tree">
              <VocabSectionHeading
                name="skills"
                label="Skill tree"
                surface="light"
                as="span"
                labelClassName="mx-hand-title !text-2xl !font-bold !normal-case !tracking-normal !text-[var(--mx-navy)] sm:!text-3xl"
              />
            </h1>
            <p className={`mt-1 text-sm font-medium leading-relaxed ${mentrixStudent.pageSubtitle}`}>
              <span className="sr-only">One subject, one unit at a time.</span>
            </p>
          </div>
          <div className={`${mentrixStudent.sectionEyebrow} flex flex-wrap items-end justify-start gap-5 sm:justify-end`}>
            <VocabMetric
              value={summary.verifiedCount}
              icon="verified"
              label="verified"
              gold
            />
            <VocabMetric
              value={summary.proficientCount}
              icon="practice-pack"
              label="solid practice"
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
                subject.active ? mentrixStudent.chipActive : mentrixStudent.chipIdle,
                !subject.active && "opacity-70",
              )}
            >
              {subject.name}
              {!subject.active ? (
                <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-[#94A3B8]">
                  Soon
                </span>
              ) : null}
            </span>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
            className={mentrixStudent.hubFieldInput}
          />
        </div>

        {!searching ? (
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex min-w-max gap-2">
              {data.units.map((unit) => {
                const active = unit.unitNumber === selectedUnit;
                return (
                  <button
                    key={unit.unitNumber}
                    type="button"
                    onClick={() => setSelectedUnit(unit.unitNumber)}
                    className={cn(
                      "mx-hub-btn-hand inline-flex min-h-10 w-[12rem] max-w-[14rem] flex-col items-center rounded-xl border px-2.5 py-2 text-center transition",
                      active
                        ? "border-[var(--mx-indigo)] bg-[var(--mx-violet)] text-white shadow-[2px_2px_0_var(--mx-navy)]"
                        : "border-violet-300 bg-white text-[#4F46E5] hover:border-[var(--mx-violet)] hover:bg-violet-100",
                    )}
                    title={`Unit ${unit.unitNumber}: ${unit.unitName}`}
                  >
                    <UnitConceptIcon unitNumber={unit.unitNumber} size={36} surface="onLight" />
                    <span className="mt-1 line-clamp-3 min-h-[2.25rem] text-[9px] font-semibold leading-tight">
                      {unitDisplayName(unit.unitNumber, unit.unitName)}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold tabular-nums opacity-80">
                      <MentrixaVocabIcon name="skills" size={12} surface={active ? "dark" : "light"} title="Skills" />
                      {unit.nodes.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        </section>
      </StudentStickyNote>

      {searching ? (
        <StudentStickyNote variant="strip">
          <section>
          <p className={mentrixStudent.sectionEyebrow}>
            <MentrixaVocabIcon name="skills" size={20} surface="light" title="Results" />
            <span className="sr-only">Search results</span>
          </p>
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
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-violet-300 bg-white px-3 py-2 text-left transition hover:border-[var(--mx-indigo)] hover:bg-violet-100"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <SkillConceptIcon
                        nodeName={node.nodeName}
                        nodeSlug={node.nodeSlug}
                        unitNumber={node.unitNumber}
                        size={32}
                        surface="onLight"
                        title={node.nodeName}
                      />
                      <span className="line-clamp-2 min-w-0 text-left text-xs font-semibold leading-snug text-[var(--mx-navy)]">
                        {node.nodeName}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <UnitConceptIcon unitNumber={node.unitNumber} size={24} surface="onLight" />
                      <span className="line-clamp-2 max-w-[8rem] text-right text-[9px] font-semibold leading-tight text-[#64748B]">
                        {skillTreeUnitTriggerLabel(node.unitNumber, node.unitName)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          </section>
        </StudentStickyNote>
      ) : filteredData ? (
        <StudentStickyNote variant="curl">
          <MasteryGrid
            data={filteredData}
            showLegend
            collapsibleUnits={false}
            unlockedNodeIds={unlockedNodeIds}
          />
        </StudentStickyNote>
      ) : null}
    </div>
  );
}
