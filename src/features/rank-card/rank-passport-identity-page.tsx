"use client";

import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { RankCardData } from "@/features/rank-card/types";
import {
  formatPassportBio,
  formatPassportMemberSince,
  formatPassportMrz,
  formatPassportRoleLabel,
  formatPassportSexLabel,
  formatPassportTimezone,
  resolvePassportSignature,
} from "@/features/rank-card/rank-passport-identity-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

function IdentityField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#6366F1]">{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-bold uppercase text-[#0B1220]">{value}</p>
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

  return (
    <div className={cn("rank-passport-id-page flex flex-col gap-2.5", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-[#C4B5FD]/70 pb-1.5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6366F1]">Passport</p>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#475569]">{AP_CALC_AB_SUBJECT}</p>
      </div>

      <div className="grid grid-cols-[8rem_1fr] gap-4">
        <div>
          <div className="rank-passport-id-photo overflow-hidden rounded-md border-2 border-[#6366F1]/35 bg-[#EEF2FF]">
            {identity.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars render inside R3F Html
              <img
                src={identity.avatarUrl}
                alt=""
                width={120}
                height={160}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover grayscale contrast-[1.05]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#EEF2FF] font-[family-name:var(--font-playfair),serif] text-4xl font-bold text-[#6366F1]">
                {initial}
              </div>
            )}
          </div>
          <div className="mt-1.5 flex flex-col items-center gap-1">
            <RankBadge
              rank={{ level: data.rankLevel, title: data.rankTitle }}
              size="sm"
              active
              surface="light"
              animate={rankVisual.key === "mentrixer" || rankVisual.key === "apex"}
            />
            <span
              className="text-[10px] font-black uppercase tracking-[0.08em]"
              style={{ color: rankVisual.key === "mentrixer" ? "#D4A017" : rankVisual.labelOnLight }}
            >
              {normalizeRankTitle(data.rankTitle)}
            </span>
          </div>
        </div>

        <div className="rank-passport-id-fields grid grid-cols-1 gap-2.5 content-start text-[14px]">
          <IdentityField label="Name" value={data.displayName} />
          <IdentityField label="Role" value={formatPassportRoleLabel(identity.role)} />
          <IdentityField label="Joined" value={formatPassportMemberSince(identity.memberSince)} />
          <IdentityField label="Zone" value={formatPassportTimezone(identity.timezone)} />
          <IdentityField label="Sex" value={formatPassportSexLabel(identity.sex)} />
          <IdentityField label="Handle" value={`@${data.username}`} />
        </div>
      </div>

      <div className="border-t border-[#C4B5FD]/50 pt-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6366F1]">Bio</p>
        <p className="mt-0.5 text-[14px] leading-snug text-[#334155]">{formatPassportBio(identity.bio)}</p>
      </div>

      <div className="border-t border-[#C4B5FD]/50 pt-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6366F1]">Sign</p>
        <p className="mx-hand-title mt-0.5 text-3xl leading-none text-[#0B1220]">{signature}</p>
      </div>

      <p className="font-mono text-[9px] leading-tight tracking-wider text-[#64748B]">
        {formatPassportMrz(data.username, AP_CALC_AB_SUBJECT)}
      </p>
    </div>
  );
}

export function RankPassportVerifiedSpread({
  data,
  accuracyPercent,
  topPercent,
  bandCaption,
  className,
}: {
  data: RankCardData;
  accuracyPercent: number;
  topPercent: number | null;
  bandCaption: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-center gap-4 py-4", className)}>
      <div className="flex items-center gap-3">
        <MentrixaVocabIcon name="rank-proof" size={32} surface="light" gold title="Verified" />
        <p className="text-base font-black uppercase tracking-[0.14em] text-[#6366F1]">Verified passport</p>
      </div>
      <p className="font-[family-name:var(--font-playfair),serif] text-[2.5rem] font-bold leading-tight text-[#0B1220]">
        {data.displayName}
      </p>
      <p className="text-xl font-semibold leading-snug text-[#0B1220]">{bandCaption}</p>
      <p className="text-xl font-bold text-[#0B1220]">
        {accuracyPercent}% first try{topPercent != null ? ` · Top ${topPercent}%` : ""}
      </p>
      <p className="text-base text-[#475569]">First attempt only</p>
    </div>
  );
}
