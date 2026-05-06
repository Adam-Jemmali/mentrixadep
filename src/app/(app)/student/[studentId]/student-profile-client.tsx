"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { StudentProfileData } from "@/lib/student-profile";
import { xpTierProgressFraction } from "@/lib/student-profile";
import {
  updateStudentProfile,
  updateStudentAvatarUrl,
  clearStudentAvatar,
} from "@/app/actions/student-profile";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { APP_TIMEZONES } from "@/lib/timezones";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserSettings } from "@/app/actions/settings";
import type { ReferralDashboardData } from "@/app/actions/referral";
import { ReferralProgramSection } from "@/components/student/referral-program-section";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { Typewriter } from "@/components/ui/typewriter";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

// ─── Shared Battle UI Components ─────────────────────────────────────────────

function ProfileToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-indigo-50 py-4 last:border-b-0">
      <div className="space-y-1">
        <p className="text-sm font-bold text-indigo-900">{label}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
          checked ? "bg-indigo-600" : "bg-indigo-100",
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function XpBar({ data }: { data: StudentProfileData }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const widthPct = xpTierProgressFraction(data) * 100;
  const pct = Math.round(widthPct);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-indigo-400">
        <span>Mastery Progress</span>
        <span className="tabular-nums text-indigo-900">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-50 ring-1 ring-indigo-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-600 to-cyan-500 shadow-[0_2px_8px_rgba(79,70,229,0.2)]"
          initial={{ width: 0 }}
          animate={{ width: mounted ? `${widthPct}%` : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
        />
      </div>
      {data.xpToNextLevel != null && (
        <p className="text-[10px] font-medium text-slate-400 italic">
          <span className="tabular-nums text-indigo-500">+{data.xpToNextLevel}</span> XP required for next rank
        </p>
      )}
    </div>
  );
}


function SaveToast({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-8 left-1/2 z-[200] -translate-x-1/2 rounded-full border border-indigo-100 bg-white px-8 py-3 text-sm font-black uppercase italic tracking-widest text-indigo-600 shadow-2xl shadow-indigo-600/10"
          role="status"
        >
          Identity Synchronized
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Student Profile Form Section ────────────────────────────────────────────

function StudentProfileFormSection({
  initial,
  divisions,
  onSaved,
}: {
  initial: UserSettings;
  divisions: { key: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UserSettings>(initial);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    startTransition(async () => {
      const res = await updateStudentProfile({
        display_name: form.display_name ?? "",
        bio: form.bio ?? "",
        timezone: form.timezone,
        profile_visible_to_tutors: form.profile_visible_to_tutors,
        duel_opt_in: form.duel_opt_in,
        focused_division_key: form.focused_division_key ?? "",
        email_session_reminders: form.email_session_reminders,
        email_session_booked: form.email_session_booked,
        email_session_cancelled: form.email_session_cancelled,
        email_weekly_summary: form.email_weekly_summary,
        email_marketing: form.email_marketing,
      });
      if (!res.success) {
        setErr(res.error);
        return;
      }
      onSaved();
    });
  }

  const inputClasses = "mt-1.5 border-indigo-100 bg-slate-50/50 text-indigo-900 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl";

  return (
    <section className="mt-8 overflow-hidden rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.08)]">
        <div className="flex items-center gap-3 mb-8">
         
           <h2 className="text-xs font-black uppercase tracking-[0.25em] text-indigo-950">Identity Management</h2>
        </div>

        <div className="space-y-8">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <Label htmlFor="dn" className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Display Name
              </Label>
              <Input
                id="dn"
                value={form.display_name ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, display_name: e.target.value }))
                }
                className={inputClasses}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="tz" className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Temporal Focus (Timezone)
              </Label>
              <select
                id="tz"
                value={form.timezone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, timezone: e.target.value }))
                }
                className={cn(inputClasses, "flex h-11 w-full rounded-xl border px-4 text-sm focus-visible:outline-none focus-visible:ring-2")}
              >
                {APP_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              Personal Creed (Bio)
            </Label>
            <Textarea
              id="bio"
              value={form.bio ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              maxLength={280}
              className={cn(inputClasses, "resize-none text-sm leading-relaxed p-4")}
              placeholder="Your mission, your goals, or your battle philosophy."
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-indigo-50 bg-indigo-50/30 p-5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Battle Focus</Label>
              <p className="mt-1 text-[11px] text-slate-500 italic">
                Your primary division for leaderboards.
              </p>
              <Select
                value={form.focused_division_key ?? "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    focused_division_key: v === "__none__" ? null : v,
                  }))
                }
              >
                <SelectTrigger className="mt-4 h-11 border-indigo-100 bg-white text-indigo-900 focus:ring-indigo-500 rounded-xl">
                  <SelectValue placeholder="No Focus" />
                </SelectTrigger>
                <SelectContent className="border-indigo-100 bg-white text-indigo-900">
                  <SelectItem value="__none__">None</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-center">
               <ProfileToggle
                label="Global Profile Visibility"
                description="Allow other Mentrixers and Guides to find your profile."
                checked={form.profile_visible_to_tutors}
                onChange={(v) => setForm((f) => ({ ...f, profile_visible_to_tutors: v }))}
              />
              <ProfileToggle
                label="Duel Invitations"
                description="Enable 1v1 skill challenges from peers."
                checked={form.duel_opt_in}
                onChange={(v) => setForm((f) => ({ ...f, duel_opt_in: v }))}
              />
            </div>
          </div>

          <div className="border-t border-indigo-50 pt-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">Signal Settings (Notifications)</h3>
            <div className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
              <ProfileToggle
                label="Session Alarms"
                description="T-minus 60 min session alerts."
                checked={form.email_session_reminders}
                onChange={(v) => setForm((f) => ({ ...f, email_session_reminders: v }))}
              />
              <ProfileToggle
                label="Contract Confirmed"
                description="Alert when a session is finalized."
                checked={form.email_session_booked}
                onChange={(v) => setForm((f) => ({ ...f, email_session_booked: v }))}
              />
              <ProfileToggle
                label="Weekly After-Action Report"
                description="Weekly intelligence digest."
                checked={form.email_weekly_summary}
                onChange={(v) => setForm((f) => ({ ...f, email_weekly_summary: v }))}
              />
              <ProfileToggle
                label="Direct Intelligence"
                description="Updates from Mentrixa HQ."
                checked={form.email_marketing}
                onChange={(v) => setForm((f) => ({ ...f, email_marketing: v }))}
              />
            </div>
          </div>
        </div>

        {err && (
          <p className="mt-8 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-xs font-bold text-red-600 uppercase italic tracking-widest">
            {err}
          </p>
        )}

        <div className="mt-10 flex justify-end">
          <Button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-14 min-w-[200px] rounded-2xl bg-indigo-600 text-sm font-black uppercase italic tracking-[0.2em] text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 hover:scale-[1.02] transition-all"
          >
            {pending ? "Synchronizing..." : "Update Identity"}
          </Button>
        </div>
    </section>
  );
}

// ─── Main Student Profile Client ─────────────────────────────────────────────

export function StudentProfileClient({
  data,
  referral,
}: {
  data: StudentProfileData;
  referral?: ReferralDashboardData | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const memberSince = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(data.memberSince));

  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setErr(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErr("Sign in to upload.");
        return;
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "avatar";
      const path = `${user.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("profile-pics")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) {
        setErr(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("profile-pics").getPublicUrl(path);
      const res = await updateStudentAvatarUrl(pub.publicUrl);
      if (!res.success) {
        setErr(res.error);
        return;
      }
      router.refresh();
      setToast(true);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onClearAvatar() {
    setErr(null);
    const res = await clearStudentAvatar();
    if (!res.success) setErr(res.error);
    else {
      router.refresh();
      setToast(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-indigo-950">
      {/* Cinematic Light Background Elements */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.06),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.04),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/mentrixalogo/logo.webp')] bg-[length:120px_120px] bg-repeat opacity-[0.03]" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        
        {/* Top Navigation */}
        <div className="mb-12 flex items-center justify-between">
           <Button
            variant="ghost"
            size="sm"
            className="h-10 rounded-2xl border border-indigo-100 bg-white px-5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm"
            asChild
          >
            <Link href="/student" className="flex items-center gap-2">
              <Image
                src="/icons/mentrixer.svg"
                alt=""
                width={16}
                height={16}
                unoptimized
                className="h-4 w-4 opacity-60"
              />
              Arena Dashboard
            </Link>
          </Button>

          <div className="flex gap-2">
            
          </div>
        </div>

        {/* PROFILE HEADER CARD */}
        <div className="relative overflow-hidden rounded-[3rem] border border-indigo-100 bg-white p-10 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.1)]">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
            
            {/* Left: Identity Section */}
            <div className="flex flex-col gap-10 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-6 sm:items-start">
                <div className="group relative h-40 w-40 overflow-hidden rounded-[2.5rem] border-2 border-indigo-50 bg-indigo-50/50 shadow-xl sm:h-48 sm:w-48">
                  {data.avatarUrl ? (
                    <Image
                      src={data.avatarUrl}
                      alt=""
                      width={192}
                      height={192}
                      unoptimized
                      priority
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white">
                      <Image
                        src="/icons/mentrixer.svg"
                        alt=""
                        width={80}
                        height={80}
                        unoptimized
                        className="h-20 w-20 opacity-20"
                      />
                    </div>
                  )}
                  
                  {data.viewer === "owner" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-950/40 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                       <button 
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="text-[10px] font-black uppercase tracking-widest text-white hover:text-indigo-100 disabled:opacity-50"
                       >
                         {uploading ? "Updating..." : "Change Identity"}
                       </button>
                    </div>
                  )}
                </div>
                
                {data.viewer === "owner" && (
                  <div className="flex w-full flex-col items-center gap-2 sm:items-start">
                    <div className="flex w-full justify-center gap-4 sm:justify-start">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={onAvatarPick}
                      />
                      {data.avatarUrl && (
                        <button
                          onClick={() => void onClearAvatar()}
                          disabled={uploading}
                          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 disabled:opacity-30"
                        >
                          Reset Image
                        </button>
                      )}
                    </div>
                    {err && (
                      <p className="text-[10px] font-bold uppercase italic tracking-widest text-red-500">
                        Error: {err}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400">
                    Verified Mentrixer
                  </p>
                  <h1 className="text-4xl font-black italic tracking-tight text-indigo-950 sm:text-5xl lg:text-6xl">
                    <Typewriter text={data.displayName} speed={80} />
                  </h1>
                  <p className="text-sm font-medium text-slate-400 italic">Member since {memberSince}</p>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-6">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-black uppercase italic tracking-widest text-amber-600 shadow-sm">
                    {data.levelLabel}
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-3xl font-black italic tracking-tight text-indigo-900">
                      {data.totalXp.toLocaleString()} <span className="text-[11px] not-italic text-slate-400 uppercase tracking-widest ml-1">Total XP</span>
                    </p>
                    {data.streakDays > 0 && (
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">
                         {data.streakDays}-Day Strike Active
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-10 max-w-sm">
                  <XpBar data={data} />
                </div>
              </div>
            </div>

            {/* Right: Personal Creed / Quick Stats */}
            <div className="flex flex-col gap-8 lg:w-80 lg:shrink-0">
               <div className="rounded-[2rem] border border-indigo-50 bg-indigo-50/20 p-6 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-4">Personal Creed</p>
                  {data.bio ? (
                    <p className="text-sm font-medium italic leading-relaxed text-indigo-800">&quot;{data.bio}&quot;</p>
                  ) : (
                    <p className="text-sm italic text-slate-400 leading-relaxed">No creed established yet. Update your identity below.</p>
                  )}
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-indigo-50 bg-white p-5 text-center shadow-sm">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Quests</p>
                     <p className="mt-1 font-mono text-2xl font-black text-indigo-900">{data.completedSessionsCount}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-50 bg-white p-5 text-center shadow-sm">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Disciplines</p>
                     <p className="mt-1 font-mono text-2xl font-black text-indigo-900">{data.courses.length}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* SECONDARY INFO GRID */}
        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          
          {/* Left Column: Form & Settings (Occupies 2/3) */}
          <div className="lg:col-span-2 space-y-10">
             {data.viewer === "owner" && data.privateSettings ? (
                <StudentProfileFormSection
                  key={data.studentId}
                  initial={data.privateSettings}
                  divisions={data.divisions}
                  onSaved={() => {
                    router.refresh();
                    setToast(true);
                  }}
                />
              ) : null}
              
              {data.viewer === "owner" ? <AccountSecurityPanel /> : null}
          </div>

          {/* Right Column: Badges & Achievements */}
          <div className="space-y-10">
            
            {/* Division Badges */}
            <div className="rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-600/[0.03]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950">Division Standing</h2>
                <Image src={MENTRIXA_LOGO_PNG} alt="" width={20} height={20} className="opacity-30" />
              </div>
              
              <ul className="space-y-4">
                {data.divisionBadges.length === 0 ? (
                  <li className="text-xs italic text-slate-400 text-center py-4 border-2 border-dashed border-indigo-50 rounded-2xl">No battle data available.</li>
                ) : (
                  data.divisionBadges.map((d) => (
                    <li
                      key={d.key}
                      className="group flex flex-col gap-2 rounded-2xl border border-indigo-50 bg-slate-50/30 p-4 transition-all hover:bg-white hover:shadow-md hover:border-indigo-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-black italic tracking-tight text-indigo-900">{d.name}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{d.tierLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-indigo-100 overflow-hidden">
                           <div className="h-full bg-indigo-500 w-[60%]" />
                        </div>
                        <span className="font-mono text-[11px] tabular-nums text-indigo-400">
                          {d.xp.toLocaleString()} XP
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Achievements */}
            <div className="rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-600/[0.03]">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950 mb-8">Battle Log</h2>
              <ul className="space-y-6">
                {data.recentAchievements.length === 0 ? (
                  <li className="text-xs italic text-slate-400 text-center py-4 border-2 border-dashed border-indigo-50 rounded-2xl">Battle history empty.</li>
                ) : (
                  data.recentAchievements.map((a) => (
                    <li key={a.id} className="flex gap-4">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/20" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold leading-relaxed text-indigo-900">{a.summary}</p>
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-tight">
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                          }).format(new Date(a.completedAt))}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Referral Section (If applicable) */}
            {data.viewer === "owner" && referral ? (
              <ReferralProgramSection initial={referral} />
            ) : null}
            
          </div>
        </div>
      </main>

      <SaveToast open={toast} onClose={() => setToast(false)} />
    </div>
  );
}
