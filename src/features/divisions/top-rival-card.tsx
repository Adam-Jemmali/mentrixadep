"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import type { TopRivalData } from "@/features/divisions/top-rival";
import { buildBeatLineView, BEAT_LINE_CATEGORY } from "@/features/divisions/beat-line-pure";
import { AbCalculusSubjectTitle } from "@/features/quest/ui/ab-calc-subject-title";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { MentrixaVocabIcon, VocabStatColumn, XpCountDisplay } from "@/shared/icons/mentrixa-vocab-icons";
import { VersusMark } from "@/features/divisions/versus-mark";

interface Props {
  rivalData: TopRivalData;
  className?: string;
}

function LeaguePlayerAvatar({
  displayName,
  avatarUrl,
  size = 56,
}: {
  displayName: string;
  avatarUrl: string | null | undefined;
  size?: number;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "M";
  const badgeSize = Math.max(20, Math.round(size * 0.38));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="overflow-hidden rounded-full border-2 border-[#6366F1] bg-[#EEF2FF] shadow-sm"
        style={{ width: size, height: size }}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={size}
            height={size}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#EEF2FF] text-lg font-black text-[#6366F1]">
            {initial}
          </div>
        )}
      </div>
      <span
        className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-[#7C3AED] bg-[#F8F7FF] p-0.5 shadow-sm"
        style={{ width: badgeSize + 4, height: badgeSize + 4 }}
        title="Mentrixer"
      >
        <Image
          src="/icons/mentrixer.svg"
          alt=""
          width={badgeSize}
          height={badgeSize}
          className="h-full w-full object-contain"
        />
      </span>
    </div>
  );
}

export function TopRivalCard({ rivalData, className }: Props) {
  const beatLine = buildBeatLineView(rivalData);
  if (!beatLine) return null;

  const isRank1 = rivalData.status === "rank_1";
  const myName = rivalData.myDisplayName ?? "You";
  const rivalName = rivalData.rivalName ?? "Rival";

  return (
    <StudentStickyNote variant="dog-ear" className={cn("relative h-full", className)}>
      <div className={`${mentrixStudent.hubBook}`}>
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          <div
            className={cn(
              "mx-hub-book-spine flex flex-col items-center gap-3 border-b border-[#C4B5FD] p-5 sm:w-64 sm:shrink-0 sm:border-b-0 sm:border-r",
            )}
          >
            <AbCalculusSubjectTitle hubPaper className="text-base sm:text-lg" />
            <VocabStatColumn
              icon="rank-proof"
              label="Rank"
              value={`#${isRank1 ? 1 : rivalData.myRank}`}
              accent={isRank1 ? "cyan" : "indigo"}
              surface="light"
              iconSize={32}
            />
            {rivalData.myXp != null ? (
              <XpCountDisplay xp={rivalData.myXp} size={26} label="XP" accent="violet" surface="light" />
            ) : null}
          </div>

          <div className={cn("relative flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-6", mentrixStudent.hubBookPage)}>
            <div className="flex items-center gap-2">
              <MentrixaVocabIcon name={beatLine.categoryIcon} size={22} surface="light" title="Beat Line" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6366F1]">{BEAT_LINE_CATEGORY}</p>
            </div>
            <div className="space-y-2">
              {beatLine.lines.map((line) => (
                <p key={line.text} className="flex items-start gap-2 text-sm font-bold text-[#0B1220]">
                  <MentrixaVocabIcon name={line.icon} size={20} surface="light" title={line.text} />
                  <span>{line.text}</span>
                </p>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
              <div className="flex flex-col items-center gap-1.5">
                <LeaguePlayerAvatar displayName={myName} avatarUrl={rivalData.myAvatarUrl} size={56} />
                <span className="max-w-[6.5rem] truncate text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#6366F1]">
                  {myName.split(" ")[0]}
                </span>
              </div>

              {!isRank1 ? (
                <>
                  <VersusMark size="sm" />
                  <div className="flex flex-col items-center gap-1.5">
                    <LeaguePlayerAvatar displayName={rivalName} avatarUrl={rivalData.rivalAvatarUrl} size={52} />
                    <span className="max-w-[6.5rem] truncate text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#7C3AED]">
                      {rivalName.split(" ")[0]}
                    </span>
                  </div>
                  {rivalData.xpGap != null ? (
                    <VocabStatColumn
                      icon="xp"
                      label="Gap"
                      value={rivalData.xpGap}
                      accent="violet"
                      surface="light"
                      iconSize={26}
                    />
                  ) : null}
                </>
              ) : null}
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
              <Link
                href={beatLine.ctaHref}
                className={cn(
                  mentrixStudent.hubBtnSolid,
                  "inline-flex w-full min-w-0 items-center justify-center gap-2.5 px-4 py-2.5 whitespace-nowrap sm:w-auto",
                )}
              >
                <MentrixaVocabIcon
                  name={beatLine.ctaIcon}
                  size={22}
                  surface="dark"
                />
                <span className="text-sm font-black uppercase tracking-[0.08em]">{beatLine.ctaLabel}</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </StudentStickyNote>
  );
}
