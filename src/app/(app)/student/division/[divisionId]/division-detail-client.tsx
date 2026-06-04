"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  MessageSquare, 
  Trophy, 
  Target, 
  Flame,
  Info,
  Users
} from "lucide-react";
import type { DivisionDetailPayload } from "@/app/actions/divisions";
import { joinDivision, postDivisionMessage } from "@/app/actions/divisions";
import { setFocusedDivision } from "@/app/actions/quest";
import { getDivisionTheme } from "@/lib/division-ui";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeaderboardTierRank } from "@/components/student/leaderboard-tier-rank";

function RankingAvatar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "M";

  if (avatarUrl) {
    return (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white/10 ring-1 ring-slate-200">
        <Image
          src={avatarUrl}
          alt=""
          fill
          unoptimized
          className="object-cover bg-slate-100"
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
      {initial}
    </div>
  );
}

export function DivisionDetailClient({
  divisionKey,
  initial,
}: {
  divisionKey: string;
  initial: DivisionDetailPayload;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const theme = getDivisionTheme(divisionKey);

  const onJoin = () => {
    setBanner(null);
    startTransition(async () => {
      const r = await joinDivision(divisionKey);
      setBanner(r.success ? null : r.error);
      if (r.success) router.refresh();
    });
  };

  const onFocus = () => {
    setBanner(null);
    startTransition(async () => {
      const r = await setFocusedDivision(divisionKey);
      setBanner(r.success ? "Focused division updated." : r.error);
      if (r.success) router.refresh();
    });
  };

  const onPost = (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const text = msg.trim();
    if (!text) return;
    startTransition(async () => {
      const r = await postDivisionMessage(divisionKey, text);
      if (!r.success) {
        setBanner(r.error);
        return;
      }
      setMsg("");
      router.refresh();
    });
  };

  const formatWhen = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <div className={cn(mentrixStudent.pageBg, "pb-32")}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-12 relative z-10">
        
        {/* BREADCRUMBS */}
        <nav className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
          <Link href="/student/division" className="hover:text-indigo-500 transition-colors">
            Divisions
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">{initial.division.name}</span>
        </nav>

        {/* HERO SECTION - Clash Royale Style */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(mentrixStudent.heroGradient, "p-8 sm:p-12")}
        >
          <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-start lg:items-center">
            
            {/* ICON & TITLE */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left flex-1">
              <div className="relative group">
                <div className={cn("absolute -inset-4 rounded-3xl opacity-20 blur-2xl group-hover:opacity-40 transition bg-gradient-to-br", theme.gradient)} />
                <div className={cn("relative flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-white/20 bg-white/5 backdrop-blur-md shadow-2xl text-4xl font-black italic", theme.ring)}>
                  <span className="drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{theme.emoji}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none">
                    {initial.division.name}
                  </h1>
                  {initial.isFocused && (
                    <span className="px-3 py-1 rounded-full bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/50">
                      Focused
                    </span>
                  )}
                </div>
                <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-300/90">
                  {initial.division.description || `Master ${initial.division.name} and compete for the top spot.`}
                </p>
                
                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap items-center gap-3 pt-4 justify-center sm:justify-start">
                   {!initial.isMember ? (
                      <Button
                        type="button"
                        onClick={onJoin}
                        disabled={isPending}
                        className="h-12 px-8 rounded-xl bg-white text-slate-900 font-black italic uppercase tracking-widest text-xs hover:bg-slate-100 shadow-xl shadow-white/10 active:scale-95 transition-all"
                      >
                        Join Division
                      </Button>
                   ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm">
                            <Users className="w-3.5 h-3.5 opacity-80 text-indigo-400" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Member</span>
                        </div>
                        {!initial.isFocused && (
                           <Button
                             type="button"
                             onClick={onFocus}
                             disabled={isPending}
                             variant="outline"
                             className="h-10 px-4 rounded-xl border-white/20 text-white font-black italic uppercase tracking-widest text-[10px] hover:bg-white/5 active:scale-95 transition-all"
                           >
                             Main Focus Division
                           </Button>
                        )}
                      </div>
                   )}
                </div>
              </div>
            </div>

            {/* QUICK STATS - Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-4 w-full lg:w-64">
              <StatCard icon={<Users className="w-4 h-4 text-white/70" />} label="Members" value={initial.memberCount} />
              <StatCard icon={<Image src="/images/xp.webp" alt="" width={16} height={16} unoptimized />} label="Weekly XP pool" value={initial.weeklyPoolXp} />
              <StatCard icon={<Image src="/images/pending.webp" alt="" width={16} height={16} unoptimized className="opacity-50 grayscale invert" />} label="Week start (UTC)" value={initial.weekStart} />
            </div>
          </div>
        </motion.header>

        {banner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3 text-indigo-400"
          >
            <Info className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest leading-none">{banner}</p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* MAIN CONTENT - Leaderboards & Activity */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* QUICK ACTION TILES - Duolingo Style */}
            <div className="grid sm:grid-cols-2 gap-4">
               <ActionTile 
                 href="/student/duel"
                 icon={<Image src="/images/sword.webp" alt="Sword" width={32} height={32} unoptimized />}
                 title="Skill duels"
                 description="Challenge others in real-time battles in your FOCUSED division "
                 color="bg-indigo-600"
               />
               <ActionTile 
                 href="/student/quest"
                 icon={<Image src="/images/quest.webp" alt="Quest" width={32} height={32} unoptimized />}
                 title="Quest lab"
                 description="Experiment and master your skills"
                 color="bg-indigo-600"
               />
            </div>

            {/* WEEKLY LEADERBOARD */}
            <section className="space-y-6">
              <div className="flex items-end justify-between px-2">
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Weekly XP · Top 50</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resets every Monday 00:00 UTC. Top 3 each week earn bonus XP !</p>
                </div>
              </div>
              
              <LeaderboardTableWeekly rows={initial.weeklyLeaderboard} />
            </section>

            {/* ALL-TIME LEADERBOARD */}
            <section className="space-y-6">
              <div className="px-2">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">All-time division XP</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Division Ranking</p>
              </div>
              <LeaderboardTableAllTime rows={initial.allTimeLeaderboard} />
            </section>

          </div>

          {/* SIDEBAR - Activity & Chat */}
          <aside className="lg:col-span-4 space-y-12 lg:sticky lg:top-8 lg:self-start">
            
            {/* RECENT ACTIVITY */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                 <Target className="w-4 h-4 text-indigo-500" />
                 <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Recent activity</h2>
              </div>
              <div className={cn(mentrixStudent.card, "overflow-hidden")}>
                <ul className="divide-y divide-slate-100">
                  {initial.activity.length === 0 ? (
                    <li className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">No recent pulses</li>
                  ) : (
                    initial.activity.map((a, i) => (
                      <motion.li 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={`${a.userId}-${a.completedAt}-${i}`} 
                        className="p-4 flex gap-3 hover:bg-slate-50 transition-colors"
                      >
                         <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                            <Image src="/images/xp.webp" alt="" width={12} height={12} unoptimized />
                         </div>
                         <div className="min-w-0">
                            <p className="text-[11px] leading-tight text-slate-700">
                              <span className="font-bold text-slate-900">{a.displayName}</span> just completed a Quest in this division
                            </p>
                            <p suppressHydrationWarning className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatWhen(a.completedAt)}</p>
                         </div>
                      </motion.li>
                    ))
                  )}
                </ul>
              </div>
            </section>

            {/* DISCUSSION */}
            <section className="space-y-6 flex flex-col h-[600px]">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Discussion</h2>
                 </div>
                
              </div>
              
              <div className={cn(mentrixStudent.card, "flex-1 flex flex-col min-h-[400px] bg-slate-50/50 backdrop-blur-sm")}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {initial.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                       <MessageSquare className="w-8 h-8 text-slate-200 mb-2" />
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Quiet in here...</p>
                    </div>
                  ) : (
                    initial.messages.map((m) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={m.id} 
                        className="group"
                      >
                         <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="text-[10px] font-black italic text-slate-400 uppercase">{m.displayName}</span>
                            <span suppressHydrationWarning className="text-[8px] font-bold text-slate-300 uppercase">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                         <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm text-xs text-slate-700 leading-relaxed break-words">
                            {m.body}
                         </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-white border-t border-slate-100">
                  {initial.isMember ? (
                    <form onSubmit={onPost} className="relative">
                      <textarea
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                        rows={2}
                        maxLength={4000}
                        placeholder="Say something to your division…"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none pr-12"
                      />
                      <button 
                        type="submit" 
                        disabled={isPending || !msg.trim()}
                        className="absolute right-3 bottom-3 p-1.5 rounded-xl bg-indigo-600 text-white disabled:opacity-30 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <div className="text-center p-2">
                       <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 italic">Join to participate</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 transition-all hover:bg-white/10 group">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{label}</span>
      </div>
      <p className="text-2xl font-black italic tracking-tighter text-white tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function ActionTile({ href, icon, title, description, color }: { href: string; icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(mentrixStudent.card, "p-6 flex items-center gap-5 group relative overflow-hidden transition-all hover:border-slate-300")}
      >
        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6", color)}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-black italic uppercase tracking-tight text-slate-900 flex items-center gap-2">
            {title}
            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-[11px] font-medium text-slate-400">{description}</p>
        </div>
        <div className="absolute top-0 right-0 p-2 opacity-[0.03] grayscale pointer-events-none group-hover:opacity-[0.06] transition-opacity">
           <Image src="/mentrixalogo/logo.webp" alt="" width={60} height={60} />
        </div>
      </motion.div>
    </Link>
  );
}

function LeaderboardTableWeekly({
  rows,
}: {
  rows: DivisionDetailPayload["weeklyLeaderboard"];
}) {
  return (
    <div className={cn(mentrixStudent.card, "overflow-hidden")}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">#</th>
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Weekly XP</th>
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Streak</th>
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Rank</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            return (
              <motion.tr
                key={r.userId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "group transition-colors hover:bg-slate-50/50",
                  r.isCurrentUser && "bg-indigo-50/50"
                )}
              >
                <td className="py-4 px-6">
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black italic tabular-nums",
                    r.rank === 1 ? "bg-indigo-600 text-white border border-indigo-400 shadow-sm" :
                    r.rank === 2 ? "bg-slate-800 text-white border border-slate-700" :
                    r.rank === 3 ? "bg-purple-600 text-white border border-purple-400 shadow-sm" :
                    "text-slate-400"
                  )}>
                    {r.rank}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <RankingAvatar displayName={r.displayName} avatarUrl={r.avatarUrl} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {r.displayName}
                        {r.isCurrentUser && <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">YOU</span>}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-black italic tabular-nums text-slate-900">
                  {r.weeklyXp.toLocaleString()}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-center gap-1">
                    <Flame className={cn("w-3.5 h-3.5", r.streakDays > 0 ? "text-orange-500" : "text-slate-200")} />
                    <span className="text-xs font-bold text-slate-500">{r.streakDays}d</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <LeaderboardTierRank
                    totalXp={r.totalXp}
                    divisionTier={r.level.tier}
                  />
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="p-12 text-center">
           <Trophy className="w-10 h-10 text-slate-100 mx-auto mb-3" />
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 italic">Earn XP this week to claim your spot</p>
        </div>
      )}
    </div>
  );
}

function LeaderboardTableAllTime({
  rows,
}: {
  rows: DivisionDetailPayload["allTimeLeaderboard"];
}) {
  return (
    <div className={cn(mentrixStudent.card, "overflow-hidden")}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">#</th>
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Division XP</th>
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Streak</th>
            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Rank</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            return (
              <tr
                key={r.userId}
                className={cn(
                  "group transition-colors hover:bg-slate-50/50",
                  r.isCurrentUser && "bg-indigo-50/50"
                )}
              >
                <td className="py-4 px-6">
                  <span className="text-xs font-black italic tabular-nums text-slate-400">{r.rank}</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <RankingAvatar displayName={r.displayName} avatarUrl={r.avatarUrl} />
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {r.displayName}
                      {r.isCurrentUser && <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">YOU</span>}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-black italic tabular-nums text-slate-900">
                  {r.divisionXp.toLocaleString()}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-center gap-1">
                    <Flame className={cn("w-3.5 h-3.5", r.streakDays > 0 ? "text-orange-500" : "text-slate-200")} />
                    <span className="text-xs font-bold text-slate-500">{r.streakDays}d</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <LeaderboardTierRank
                    totalXp={r.totalXp}
                    divisionTier={r.level.tier}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="p-12 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300 italic">History is yet to be written</div>
      )}
    </div>
  );
}
