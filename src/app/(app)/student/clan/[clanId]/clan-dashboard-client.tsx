"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { ClanDashboardPayload, ClanMessageRow } from "@/app/actions/clan-dashboard";
import {
  approveJoinRequest,
  rejectJoinRequest,
} from "@/app/actions/clan-dashboard";
import { setClanAvatarPreset, setClanFocusDivision, uploadClanAvatar } from "@/app/actions/clan";
import { CLAN_AVATAR_PRESETS, CLAN_QUEST_CHALLENGE_BONUS_XP } from "@/lib/clan-constants";
import { ClanAvatarBadge } from "@/components/clan/clan-avatar-badge";
import { ClanChat } from "@/components/clan/clan-chat";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Pending = {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
};

type Props = {
  data: ClanDashboardPayload;
  initialMessages: ClanMessageRow[];
  pending: Pending[];
  currentUserId: string;
  isLeader: boolean;
  divisionLabel: string;
  divisions: { key: string; name: string }[];
};

export function ClanDashboardClient({
  data,
  initialMessages,
  pending,
  currentUserId,
  isLeader,
  divisionLabel,
  divisions,
}: Props) {
  const { clan, memberCount, weeklyClanXp, challenge, members, trophies } = data;
  const [busy, setBusy] = useState<string | null>(null);
  const [focusSelection, setFocusSelection] = useState<string>(clan.focus_division_key ?? "__none__");
  const [focusError, setFocusError] = useState<string | null>(null);

  const ch = challenge;
  const target = ch?.quest_target ?? 20;
  const done = ch?.quests_completed ?? 0;
  const pct = Math.min(100, Math.round((done / target) * 100));
  const bonusAwarded = Boolean(ch?.bonus_awarded_at);

  async function onApprove(requestId: string) {
    setBusy(requestId);
    await approveJoinRequest(requestId);
    setBusy(null);
    window.location.reload();
  }

  async function onReject(requestId: string) {
    setBusy(requestId);
    await rejectJoinRequest(requestId);
    setBusy(null);
    window.location.reload();
  }

  async function onPreset(key: string) {
    setBusy("preset");
    await setClanAvatarPreset(clan.id, key);
    setBusy(null);
    window.location.reload();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy("up");
    const fd = new FormData();
    fd.set("file", f);
    await uploadClanAvatar(clan.id, fd);
    setBusy(null);
    window.location.reload();
  }

  async function onSaveFocus() {
    setBusy("focus");
    setFocusError(null);
    const key = focusSelection === "__none__" ? null : focusSelection;
    const res = await setClanFocusDivision(clan.id, key);
    setBusy(null);
    if (!res.success) {
      setFocusError(res.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden rounded-lg border border-white/20 bg-gradient-to-b from-[#182846]/95 via-[#12223e]/95 to-[#0d1c35]/95 text-white"
      >
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
            <Image src="/icons/mentrixer.svg" alt="Mentrixer" width={14} height={14} />
            Mentrixer clan board
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <ClanAvatarBadge
                name={clan.name}
                avatarKind={clan.avatar_kind}
                presetKey={clan.avatar_preset_key}
                avatarUrl={clan.avatar_url}
                size="lg"
                className="border-white/30 bg-white/10 text-slate-100"
              />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {clan.tag}
                </p>
                <h1 className="text-xl font-semibold tracking-tight">{clan.name}</h1>
                {clan.description ? (
                  <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
                    {clan.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-400">
                  Focus:{" "}
                  {divisionLabel}
                  {" · "}
                  Join: {clan.join_mode === "approval" ? "Leader approval" : "Open"}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center sm:text-right">
              <div>
                <dt className="text-[10px] font-medium uppercase text-slate-500">
                  Members
                </dt>
                <dd className="text-lg font-semibold tabular-nums">{memberCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-medium uppercase text-slate-500">
                  Week XP
                </dt>
                <dd className="text-lg font-semibold tabular-nums">{weeklyClanXp}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-medium uppercase text-slate-500">
                  Clan XP
                </dt>
                <dd className="text-lg font-semibold tabular-nums">{clan.xp_total}</dd>
              </div>
            </dl>
          </div>
        </div>
      </motion.header>

      {isLeader ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-900">Clan identity</h2>
          <p className="text-xs text-slate-500 mt-1">
            Preset badge or upload your square image
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CLAN_AVATAR_PRESETS.map((k) => (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={clan.avatar_preset_key === k ? "default" : "outline"}
                className="capitalize"
                disabled={busy !== null}
                onClick={() => void onPreset(k)}
              >
                {k}
              </Button>
            ))}
            <label className="inline-flex">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={busy !== null}
                onChange={(e) => void onFile(e)}
              />
              <span className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
                {busy === "up" ? "Uploading…" : "Upload"}
              </span>
            </label>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-medium text-slate-900">Focus division</h3>
            <p className="mt-1 text-xs text-slate-500">Update what your clan is focusing on this week.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={focusSelection} onValueChange={setFocusSelection}>
                <SelectTrigger className="sm:max-w-xs">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No focus</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={busy !== null}
                onClick={() => void onSaveFocus()}
              >
                {busy === "focus" ? "Saving…" : "Save focus"}
              </Button>
            </div>
            {focusError ? <p className="mt-2 text-xs text-red-600">{focusError}</p> : null}
          </div>
        </section>
      ) : null}

      {isLeader && pending.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
          <h2 className="text-sm font-medium text-amber-950">Join requests</h2>
          <ul className="mt-3 divide-y divide-amber-100">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="text-amber-950">
                  {p.display_name?.trim() || `Mentrixer ${p.user_id.slice(0, 8)}`}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void onApprove(p.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void onReject(p.id)}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-slate-900">Weekly challenge</h2>
            <p className="text-xs text-slate-500 mt-1">
              Together, complete {target} Quests this week. When the bar fills, the clan earns{" "}
              {CLAN_QUEST_CHALLENGE_BONUS_XP} bonus XP (once per week).
            </p>
          </div>
          {bonusAwarded ? (
            <span className="text-xs font-medium text-emerald-700">Bonus earned this week</span>
          ) : null}
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full bg-slate-800"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-600 tabular-nums">
          {done} / {target} Quests completed · {pct}%
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-medium text-slate-900">This week’s standings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Division XP earned this UTC week (all subjects).
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {members.map((m, i) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="text-slate-500 tabular-nums w-6">{i + 1}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2 text-slate-900">
                  <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {m.avatar_url ? (
                      <Image src={m.avatar_url} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <Image src="/icons/mentrixer.svg" alt="Mentrixer" width={14} height={14} className="opacity-75" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 truncate">
                    {m.display_name?.trim() || `Mentrixer ${m.user_id.slice(0, 8)}`}
                    {m.role === "leader" ? (
                      <span className="ml-2 text-xs text-amber-700">Leader</span>
                    ) : null}
                  </span>
                </span>
                <span className="tabular-nums text-slate-700">{m.weekly_xp} XP</span>
              </li>
            ))}
          </ul>
        </section>

        <ClanChat
          clanId={clan.id}
          initialMessages={initialMessages}
          currentUserId={currentUserId}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-900">Trophy room</h2>
        <p className="text-xs text-slate-500 mt-1">
          Clan wars will appear here when the feature goes live. Past wins are kept for bragging rights.
        </p>
        {trophies.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No completed wars yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {trophies.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="text-slate-800">
                  vs {t.opponent_name}{" "}
                  <span className="text-slate-400">· {t.ended_label}</span>
                </span>
                <span
                  className={
                    t.won ? "font-medium text-emerald-700" : "text-slate-500"
                  }
                >
                  {t.won ? "Won" : "Lost"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
