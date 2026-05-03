"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { ClanDashboardPayload, ClanMessageRow } from "@/app/actions/clan-dashboard";
import {
  approveJoinRequest,
  rejectJoinRequest,
} from "@/app/actions/clan-dashboard";
import { setClanAvatarPreset, setClanFocusDivision, uploadClanAvatar } from "@/app/actions/clan";
import { createClanSkillDuel } from "@/app/actions/duel";
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
import { ParticleTextEffect } from "@/components/ui/particle-text-effect";
import { Typewriter } from "@/components/ui/typewriter";
import { GooeyText } from "@/components/ui/gooey-text-morphing";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
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

  async function onDuel(opponentId: string) {
    if (!clan.focus_division_key) {
      alert("Set a focus division first!");
      return;
    }
    setBusy(opponentId);
    const res = await createClanSkillDuel(opponentId, clan.focus_division_key);
    setBusy(null);
    if (res.success) {
      router.push(`/student/duel/${res.duelId}`);
    } else {
      alert(res.error);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 p-6 md:p-10 space-y-12 max-w-7xl mx-auto">
      {/* HEADER: Premium Clean White */}
      <header className="relative flex flex-col md:flex-row items-center md:items-end justify-between gap-8 pb-12 border-b border-slate-100">
        <div className="flex flex-col items-center md:items-start gap-4 flex-1">
          <div className="flex items-center gap-6">
            <ClanAvatarBadge
              name={clan.name}
              avatarKind={clan.avatar_kind}
              presetKey={clan.avatar_preset_key}
              avatarUrl={clan.avatar_url}
              size="lg"
              className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-none shadow-none bg-slate-50"
            />
            <div className="space-y-1">
              <div className="h-6 overflow-hidden">
                <Typewriter
                  text={clan.tag}
                  speed={80}
                  className="text-xs font-bold tracking-[0.3em] uppercase text-slate-600"
                />
              </div>
              <div className="h-[80px] md:h-[100px] flex items-center">
                <ParticleTextEffect
                  words={[clan.name.toUpperCase()]}
                  className="text-left font-black"
                  tone="onLight"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">

            <div className="h-8 min-w-[120px]">
              <GooeyText
                texts={divisionLabel.split(' ')}
                className="text-slate-900"
                textClassName="text-sm font-black"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-12 text-center md:text-right">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Members</p>
            <p className="text-4xl font-black italic tracking-tighter">{memberCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Weekly XP</p>
            <p className="text-4xl font-black italic tracking-tighter text-indigo-600">{weeklyClanXp.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-16">

          {/* BATTLE ROOM: NEW - Play against other clans */}
          <section className="group relative overflow-hidden space-y-8 p-10 bg-[linear-gradient(160deg,#050811_0%,#1e1b4b_100%)] rounded-[40px] shadow-2xl border border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] pointer-events-none" />
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Battle Arena</h2>
                <div className="flex items-center gap-2">
                  
                  
                </div>
              </div>
              <div className="hidden md:block">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Focus</p>
                   <p className="text-xs font-bold text-white mt-1">{divisionLabel}</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <p className="text-sm font-medium leading-relaxed text-slate-400 max-w-sm">
                  Represent <span className="text-white font-bold">{clan.name}</span> in the Global Arena. Defeat rival clans to earn massive Clan XP and climb the World Standings.
                </p>
                <Button
                  onClick={() => router.push('/student/duel')}
                  className="h-16 px-12 rounded-2xl bg-white hover:bg-indigo-50 text-slate-900 font-black italic uppercase tracking-widest text-sm shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.05] active:scale-[0.95]"
                >
                  Fight for Clan
                </Button>
              </div>
              <div className="relative h-48 flex items-center justify-center">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="text-[100px] font-black italic tracking-tighter text-white select-none">WAR</div>
                </motion.div>
                <div className="relative h-32 w-32 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                  <Image
                    src="/icons/mentrixer.svg"
                    alt="Mentrixer"
                    width={128}
                    height={128}
                    unoptimized
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* CHALLENGE: Minimalist & High-End */}
          <section className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Weekly Challenge</h2>
                <div className="mt-1 h-5 overflow-hidden">
                  <Typewriter text={`Complete ${target} Quests for ${CLAN_QUEST_CHALLENGE_BONUS_XP} XP bonus`} speed={30} className="text-xs font-medium text-slate-400" />
                </div>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black italic text-slate-900">{done}</span>
                <span className="text-lg font-bold text-slate-200"> / {target}</span>
              </div>
            </div>

            <div className="relative pt-2">
              <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-slate-900"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              {bonusAwarded && (
                <p className="absolute -top-6 right-0 text-[10px] font-black uppercase tracking-widest text-emerald-500">Bonus Unlocked</p>
              )}
            </div>
          </section>

          {/* STANDINGS: Typography focused */}
          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">Standings</h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Mentrixers</span>
            </div>
            <div className="space-y-2">
              {members.map((m, i) => (
                <motion.div
                  key={m.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-6 py-4 px-2 hover:bg-slate-50/50 transition-colors rounded-2xl group"
                >
                  <span className="w-8 text-2xl font-black italic text-slate-100 group-hover:text-slate-200 transition-colors">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="relative h-12 w-12 shrink-0">
                    {m.avatar_url ? (
                      <Image src={m.avatar_url} alt="" fill unoptimized className="object-cover rounded-full" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-50 rounded-full text-slate-300 font-bold text-xs">
                        {m.display_name?.[0] || 'M'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-slate-900 truncate">
                        {m.display_name?.trim() || `Mentrixer ${m.user_id.slice(0, 8)}`}
                      </span>
                      {m.role === "leader" && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Leader</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <span className="text-xl font-black italic text-slate-900 block">{m.weekly_xp.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Weekly XP</span>
                    </div>

                    {m.user_id !== currentUserId && (
                      <button
                        onClick={() => void onDuel(m.user_id)}
                        disabled={busy === m.user_id}
                        className="h-10 px-6 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:border-slate-900 hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100"
                      >
                        {busy === m.user_id ? "..." : "Friendly Battle"}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* SIDEBAR: Clean & Functional */}
        <aside className="lg:col-span-4 space-y-16">

          <div className="h-[500px] flex flex-col bg-white">
            <ClanChat
              clanId={clan.id}
              initialMessages={initialMessages}
              currentUserId={currentUserId}
              members={members}
            />
          </div>

          <div className="space-y-10">
            {isLeader && (
              <section className="space-y-8">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">Management</h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Badge Preset</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CLAN_AVATAR_PRESETS.map((k) => (
                        <button
                          key={k}
                          onClick={() => void onPreset(k)}
                          disabled={busy !== null}
                          className={cn(
                            "h-12 rounded-xl border font-bold uppercase text-[10px] tracking-tighter transition-all",
                            clan.avatar_preset_key === k
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "border-slate-100 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Custom Emblem</label>
                    <label className="flex items-center justify-center w-full h-12 rounded-xl border border-dashed border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all cursor-pointer group">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={busy !== null}
                        onChange={(e) => void onFile(e)}
                      />
                      <span className="text-xs font-bold text-slate-300 group-hover:text-slate-900 transition-colors uppercase tracking-widest">
                        {busy === "up" ? "Uploading..." : "Upload Image"}
                      </span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Focus Division</label>
                    <Select value={focusSelection} onValueChange={setFocusSelection}>
                      <SelectTrigger className="bg-slate-50 border-none h-12 rounded-xl">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Focus</SelectItem>
                        {divisions.map((d) => (
                          <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {focusError && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{focusError}</p>}
                    <Button
                      className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-widest text-xs"
                      disabled={busy !== null}
                      onClick={() => void onSaveFocus()}
                    >
                      {busy === "focus" ? "Saving..." : "Update Focus"}
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {isLeader && pending.length > 0 && (
              <section className="space-y-8">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">Join Requests</h2>
                <div className="space-y-4">
                  {pending.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="text-xs font-black uppercase tracking-tighter truncate">{p.display_name || "Mentrixer"}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void onApprove(p.id)}
                          disabled={busy !== null}
                          className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void onReject(p.id)}
                          disabled={busy !== null}
                          className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-red-500 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-8">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">History</h2>
              {trophies.length === 0 ? (
                <p className="text-xs font-bold text-slate-200 uppercase tracking-widest italic">Vault Empty</p>
              ) : (
                <div className="space-y-4">
                  {trophies.map((t) => (
                    <div key={t.id} className="flex items-center justify-between group">
                      <div className="space-y-1">
                        <p className="text-sm font-black italic uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">vs {t.opponent_name}</p>
                        <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">{t.ended_label}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase italic tracking-widest",
                        t.won ? "text-emerald-500" : "text-slate-200"
                      )}>
                        {t.won ? "Victory" : "Defeat"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

