"use client";

import Image from "next/image";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { RankCardData } from "@/features/rank-card/types";
import { PassportBiodataShell } from "@/features/rank-card/rank-passport-security-layer";
import {
  formatPassportBio,
  formatPassportMemberSince,
  formatPassportMrzLines,
  formatPassportRoleLabel,
  formatPassportTimezone,
  resolvePassportSignature,
} from "@/features/rank-card/rank-passport-identity-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_SESSION_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

function BiodataField({
  label,
  value,
  playfair,
}: {
  label: string;
  value: string;
  playfair?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6366F1]">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate font-bold text-[#0B1220]",
          playfair
            ? "font-[family-name:var(--font-playfair),serif] text-[clamp(1.25rem,3vw,1.65rem)] leading-tight"
            : "rank-passport-laser-ink text-[13px] uppercase",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RoleField({ role }: { role: "student" | "tutor" }) {
  const label = formatPassportRoleLabel(role);
  const icon =
    role === "tutor" ? (
      <MentrixaVocabIcon name={CANONICAL_SESSION_ICON} size={22} surface="light" title={label} />
    ) : (
      <Image src="/icons/mentrixer.svg" alt="" width={22} height={22} className="shrink-0" />
    );

  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6366F1]">Role</p>
      <div className="mt-0.5 flex items-center gap-2">
        {icon}
        <p className="rank-passport-laser-ink truncate text-[13px] font-bold uppercase text-[#0B1220]">
          {label}
        </p>
      </div>
    </div>
  );
}

export function RankPassportIdentityPage({
  data,
  className,
}: {
  data: RankCardData;
  className?: string;
}) {
  const rankVisual = getAccountRankByLevel(data.rankLevel);
  const identity = data.identity;
  const signature = resolvePassportSignature(identity.signature, data.displayName);
  const initial = data.displayName.trim().charAt(0).toUpperCase() || "M";
  const mrz = formatPassportMrzLines(data.username, AP_CALC_AB_SUBJECT, data.displayName);

  return (
    <PassportBiodataShell>
      <div className={cn("rank-passport-id-page flex flex-col gap-2", className)}>
        <div className="flex items-center justify-between gap-2 border-b border-[#6366F1]/25 pb-1">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#475569]">{AP_CALC_AB_SUBJECT}</p>
        </div>

        <div className="grid grid-cols-[6.5rem_1fr] gap-3">
          <div>
            <div className="rank-passport-id-photo rank-passport-laser-photo overflow-hidden rounded-sm border border-[#6366F1]/40 bg-[#E8EEF9]">
              {identity.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars render inside R3F Html
                <img
                  src={identity.avatarUrl}
                  alt=""
                  width={104}
                  height={132}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover grayscale contrast-[1.08]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#E8EEF9] font-[family-name:var(--font-playfair),serif] text-3xl font-bold text-[#6366F1]">
                  {initial}
                </div>
              )}
            </div>
            <div className="mt-1 flex flex-col items-center gap-0.5">
              <RankBadge
                rank={{ level: data.rankLevel, title: data.rankTitle }}
                size="sm"
                active
                surface="light"
                animate={rankVisual.key === "mentrixer" || rankVisual.key === "apex"}
              />
              <span
                className="text-[9px] font-black uppercase tracking-[0.08em]"
                style={{ color: rankVisual.key === "mentrixer" ? "#D4A017" : rankVisual.labelOnLight }}
              >
                {normalizeRankTitle(data.rankTitle)}
              </span>
            </div>
          </div>

          <div className="rank-passport-id-fields grid grid-cols-1 gap-2 content-start">
            <BiodataField label="Name" value={data.displayName} playfair />
            <RoleField role={identity.role} />
            <BiodataField label="Joined" value={formatPassportMemberSince(identity.memberSince)} />
            <BiodataField label="Zone" value={formatPassportTimezone(identity.timezone)} />
            <BiodataField label="Handle" value={`@${data.username}`} />
          </div>
        </div>

        <div className="border-t border-[#6366F1]/20 pt-1">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#6366F1]">Bio</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#334155]">{formatPassportBio(identity.bio)}</p>
        </div>

        <div className="border-t border-[#6366F1]/20 pt-1">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#6366F1]">Sign</p>
          <p className="rank-passport-laser-ink mx-hand-title mt-0.5 text-2xl leading-none text-[#0B1220]">
            {signature}
          </p>
        </div>

        <div className="rank-passport-mrz mt-auto space-y-0.5 border-t border-[#0B1220]/15 pt-1.5">
          {mrz.map((line) => (
            <p key={line} className="font-mono text-[8px] leading-tight tracking-[0.18em] text-[#1E293B]">
              {line}
            </p>
          ))}
        </div>
      </div>
    </PassportBiodataShell>
  );
}
