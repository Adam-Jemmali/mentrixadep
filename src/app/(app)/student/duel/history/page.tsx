import Link from "next/link";
import { requireRole } from "@/shared/core/auth";
import { getDuelHistorySummary, listStudentDuels } from "@/features/duels/duel-reads";
import { getDivisionsCatalog } from "@/features/divisions/leaderboard";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getHeadToHeadSummary } from "@/features/duels/duel-reward";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { ProductPageHeader } from "@/features/student-profile/ui/product-page-header";
import { DuelRowActions } from "@/features/student-profile/ui/duel-row-actions";
import { CANONICAL_DUELS_ICON } from "@/shared/icons/vocab-canonical";

export const metadata = { title: "Duel history · Mentrixa" };

export default async function DuelHistoryPage() {
  const user = await requireRole(["student", "admin"]);
  const myId = user.id;

  const [history, rows, divisions] = await Promise.all([
    getDuelHistorySummary(),
    listStudentDuels(),
    getDivisionsCatalog(),
  ]);

  const stats = "error" in history ? null : history;
  const divName = (key: string) =>
    divisions.find((d) => d.key === key)?.name ?? key;

  const admin = createAdminClient();
  const nameById: Record<string, string> = {};
  const opponentIds = new Set<string>();
  for (const r of rows) {
    if (r.is_ai_opponent) continue;
    const oid = r.student_id === myId ? r.opponent_student_id : r.student_id;
    if (oid) opponentIds.add(oid);
  }

  for (const oid of Array.from(opponentIds)) {
    try {
      const { data } = await admin.auth.admin.getUserById(oid);
      const email = data?.user?.email ?? "";
      nameById[oid] = email
        ? (email.split("@")[0] ?? "").trim() || "Learner"
        : "Learner";
    } catch {
      nameById[oid] = "Learner";
    }
  }

  const headToHead: {
    id: string;
    label: string;
    played: number;
    myWins: number;
    theirWins: number;
    ties: number;
  }[] = [];

  for (const oid of Array.from(opponentIds).slice(0, 12)) {
    const h = await getHeadToHeadSummary(admin, myId, oid);
    if (h.played > 0) {
      headToHead.push({
        id: oid,
        label: nameById[oid] ?? "Learner",
        ...h,
      });
    }
  }
  headToHead.sort((a, b) => b.played - a.played);

  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={`${mentrixStudent.mainSlim} space-y-8`}>
        <div className="flex items-center justify-between gap-4">
          <Link href="/student/duel" className={mentrixStudent.hubGhostLink}>
            ← Skill duels
          </Link>
        </div>

        <ProductPageHeader
          icon={CANONICAL_DUELS_ICON}
          eyebrow="Arena record"
          title="Duel history"
          subtitle="Wins, ties, and XP from duels. Streak bonuses and specialist badges appear in your activity feed when you earn them."
        />

        {stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Finished", stats.totalCompleted],
                ["Wins", stats.wins],
                ["Losses", stats.losses],
                ["Duels XP", stats.xpFromDuels],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className={`${mentrixStudent.cardMuted} px-3 py-3`}>
                <p className="mx-hub-type-ui text-[#6366F1]">{label}</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0B1220]">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {stats && stats.byDivision.length > 0 ? (
          <div>
            <h2 className={mentrixStudent.cardTitle}>By subject</h2>
            <ul className={`mt-3 divide-y divide-[#E0E7FF] ${mentrixStudent.cardMuted} overflow-hidden`}>
              {stats.byDivision.map((d) => (
                <li
                  key={d.division_key}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-[#0B1220]">{divName(d.division_key)}</span>
                  <span className="tabular-nums text-[#475569]">
                    {d.wins}W / {d.played - d.wins}L
                    <span className="text-[#94A3B8]"> · </span>
                    {d.played} played
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {headToHead.length > 0 ? (
          <div>
            <h2 className={mentrixStudent.cardTitle}>Head-to-head (learners you’ve faced before)</h2>
            <ul className={`mt-3 divide-y divide-[#E0E7FF] ${mentrixStudent.cardMuted} overflow-hidden`}>
              {headToHead.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-[#0B1220]">{h.label}</span>
                  <span className="tabular-nums text-[#475569]">
                    {h.myWins}–{h.theirWins}
                    {h.ties > 0 ? ` (${h.ties}D)` : ""}
                    <span className="text-[#94A3B8]"> · {h.played} total</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h2 className={mentrixStudent.cardTitle}>Recent duels</h2>
          {rows.filter((r) => r.status === "completed").length === 0 ? (
            <p className={`mt-3 ${mentrixStudent.pageSubtitle}`}>
              No completed duels yet. Win or lose, you’ll see results here.
            </p>
          ) : (
            <ul className={`mt-3 divide-y divide-[#E0E7FF] ${mentrixStudent.cardMuted} overflow-hidden`}>
              {rows
                .filter((r) => r.status === "completed")
                .slice(0, 20)
                .map((r) => {
                  const label =
                    r.is_ai_opponent && r.student_id === myId
                      ? "Sparring Quest"
                      : r.student_id === myId
                        ? nameById[r.opponent_student_id ?? ""] ?? "Learner"
                        : nameById[r.student_id] ?? "Learner";
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[#0B1220]">vs {label}</p>
                        <p className="font-mono text-xs text-[#6366F1]">{divName(r.division_key)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <DuelRowActions
                          duelId={r.id}
                          status={r.status}
                          myId={myId}
                          studentId={r.student_id}
                          opponentStudentId={r.opponent_student_id}
                          isAiOpponent={r.is_ai_opponent}
                        />
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/student/duel/${r.id}`}>Review</Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
