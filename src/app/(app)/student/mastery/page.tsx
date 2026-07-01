import { requireRole } from "@/shared/core/auth";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { MasteryGridExplorer } from "@/features/mastery-grid/mastery-grid-explorer";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

export default async function StudentMasteryPage() {
  const user = await requireRole(["student", "admin"]);
  const masteryGrid = await loadMasteryGrid(user.id).catch(() => null);

  if (!masteryGrid) {
    return (
      <div className={mentrixStudent.pageBgHub}>
        <main className={mentrixStudent.main}>
          <p className="text-sm text-violet-200/85">Skill tree is unavailable right now. Try again in a moment.</p>
        </main>
      </div>
    );
  }

  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={mentrixStudent.main}>
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
