"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicClanSnapshot } from "@/app/actions/clan-dashboard";
import { requestJoinPublicClan } from "@/app/actions/clan";
import { ClanAvatarBadge } from "@/components/clan/clan-avatar-badge";
import { Button } from "@/components/ui/button";
import { CLAN_MAX_MEMBERS } from "@/lib/clan-constants";

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
        "Request sent. You’ll get access when the leader approves — check back from Clans in the nav."
      );
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
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
          <Button variant="outline" asChild>
            <Link href="/student/clan">Back</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
