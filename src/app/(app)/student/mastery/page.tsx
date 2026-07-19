import { Suspense } from "react";
import { requireRole } from "@/shared/core/auth";
import { loadMasteryGridHistory } from "@/features/mastery-grid/grid-snapshot-cron";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadSkillTree } from "@/features/skill-tree/load-skill-tree";
import { SkillTreePageClient } from "@/features/skill-tree/skill-tree-page-client";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

export default async function StudentMasteryPage() {
  const user = await requireRole(["student", "admin"]);
  const [tree, entitlements, history] = await Promise.all([
    loadSkillTree(user.id).catch(() => null),
    getStudentEntitlements(user.id),
    loadMasteryGridHistory(user.id, 12).catch(() => []),
  ]);

  if (!tree) {
    return (
      <div className={mentrixStudent.pageBgHub}>
        <main className={mentrixStudent.main}>
          <p className={`text-sm ${mentrixStudent.textMutedOnLight}`}>
            Skill tree is unavailable right now. Try again in a moment.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={`${mentrixStudent.main} space-y-6`}>
        <Suspense fallback={null}>
          <SkillTreePageClient
            data={tree}
            history={history}
            momentumActive={entitlements.momentumActive}
          />
        </Suspense>
      </main>
    </div>
  );
}
