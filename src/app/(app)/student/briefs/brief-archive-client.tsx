"use client";

import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { BriefArchiveRow } from "@/features/pre-session-brief/load-brief-archive";

export function BriefArchiveClient({
  briefs,
  momentumActive,
}: {
  briefs: BriefArchiveRow[];
  momentumActive: boolean;
}) {
  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={`${mentrixStudent.main} space-y-6`}>
        <div>
          <Link href="/student" className="text-sm text-violet-300 hover:text-violet-100">
            Back to hub
          </Link>
          <h1 className="mt-2 text-2xl font-black text-white">Pre-session brief archive</h1>
          <p className="mt-1 text-sm text-violet-200/85">
            Every brief from past Guide sessions: date, Guide, and target nodes.
          </p>
        </div>

        {!momentumActive ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            Your latest upcoming brief stays on the hub. Momentum unlocks the full archive.
            <Link href="/student/subscribe" className="ml-1 font-semibold text-indigo-600 underline">
              Upgrade to Momentum
            </Link>
          </div>
        ) : briefs.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            Briefs appear here after your first pre-session brief is generated.
          </div>
        ) : (
          <ul className="space-y-4">
            {briefs.map((brief) => (
              <li key={brief.id} className={`${mentrixStudent.card} p-5 sm:p-6`}>
                <p className={mentrixStudent.sectionEyebrowOnLight}>Session brief</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(brief.sessionStartTime).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {brief.guideName} · {brief.course}
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-900">
                  {brief.targetNodes.length > 0
                    ? `Target nodes: ${brief.targetNodes.join(", ")}`
                    : brief.likelyCoverage.length > 0
                      ? `Likely coverage: ${brief.likelyCoverage.slice(0, 3).join(", ")}`
                      : "Brief generated for this session."}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Scroll back to compare what you planned versus what moved on the grid.
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
