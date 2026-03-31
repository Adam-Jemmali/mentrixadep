"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardEntry, DivisionStat } from "@/app/actions/quest";

function LevelBadge({
  tier,
  label,
}: {
  tier: string;
  label: string;
}) {
  const styles: Record<string, string> = {
    bronze: "bg-amber-700/20 text-amber-600 border-amber-600/30",
    silver: "bg-slate-400/20 text-slate-500 border-slate-500/30",
    gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
    platinum: "bg-sky-400/20 text-sky-500 border-sky-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${styles[tier] ?? "bg-muted text-muted-foreground"}`}
    >
      {label}
    </span>
  );
}

export function DivisionTabs({
  leaderboard,
  divisionStats,
}: {
  leaderboard: LeaderboardEntry[];
  divisionStats: DivisionStat[];
}) {
  return (
    <Tabs defaultValue="leaderboard" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="my-divisions">My Divisions</TabsTrigger>
      </TabsList>

      <TabsContent value="leaderboard" className="mt-0">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Top 20</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {leaderboard.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No one in this division yet. Be the first!</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground w-14">Rank</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Division XP</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Streak</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr
                      key={row.userId}
                      className={`border-b border-border/50 ${row.isCurrentUser ? "bg-primary/5" : ""}`}
                    >
                      <td className="p-3">
                        {row.rank <= 3 ? (
                          <span className="text-lg" role="img" aria-hidden>
                            {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">#{row.rank}</span>
                        )}
                      </td>
                      <td className="p-3 font-medium">
                        {row.displayName}
                        {row.isCurrentUser && (
                          <span className="ml-2 text-xs text-primary font-normal">(you)</span>
                        )}
                      </td>
                      <td className="p-3 text-right">{row.divisionXp}</td>
                      <td className="p-3 text-right">🔥 {row.streakDays}</td>
                      <td className="p-3 text-right">
                        <LevelBadge tier={row.level.tier} label={row.level.label} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="my-divisions" className="mt-0">
        <div className="space-y-4">
          {divisionStats.length === 0 ? (
            <Card className="border-2 border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">You don’t have XP in any division yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Complete quests or rate sessions to earn division XP.</p>
              </CardContent>
            </Card>
          ) : (
            divisionStats.map((stat) => (
              <Card key={stat.divisionKey} className="border-2 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{stat.divisionName}</span>
                    <LevelBadge tier={stat.level.tier} label={stat.level.label} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>#{stat.rank} in this division</p>
                  <p>{stat.xp} XP</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

