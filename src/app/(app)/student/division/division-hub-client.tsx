"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DivisionHubCard } from "@/app/actions/divisions";
import { joinDivision } from "@/app/actions/divisions";
import { getDivisionTheme } from "@/lib/division-ui";
import { Button } from "@/components/ui/button";

export function DivisionHubClient({ initialCards }: { initialCards: DivisionHubCard[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (key: string) => {
    setError(null);
    startTransition(async () => {
      const r = await joinDivision(key);
      if (!r.success) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialCards.map((c) => {
          const t = getDivisionTheme(c.key);
          const focused = c.isFocused;
          return (
            <li key={c.key}>
              <div
                className={`flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm transition ${
                  focused
                    ? "border-amber-400 ring-2 ring-amber-300/60"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white bg-gradient-to-br ${t.gradient}`}
                      aria-hidden
                    >
                      {t.emoji}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-900 leading-snug truncate">
                        {c.name.replace(/\s+Division$/i, "")}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {c.memberCount.toLocaleString()} members
                        {c.weeklyRank != null ? (
                          <span className="text-slate-600">
                            {" "}
                            · Weekly rank #{c.weeklyRank}
                          </span>
                        ) : c.isMember ? (
                          <span> · No weekly XP yet</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </div>
                {c.description ? (
                  <p className="mt-3 text-xs text-slate-600 line-clamp-2 flex-1">{c.description}</p>
                ) : (
                  <p className="mt-3 text-xs text-slate-400 flex-1">Subject community & leaderboard.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/student/division/${encodeURIComponent(c.key)}`}>Open</Link>
                  </Button>
                  {!c.isMember ? (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => handleJoin(c.key)}
                      className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Join division
                    </Button>
                  ) : (
                    <span className="text-xs text-emerald-700 self-center font-medium">Joined</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
