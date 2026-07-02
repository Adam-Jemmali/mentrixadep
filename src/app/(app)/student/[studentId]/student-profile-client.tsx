"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { StudentProfileData } from "@/features/student-profile/student-profile-lib";
import { xpTierProgressFraction } from "@/features/student-profile/student-profile-lib";
import {
  updateStudentProfile,
  updateStudentAvatarUrl,
  clearStudentAvatar,
} from "@/features/student-profile/student-profile";
import { createClient } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { MentrixaTimezoneSelect } from "@/shared/ui/select-patterns";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import { cn } from "@/shared/core/utils";
import type { UserSettings } from "@/features/settings/user-settings";
import type { ReferralDashboardData } from "@/features/referrals/referrals";
import { ReferralProgramSection } from "@/features/student-profile/ui/referral-program-section";
import { DivisionFocusSelect } from "@/features/student-profile/ui/division-focus-select";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { Typewriter } from "@/shared/ui/typewriter";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { RankCardShareButton } from "@/features/rank-card/rank-card-share-button";
import { getSiteUrl } from "@/shared/core/site";
import { Skeleton } from "@/shared/ui/skeleton";
import { VerifiedNodesProgressCircle } from "@/shared/ui/progress-circle-patterns";
import { RANK_PROOFS_DETAIL, RANK_PROOFS_LABEL } from "@/features/xp/rank-proofs-labels";
import { ClearAvatarConfirmDialog } from "@/shared/ui/alert-dialog-patterns";
import { MentrixaTabsGroup } from "@/shared/ui/tabs-patterns";
import { profileTabMessage, profileTabsAriaLabel } from "@/shared/ui/tabs-messages-pure";
import {
  MentrixaSettingsSwitch,
  MentrixaSettingsSwitchGroup,
} from "@/shared/ui/switch-patterns";
import {
  notificationSwitchGroupAriaLabel,
  privacySwitchGroupAriaLabel,
} from "@/shared/ui/switch-messages-pure";
import { MomentumMembershipPanel } from "@/features/student-profile/ui/momentum-membership-panel";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import type { StudentEntitlements } from "@/features/entitlements/entitlements";

// ─── Shared Battle UI Components ─────────────────────────────────────────────

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
        rank_card_public: form.rank_card_public,
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
            <div className="self-start">
              <MentrixaTimezoneSelect
                value={form.timezone}
                onChange={(tz) => setForm((f) => ({ ...f, timezone: tz }))}
                label="Temporal Focus (Timezone)"
                brandKind="mentrixer"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              Personal Creed 
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Battle focus</Label>
              <p className="mt-1 text-[11px] text-slate-500 italic">
                AP Calculus AB league and duel matchmaking.
              </p>
              {divisions.length <= 1 ? (
                <p className="mt-4 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                  {divisions[0]?.name ?? "AP Calculus AB"}
                </p>
              ) : (
                <DivisionFocusSelect
                  value={form.focused_division_key}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      focused_division_key: v,
                    }))
                  }
                  divisions={divisions}
                  noneLabel="None"
                  triggerClassName="mt-4"
                />
              )}
            </div>

            <MentrixaSettingsSwitchGroup ariaLabel={privacySwitchGroupAriaLabel()} tone="light">
              <MentrixaSettingsSwitch
                label="Global Profile Visibility"
                description="Allow other Mentrixers and Guides to find your profile."
                isSelected={form.profile_visible_to_tutors}
                onChange={(v) => setForm((f) => ({ ...f, profile_visible_to_tutors: v }))}
                settingId="profile_visible_to_tutors"
              />
              <MentrixaSettingsSwitch
                label="Duel Invitations"
                description="Enable 1v1 skill challenges from peers."
                isSelected={form.duel_opt_in}
                onChange={(v) => setForm((f) => ({ ...f, duel_opt_in: v }))}
                settingId="duel_opt_in"
              />
              <MentrixaSettingsSwitch
                label="Public Rank Card"
                description="Share your verified rank passport at mentrixa.one/rank/[username]. On by default."
                isSelected={form.rank_card_public}
                onChange={(v) => setForm((f) => ({ ...f, rank_card_public: v }))}
                settingId="rank_card_public"
              />
            </MentrixaSettingsSwitchGroup>
          </div>

          <div className="border-t border-indigo-50 pt-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">Signal Settings (Notifications)</h3>
            <MentrixaSettingsSwitchGroup
              ariaLabel={notificationSwitchGroupAriaLabel()}
              tone="light"
              layout="grid"
            >
              <MentrixaSettingsSwitch
                label="Session Alarms"
                description="T-minus 60 min session alerts."
                isSelected={form.email_session_reminders}
                onChange={(v) => setForm((f) => ({ ...f, email_session_reminders: v }))}
                settingId="email_session_reminders"
              />
              <MentrixaSettingsSwitch
                label="Contract Confirmed"
                description="Alert when a session is finalized."
                isSelected={form.email_session_booked}
                onChange={(v) => setForm((f) => ({ ...f, email_session_booked: v }))}
                settingId="email_session_booked"
              />
              <MentrixaSettingsSwitch
                label="Weekly After-Action Report"
                description="Weekly intelligence digest."
                isSelected={form.email_weekly_summary}
                onChange={(v) => setForm((f) => ({ ...f, email_weekly_summary: v }))}
                settingId="email_weekly_summary"
              />
              <MentrixaSettingsSwitch
                label="Direct Intelligence"
                description="Updates from Mentrixa HQ."
                isSelected={form.email_marketing}
                onChange={(v) => setForm((f) => ({ ...f, email_marketing: v }))}
                settingId="email_marketing"
              />
            </MentrixaSettingsSwitchGroup>
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

// ─── Profile tab panels ───────────────────────────────────────────────────────

function ProfileStandingSections({ data }: { data: StudentProfileData }) {
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-600/[0.03]">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950">
            Division Standing
          </h2>
          <Image src={MENTRIXA_LOGO_PNG} alt="" width={20} height={20} className="opacity-30" />
        </div>
        <ul className="space-y-4">
          {data.divisionBadges.length === 0 ? (
            <li className="rounded-2xl border-2 border-dashed border-indigo-50 py-4 text-center text-xs italic text-slate-400">
              No battle data available.
            </li>
          ) : (
            data.divisionBadges.map((d) => (
              <li
                key={d.key}
                className="group flex flex-col gap-2 rounded-2xl border border-indigo-50 bg-slate-50/30 p-4 transition-all hover:border-indigo-100 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-black italic tracking-tight text-indigo-900">
                    {d.name}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                    {d.tierLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-1.5 max-w-[140px] flex-1 overflow-hidden rounded-full bg-indigo-100">
                    <div className="h-full w-[60%] bg-indigo-500" />
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

      <div className="rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-600/[0.03]">
        <h2 className="mb-8 text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950">
          Battle Log
        </h2>
        <ul className="space-y-6">
          {data.recentAchievements.length === 0 ? (
            <li className="rounded-2xl border-2 border-dashed border-indigo-50 py-4 text-center text-xs italic text-slate-400">
              Battle history empty.
            </li>
          ) : (
            data.recentAchievements.map((a) => (
              <li key={a.id} className="flex gap-4">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/20" />
                <div className="space-y-1">
                  <p className="text-xs font-bold leading-relaxed text-indigo-900">{a.summary}</p>
                  <p className="text-[10px] font-black uppercase tracking-tight text-indigo-300">
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
    </div>
  );
}

function ProfileShareSections({
  data,
  accountRank,
  referral,
}: {
  data: StudentProfileData;
  accountRank: ReturnType<typeof getAccountRankFromTotalXp>;
  referral?: ReferralDashboardData | null;
}) {
  return (
    <div className="space-y-10">
      {data.rankCardUsername && data.rankCardPublic ? (
        <RankCardShareButton
          username={data.rankCardUsername}
          siteUrl={getSiteUrl()}
          passportVerdict={
            data.rankCardPassportVerdict ??
            "Verified AP Calculus AB rank passport on Mentrixa."
          }
          rankTitle={normalizeRankTitle(data.rankCardCalibratedTitle ?? accountRank.title)}
        />
      ) : null}
      {referral ? <ReferralProgramSection initial={referral} /> : null}
    </div>
  );
}

// ─── Main Student Profile Client ─────────────────────────────────────────────

export function StudentProfileClient({
  data,
  referral,
  subscription = null,
  entitlements = null,
}: {
  data: StudentProfileData;
  referral?: ReferralDashboardData | null;
  subscription?: StudentSubscriptionRow | null;
  entitlements?: StudentEntitlements | null;
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

  const accountRank = useMemo(
    () => getAccountRankFromTotalXp(data.totalXp),
    [data.totalXp],
  );

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

  async function onClearAvatar(): Promise<boolean> {
    setErr(null);
    const res = await clearStudentAvatar();
    if (!res.success) {
      setErr(res.error);
      return false;
    }
    router.refresh();
    setToast(true);
    return true;
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
                  {uploading ? (
                    <Skeleton className="h-full w-full rounded-[2.5rem]" aria-label="Uploading avatar" />
                  ) : data.avatarUrl ? (
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
                  <div
                    className="absolute -bottom-1 -right-1 z-10 rounded-2xl ring-4 ring-white shadow-lg"
                    title={normalizeRankTitle(accountRank.title)}
                  >
                    <RankBadge
                      rank={accountRank}
                      size="md"
                      active
                      showGlow={accountRank.key === "mentrixer"}
                      priority
                    />
                  </div>
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
                        <ClearAvatarConfirmDialog
                          confirming={uploading}
                          onConfirm={onClearAvatar}
                          trigger={
                            <button
                              type="button"
                              disabled={uploading}
                              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 disabled:opacity-30"
                            >
                              Reset Image
                            </button>
                          }
                        />
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

                <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="hidden flex-col items-center gap-1 sm:flex">
                      <VerifiedNodesProgressCircle verifiedCount={data.verifiedSkillCount} size="lg" />
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-indigo-400">
                        {RANK_PROOFS_LABEL}
                      </p>
                    </div>
                    <RankBadge
                      rank={accountRank}
                      size="lg"
                      active
                      showGlow={accountRank.key === "mentrixer"}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-2xl font-black uppercase italic tracking-tight sm:text-3xl"
                        style={{ color: accountRank.labelOnLight }}
                      >
                        {normalizeRankTitle(accountRank.title)}
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Level {accountRank.level}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-3xl font-black italic tracking-tight text-indigo-900">
                      {data.totalXp.toLocaleString()}{" "}
                      <span className="ml-1 text-[11px] font-sans not-italic uppercase tracking-widest text-slate-400">
                        Total XP
                      </span>
                    </p>
                    {data.streakDays > 0 ? (
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">
                        {data.streakDays}-Day Strike Active
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-10 max-w-sm space-y-4">
                  <div className="flex items-center gap-3 sm:hidden">
                    <VerifiedNodesProgressCircle verifiedCount={data.verifiedSkillCount} size="md" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">
                        {RANK_PROOFS_LABEL}
                      </p>
                      <p className="text-[10px] leading-snug text-slate-500">{RANK_PROOFS_DETAIL}</p>
                    </div>
                  </div>
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

        {data.viewer === "owner" ? (
          <div className="mt-12">
            <MentrixaTabsGroup
              ariaLabel={profileTabsAriaLabel()}
              tone="light"
              defaultSelectedKey="identity"
              brandKind="mentrixer"
              items={[
                {
                  id: "identity",
                  ...profileTabMessage("identity"),
                  panel: (
                    <div className="space-y-10">
                      {data.privateSettings ? (
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
                      <AccountSecurityPanel />
                    </div>
                  ),
                },
                {
                  id: "membership",
                  ...profileTabMessage("membership"),
                  panel: (
                    <MomentumMembershipPanel
                      subscription={subscription}
                      variant="profile"
                      sessionCreditsRemaining={entitlements?.sessionCreditsRemaining ?? 0}
                      sessionCreditPeriodMonth={entitlements?.sessionCreditPeriodMonth ?? null}
                      packSprint={entitlements?.packSprint ?? null}
                      monthlyCreditsRemaining={entitlements?.monthlyCreditsRemaining ?? 0}
                    />
                  ),
                },
                {
                  id: "standing",
                  ...profileTabMessage("standing"),
                  panel: <ProfileStandingSections data={data} />,
                },
                {
                  id: "share",
                  ...profileTabMessage("share"),
                  panel: (
                    <ProfileShareSections
                      data={data}
                      accountRank={accountRank}
                      referral={referral}
                    />
                  ),
                },
              ]}
            />
          </div>
        ) : (
          <div className="mt-12 max-w-3xl">
            <ProfileStandingSections data={data} />
          </div>
        )}
      </main>

      <SaveToast open={toast} onClose={() => setToast(false)} />
    </div>
  );
}
