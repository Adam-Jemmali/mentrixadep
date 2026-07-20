"use client";

import Link from "next/link";
import { MasteryGridExplorer } from "@/features/mastery-grid/mastery-grid-explorer";
import { MasteryGridHistoryPanel } from "@/features/mastery-grid/mastery-grid-history-panel";
import type { GridSnapshotWeek } from "@/features/mastery-grid/grid-history-pure";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  MentrixaVocabIcon,
  VocabSectionHeading,
} from "@/shared/icons/mentrixa-vocab-icons";

/** Explorer-only mastery surface when SKILL_TREE_FRONTIER=0. */
export function MasteryExplorerFallbackClient({
  data,
  history,
  momentumActive,
}: {
  data: MasteryGridData;
  history: GridSnapshotWeek[];
  momentumActive: boolean;
}) {
  const nodeNameById = Object.fromEntries(
    data.units.flatMap((unit) =>
      unit.nodes.map((node) => [node.id, node.nodeName] as const),
    ),
  );

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
            name="mastery-grid"
            label="Mastery"
            surface="light"
            as="h1"
            labelClassName="mx-hand-title !text-2xl !normal-case !tracking-normal sm:!text-3xl"
          />
          <p className={`mt-3 ${mentrixStudent.pageSubtitle}`}>
            All skills. Open next.
          </p>
        </div>
      </header>

      <MasteryGridHistoryPanel
        history={history}
        momentumActive={momentumActive}
        nodeNameById={nodeNameById}
      />

      <div className={`${mentrixStudent.card} overflow-hidden p-3 sm:p-5`}>
        <MasteryGridExplorer
          data={data}
          subjects={[
            {
              key: AP_CALC_AB_SUBJECT,
              name: AP_CALC_AB_SUBJECT,
              active: true,
            },
          ]}
        />
      </div>
    </>
  );
}
