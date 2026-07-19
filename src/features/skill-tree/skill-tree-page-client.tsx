"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MasteryGridExplorer } from "@/features/mastery-grid/mastery-grid-explorer";
import { MasteryGridHistoryPanel } from "@/features/mastery-grid/mastery-grid-history-panel";
import type { GridSnapshotWeek } from "@/features/mastery-grid/grid-history-pure";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { SkillTreeCanvas } from "@/features/skill-tree/skill-tree-canvas";
import { SkillTreeNode } from "@/features/skill-tree/skill-tree-node";
import {
  SKILL_TREE_UNLOCKED_BASELINE_KEY,
  diffNewlyUnlockedIds,
  parseUnlockedBaseline,
  serializeUnlockedBaseline,
} from "@/features/skill-tree/skill-tree-unlock-baseline-pure";
import type { SkillTreeData } from "@/features/skill-tree/types";
import { practiceNodeHref } from "@/features/guidance/verdict-engine-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  MentrixaVocabIcon,
  VocabSectionHeading,
} from "@/shared/icons/mentrixa-vocab-icons";

function UnitBranch({
  data,
  unitNumber,
  onClose,
  returnFocusTo,
}: {
  data: SkillTreeData;
  unitNumber: number;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const unit = data.grid.units.find((entry) => entry.unitNumber === unitNumber);
  const nodes = useMemo(
    () =>
      data.nodes
        .filter((node) => node.unitNumber === unitNumber)
        .sort((left, right) => left.displayOrder - right.displayOrder),
    [data.nodes, unitNumber],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    return () => returnFocusTo?.focus();
  }, [returnFocusTo]);

  if (!unit) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#020617]/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-branch-title"
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border border-[#475569] bg-[#0B1220] p-4 text-white shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-6"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-[#0B1220] pb-4">
          <div className="min-w-0">
            <VocabSectionHeading
              name="unit"
              label={`Unit ${unit.unitNumber}`}
              surface="dark"
              as="h2"
              iconSize={36}
              labelClassName="!text-sm !tracking-[0.14em]"
            />
            <p
              id="unit-branch-title"
              className="mt-2 truncate text-sm font-semibold text-slate-200"
              title={unit.unitName}
            >
              {unit.unitName}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#6366F1] bg-[#312E81] px-3 text-sm font-bold text-white transition-colors hover:bg-[#3730A3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
          >
            <MentrixaVocabIcon
              name="skill-tree"
              size={24}
              surface="dark"
              title="Collapse"
            />
            <span>Collapse</span>
          </button>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-2">
          <span
            className="pointer-events-none absolute bottom-4 left-8 top-4 w-px bg-[#6366F1]/35 sm:left-1/2"
            aria-hidden
          />
          {nodes.map((node) => (
            <SkillTreeNode
              key={node.id}
              node={node}
              compact
              href={node.unlocked ? practiceNodeHref(node.nodeName) : undefined}
              bloomOnMount={false}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export function SkillTreePageClient({
  data,
  history,
  momentumActive,
}: {
  data: SkillTreeData;
  history: GridSnapshotWeek[];
  momentumActive: boolean;
}) {
  const searchParams = useSearchParams();
  const openedFromPack = searchParams.get("opened");
  const [openUnitNumber, setOpenUnitNumber] = useState<number | null>(null);
  const [bloomNodeIds, setBloomNodeIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const unitTriggerRef = useRef<HTMLElement | null>(null);
  const focus = data.nodes.find((node) => node.id === data.focusNodeId);
  const unlockedNodeIds = useMemo(
    () => new Set(data.nodes.filter((node) => node.unlocked).map((node) => node.id)),
    [data.nodes],
  );
  const nodeNameById = Object.fromEntries(
    data.nodes.map((node) => [node.id, node.nodeName]),
  );
  const closeUnit = useCallback(() => setOpenUnitNumber(null), []);
  const openUnit = useCallback((unitNumber: number) => {
    unitTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpenUnitNumber(unitNumber);
  }, []);

  useEffect(() => {
    const currentIds = [...unlockedNodeIds];
    const previous = parseUnlockedBaseline(
      window.sessionStorage.getItem(SKILL_TREE_UNLOCKED_BASELINE_KEY),
    );
    const newly = diffNewlyUnlockedIds(previous, currentIds);
    window.sessionStorage.setItem(
      SKILL_TREE_UNLOCKED_BASELINE_KEY,
      serializeUnlockedBaseline(currentIds),
    );
    const bloom = new Set<string>();
    if (openedFromPack && unlockedNodeIds.has(openedFromPack)) {
      bloom.add(openedFromPack);
    }
    if (previous.length > 0) {
      for (const id of newly) bloom.add(id);
    }
    if (bloom.size > 0) setBloomNodeIds(bloom);
  }, [unlockedNodeIds, openedFromPack]);

  return (
    <>
      <header className={`${mentrixStudent.pageHeader} space-y-4`}>
        <Link
          href="/student"
          className="inline-flex cursor-pointer items-center text-[#6366F1] transition-colors hover:text-[#4F46E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
          aria-label="Back home"
        >
          <MentrixaVocabIcon name="home" size={30} surface="light" title="Home" />
        </Link>
        <div>
          <VocabSectionHeading
            name="skill-tree"
            label="Frontier"
            surface="light"
            as="h1"
            labelClassName="mx-hand-title !text-2xl !normal-case !tracking-normal sm:!text-3xl"
          />
          <p className={`mt-3 ${mentrixStudent.pageSubtitle}`}>
            {focus
              ? `${focus.nodeName} is your next open frontier. Open it to move the tree.`
              : "Your frontier is ready. Open All skills next."}
          </p>
        </div>
      </header>

      <SkillTreeCanvas
        data={data}
        onOpenUnit={openUnit}
        bloomNodeIds={bloomNodeIds}
      />

      <MasteryGridHistoryPanel
        history={history}
        momentumActive={momentumActive}
        nodeNameById={nodeNameById}
      />

      <details className={`${mentrixStudent.card} overflow-hidden`}>
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-black text-[#0B1220] marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6366F1] sm:px-5">
          <MentrixaVocabIcon name="skills" size={32} surface="light" title="All skills" />
          <span>All skills</span>
          <span className="ml-auto text-xs font-semibold text-[#6366F1]">
            {data.nodes.length} skills
          </span>
        </summary>
        <div className="border-t border-[#C4B5FD] p-3 sm:p-5">
          <MasteryGridExplorer
            data={data.grid}
            unlockedNodeIds={unlockedNodeIds}
            subjects={[
              {
                key: AP_CALC_AB_SUBJECT,
                name: AP_CALC_AB_SUBJECT,
                active: true,
              },
            ]}
          />
        </div>
      </details>

      {openUnitNumber != null ? (
        <UnitBranch
          data={data}
          unitNumber={openUnitNumber}
          onClose={closeUnit}
          returnFocusTo={unitTriggerRef.current}
        />
      ) : null}
    </>
  );
}
