import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStudentDivision,
  getDivisionLeaderboard,
  getStudentDivisionStats,
  getActiveDivisions,
  getStudentQuestHistory,
} from "@/app/actions/quest";
import { DivisionPageClient } from "./DivisionPageClient";
import { RefreshRouter } from "@/components/refresh-router";
import type { LevelInfo } from "@/lib/levels";

export const metadata = { title: "Division · Mentrixa" };

export default async function DivisionPage() {
  const user = await requireRole(["student", "admin"]);

  const adminClient = createAdminClient();
  const { data: settingsRow } = await adminClient
    .from("user_settings")
    .select("focused_division_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const focusedDivisionKey =
    typeof settingsRow?.focused_division_key === "string"
      ? settingsRow.focused_division_key
      : null;

  const [primary, divisionsCatalog, questHistory] = await Promise.all([
    getStudentDivision(user.id),
    getActiveDivisions(),
    getStudentQuestHistory(50),
  ]);

  const leaderboard = primary
    ? await getDivisionLeaderboard(primary.divisionKey, user.id)
    : [];
  const divisionStats = await getStudentDivisionStats(user.id);

  const learnersOnLeaderboard = leaderboard.length;
  const xpByDivisionKey = Object.fromEntries(
    divisionStats.map((s) => [s.divisionKey, s.xp])
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <RefreshRouter pollMs={50000} />
      <DivisionPageClient
        divisionKey={primary?.divisionKey ?? null}
        divisionName={primary?.divisionName ?? null}
        divisionDescription={primary?.divisionDescription ?? null}
        focusedDivisionKey={focusedDivisionKey}
        divisionsCatalog={divisionsCatalog}
        learnersOnLeaderboard={learnersOnLeaderboard}
        xpByDivisionKey={xpByDivisionKey}
        rank={primary?.rank ?? null}
        divisionXp={primary?.divisionXp ?? null}
        level={(primary?.level as LevelInfo) ?? null}
        leaderboard={leaderboard}
        divisionStats={divisionStats}
        questHistory={questHistory}
      />
    </div>
  );
}
