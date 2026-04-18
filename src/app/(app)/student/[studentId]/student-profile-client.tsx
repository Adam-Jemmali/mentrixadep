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
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import type { UserSettings } from "@/app/actions/settings";
import type { ReferralDashboardData } from "@/app/actions/referral";
import { ReferralProgramSection } from "@/components/student/referral-program-section";
import { AccountSecurityPanel } from "@/components/account-security-panel";

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
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          checked ? "bg-slate-900" : "bg-slate-200",
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
  const reduce = useReducedMotion();
  const pct = Math.round(100 * xpTierProgressFraction(data));
  const widthPct = xpTierProgressFraction(data) * 100;
  const [w, setW] = useState(reduce ? widthPct : 0);

  useEffect(() => {
    if (reduce) {
      setW(widthPct);
      return;
    }
    setW(0);
    const t = requestAnimationFrame(() => setW(widthPct));
    return () => cancelAnimationFrame(t);
  }, [widthPct, reduce, data.totalXp]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Level progress</span>
        <span className="tabular-nums text-slate-700">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-slate-900"
          initial={false}
          animate={{ width: `${w}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {data.xpToNextLevel != null && (
        <p className="text-xs text-slate-500">
          <span className="tabular-nums">+{data.xpToNextLevel}</span> XP to next level
        </p>
      )}
    </div>
  );
}

function SaveToast({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-lg"
          role="status"
        >
          Profile saved
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

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

  return (
    <section className={cn("mt-8 p-5 sm:p-6", mentrixStudent.card)}>
        <h2 className="text-sm font-medium text-slate-900">Edit profile</h2>
        <p className="mt-1 text-xs text-slate-500">
          Visible to tutors when you enable sharing. Email is never shown on this page.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="dn" className="text-xs text-slate-600">
              Display name
            </Label>
            <Input
              id="dn"
              value={form.display_name ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, display_name: e.target.value }))
              }
              className="mt-1.5"
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="bio" className="text-xs text-slate-600">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={form.bio ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              maxLength={280}
              className="mt-1.5 resize-none text-sm"
              placeholder="What you’re studying, goals, or how you like to learn."
            />
          </div>
          <div>
            <Label htmlFor="tz" className="text-xs text-slate-600">
              Timezone
            </Label>
            <select
              id="tz"
              value={form.timezone}
              onChange={(e) =>
                setForm((f) => ({ ...f, timezone: e.target.value }))
              }
              className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {APP_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <ProfileToggle
            label="Show profile to tutors"
            description="Tutors can open this page when signed in. Turn off to keep your profile private."
            checked={form.profile_visible_to_tutors}
            onChange={(v) =>
              setForm((f) => ({ ...f, profile_visible_to_tutors: v }))
            }
          />
          <ProfileToggle
            label="Duel challenges"
            description="Allow other students to send you skill duels."
            checked={form.duel_opt_in}
            onChange={(v) => setForm((f) => ({ ...f, duel_opt_in: v }))}
          />

          <div>
            <Label className="text-xs text-slate-600">Focused division</Label>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Used for leaderboards and focus (same as Division page).
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
              <SelectTrigger className="mt-2 h-9 border-slate-200 bg-white text-slate-900 focus:ring-slate-400">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-900">
                <SelectItem
                  value="__none__"
                  className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                >
                  None
                </SelectItem>
                {divisions.map((d) => (
                  <SelectItem
                    key={d.key}
                    value={d.key}
                    className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                  >
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-900">Email notifications</p>
            <ProfileToggle
              label="Session reminders"
              description="1 hour before a session starts."
              checked={form.email_session_reminders}
              onChange={(v) =>
                setForm((f) => ({ ...f, email_session_reminders: v }))
              }
            />
            <ProfileToggle
              label="Session booked"
              description="When a booking is confirmed."
              checked={form.email_session_booked}
              onChange={(v) =>
                setForm((f) => ({ ...f, email_session_booked: v }))
              }
            />
            <ProfileToggle
              label="Session cancelled"
              description="When a session is cancelled."
              checked={form.email_session_cancelled}
              onChange={(v) =>
                setForm((f) => ({ ...f, email_session_cancelled: v }))
              }
            />
            <ProfileToggle
              label="Weekly summary"
              description="Occasional progress digest."
              checked={form.email_weekly_summary}
              onChange={(v) =>
                setForm((f) => ({ ...f, email_weekly_summary: v }))
              }
            />
            <ProfileToggle
              label="Product updates"
              description="News and tips from Mentrixa."
              checked={form.email_marketing}
              onChange={(v) =>
                setForm((f) => ({ ...f, email_marketing: v }))
              }
            />
          </div>
        </div>

        {err ? (
          <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={save}
            disabled={pending}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>
  );
}

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
    month: "short",
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
    <div className={cn(mentrixStudent.pageBg, "pb-16")}>
      <main className={mentrixStudent.main}>
        <div className={cn(mentrixStudent.cardMuted, "mb-6 flex flex-wrap items-center justify-between gap-3 px-5 py-4")}>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link
              href="/student"
              className="font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              Dashboard
            </Link>
            {data.viewer === "owner" && (
              <Link
                href={`/student/${data.studentId}`}
                className="font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
              >
                Profile settings
              </Link>
            )}
          </div>
          {data.viewer !== "owner" && (
            <span className="text-xs text-slate-500">Learner profile</span>
          )}
        </div>

        <div
          className={cn(
            "relative overflow-hidden",
            mentrixStudent.card,
            "before:pointer-events-none before:absolute before:inset-0 before:bg-[url('/mentrixalogo/logo.png')] before:bg-[length:112px_112px] before:bg-repeat before:opacity-[0.06] before:content-['']",
          )}
        >
          <div className="relative border-b border-slate-100 px-5 py-6 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  {data.avatarUrl ? (
                    <Image
                      src={data.avatarUrl}
                      alt=""
                      width={112}
                      height={112}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-slate-500">
                      {data.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                {data.viewer === "owner" && (
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={onAvatarPick}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? "Uploading…" : "Change photo"}
                    </Button>
                    {data.avatarUrl ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => void onClearAvatar()}
                      >
                        Remove
                      </Button>
                    ) : null}
                    {err ? (
                      <p className="max-w-[220px] text-center text-xs text-red-700 sm:text-left">
                        {err}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Mentrixer profile
                  </p>
                  <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    {data.displayName}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">Member since {memberSince}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-amber-300/50 bg-amber-400/25 px-3 py-1 text-xs font-bold text-amber-50 shadow-sm backdrop-blur-sm">
                    {data.levelLabel}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-600">
                    {data.totalXp.toLocaleString()} XP
                  </span>
                  {data.streakDays > 0 && (
                    <span className="text-xs text-slate-500">
                      · {data.streakDays}-day streak
                    </span>
                  )}
                </div>

                <div className="max-w-md">
                  <XpBar data={data} />
                </div>

                {data.bio ? (
                  <p className="max-w-2xl text-sm leading-relaxed text-slate-700">{data.bio}</p>
                ) : (
                  <p className="text-sm text-slate-400">
                    {data.viewer === "owner"
                      ? "Add a short bio in the editor below."
                      : "No bio yet."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-0 border-b border-slate-100 sm:grid-cols-2">
            <div className="border-b border-slate-100 px-5 py-5 sm:border-b-0 sm:border-r">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sessions completed
              </p>
              <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-slate-900">
                {data.completedSessionsCount}
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Courses
              </p>
              {data.courses.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {data.courses.map((c) => (
                    <li
                      key={c}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No courses listed yet.</p>
              )}
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8">
            <h2 className="text-sm font-medium text-slate-900">Division badges</h2>
            <p className="mt-1 text-xs text-slate-500">XP earned per subject division.</p>
            <ul className="mt-4 space-y-2">
              {data.divisionBadges.length === 0 ? (
                <li className="text-sm text-slate-500">No division XP yet sessions add XP.</li>
              ) : (
                data.divisionBadges.map((d) => (
                  <li
                    key={d.key}
                    className="flex items-center justify-between text-sm border-b border-slate-50 pb-2 last:border-0"
                  >
                    <span className="font-medium text-slate-800">{d.name}</span>
                    <span className="text-xs text-slate-500">
                      · {d.tierLabel} ·{" "}
                      <span className="tabular-nums"> {d.xp.toLocaleString()} XP</span>
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="border-t border-slate-100 px-5 py-6 sm:px-8">
            <h2 className="text-sm font-medium text-slate-900">Recent achievements</h2>
            <p className="mt-1 text-xs text-slate-500">Completed quests.</p>
            <ul className="mt-4 space-y-3">
              {data.recentAchievements.length === 0 ? (
                <li className="text-sm text-slate-500">No completed quests yet.</li>
              ) : (
                data.recentAchievements.map((a) => (
                  <li key={a.id} className="text-sm text-slate-700">
                    <span className="text-xs text-slate-400">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(a.completedAt))}{" "}
                      ·{" "}
                    </span>
                    {a.summary}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {data.viewer === "owner" && referral ? (
          <ReferralProgramSection initial={referral} />
        ) : null}

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
      </main>
      <SaveToast open={toast} onClose={() => setToast(false)} />
    </div>
  );
}
