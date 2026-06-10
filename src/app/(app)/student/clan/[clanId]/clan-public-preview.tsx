"use client";

import type { PublicClanSnapshot } from "@/features/clans/clan-reads";
import { requestJoinPublicClan } from "@/features/clans/clan-membership";


import { useState } from "react";
import Image from "next/image";


import { ClanAvatarBadge } from "@/features/clans/ui/clan-avatar-badge";
import { Button } from "@/shared/ui/button";
import { BackButton } from "@/shared/ui/back-button";
import { CLAN_MAX_MEMBERS } from "@/features/clans/clan-constants";

type Props = {
  snap: PublicClanSnapshot;
  divisionLabel: string;
};

export function ClanPublicPreview({ snap, divisionLabel }: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const full = snap.member_count >= CLAN_MAX_MEMBERS;

  async function join() {
    setBusy(true);
    setErr(null);
    setInfo(null);
    const r = await requestJoinPublicClan(snap.id);
    setBusy(false);
    if (!r.success) {
      setErr(r.error);
      return;
    }
    if (r.joined) {
      window.location.href = `/student/clan/${snap.id}`;
    } else {
      setErr(null);
      setInfo(
        "Request sent. Access after approval."
      );
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          <Image src="/icons/mentrixer.svg" alt="Mentrixer" width={14} height={14} />
          Mentrixer clan
        </div>
        <div className="flex gap-4">
          <ClanAvatarBadge
            name={snap.name}
            avatarKind={snap.avatar_kind}
            presetKey={snap.avatar_preset_key}
            avatarUrl={snap.avatar_url}
            size="lg"
          />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {snap.tag}
            </p>
            <h1 className="text-xl font-semibold text-slate-900">{snap.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {snap.member_count} / {CLAN_MAX_MEMBERS} members ·{" "}
              {snap.join_mode === "approval" ? "Approval required" : "Open join"}
            </p>
          </div>
        </div>
        {snap.description ? (
          <p className="mt-4 text-sm text-slate-700 leading-relaxed">{snap.description}</p>
        ) : null}
        <p className="mt-3 text-xs text-slate-500">
          Subject focus:{" "}
          {divisionLabel}
        </p>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        {info && <p className="mt-3 text-sm text-slate-700">{info}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" disabled={busy || full} onClick={() => void join()}>
            {full ? "Clan full" : busy ? "…" : "Request to join"}
          </Button>
          <BackButton />
        </div>
      </div>
    </div>
  );
}
