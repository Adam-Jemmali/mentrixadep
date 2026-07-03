import { requireRole } from "@/shared/core/auth";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { MasteryGridExplorer } from "@/features/mastery-grid/mastery-grid-explorer";
import { MasteryGridHistoryPanel } from "@/features/mastery-grid/mastery-grid-history-panel";
import { loadMasteryGridHistory } from "@/features/mastery-grid/grid-snapshot-cron";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

export default async function StudentMasteryPage() {
  const user = await requireRole(["student", "admin"]);
  const [masteryGrid, entitlements, history] = await Promise.all([
    loadMasteryGrid(user.id).catch(() => null),
    getStudentEntitlements(user.id),
    loadMasteryGridHistory(user.id, 12).catch(() => []),
  ]);

  if (!masteryGrid) {
    return (
      <div className={mentrixStudent.pageBgHub}>
        <main className={mentrixStudent.main}>
          <p className={`text-sm ${mentrixStudent.textMutedOnDark}`}>Skill tree is unavailable right now. Try again in a moment.</p>
        </main>
      </div>
    );
  }

  const nodeNameById = Object.fromEntries(
    masteryGrid.units.flatMap((unit) =>
      unit.nodes.map((node) => [node.id, node.nodeName]),
    ),
  );

  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={`${mentrixStudent.main} space-y-6`}>
        <MasteryGridHistoryPanel
          history={history}
          momentumActive={entitlements.momentumActive}
          nodeNameById={nodeNameById}
        />
        <MasteryGridExplorer
          data={masteryGrid}
          subjects={[
            {
              key: AP_CALC_AB_SUBJECT,
              name: AP_CALC_AB_SUBJECT,
              active: true,
            },
          ]}
        />
      </main>
    </div>
  );
}
