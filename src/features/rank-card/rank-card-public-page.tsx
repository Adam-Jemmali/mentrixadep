import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import type { RankCardData } from "@/features/rank-card/types";
import { RankPassportArticle, RankPassportTopBar } from "@/features/rank-card/rank-passport-article";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import Link from "next/link";

export function RankCardPublicPage({ data }: { data: RankCardData }) {
  return (
    <div className="mentrix-student-type-scope mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-12">
      <RankPassportTopBar />
      <RankPassportArticle data={data} className="mb-8" />
      {data.masteryGrid ? (
        <div className="mb-8">
          <MasteryGrid data={data.masteryGrid} showLegend readOnly className="rotate-0" />
        </div>
      ) : null}
    </div>
  );
}

export function RankCardPrivateNotice({ username }: { username: string }) {
  return (
    <div className="mentrix-student-type-scope mx-auto max-w-lg px-4 pb-24 pt-8">
      <RankPassportTopBar />
      <div
        className={cn(
          mentrixStudent.hubSticky,
          "flex min-h-[50vh] rotate-0 flex-col items-center justify-center py-16 text-center",
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6366F1]">
          @{username}
        </p>
        <h1 className={cn(mentrixHubSurfaces.inkTitle, "mt-4 text-3xl")}>
          This passport is private
        </h1>
        <p className={cn(mentrixHubSurfaces.inkBody, "mt-4 max-w-sm text-sm leading-relaxed")}>
          The owner chose to keep this verified record private.
        </p>
        <Link href="/" className={cn(mentrixHubSurfaces.ghostLink, "mt-8")}>
          Back to Mentrixa
        </Link>
      </div>
    </div>
  );
}
