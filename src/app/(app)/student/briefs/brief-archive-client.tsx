"use client";

import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { ProductPageHeader } from "@/features/student-profile/ui/product-page-header";
import type { BriefArchiveRow } from "@/features/pre-session-brief/load-brief-archive";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";

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
        <Link href="/student" className={mentrixStudent.hubGhostLink}>
          ← Back to hub
        </Link>

        <ProductPageHeader
          icon="brief"
          eyebrow="Archive"
          title="Pre-session brief archive"
          subtitle="Every brief from past Guide sessions: date, Guide, and target nodes."
        />

        {!momentumActive ? (
          <div className={`${mentrixStudent.card} p-6 ${mentrixStudent.pageSubtitle}`}>
            Your latest upcoming brief stays on the hub. The full archive is included with Momentum.
          </div>
        ) : briefs.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 ${mentrixStudent.pageSubtitle}`}>
            Briefs appear here after your first pre-session brief is generated.
          </div>
        ) : (
          <ul className="space-y-4">
            {briefs.map((brief) => (
              <li key={brief.id} className={`${mentrixStudent.card} p-5 sm:p-6`}>
                <VocabSectionHeading name="brief" label="Session brief" surface="light" />
                <p className={`mt-1 text-xs ${mentrixStudent.textMutedOnLight}`}>
                  {new Date(brief.sessionStartTime).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {brief.guideName} · {brief.course}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#0B1220]">
                  {brief.targetNodes.length > 0
                    ? `Target nodes: ${brief.targetNodes.join(", ")}`
                    : brief.likelyCoverage.length > 0
                      ? `Likely coverage: ${brief.likelyCoverage.slice(0, 3).join(", ")}`
                      : "Brief generated for this session."}
                </p>
                <p className={`mt-1 text-sm ${mentrixStudent.pageSubtitle}`}>
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
