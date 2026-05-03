"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateUserSettings,
  updatePassword,
  deleteAccount,
  type UserSettings,
} from "@/app/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { APP_TIMEZONES } from "@/lib/timezones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 60] as const;

interface SettingsUser {
  id: string;
  email: string;
  role: string;
}

interface SettingsClientProps {
  user: SettingsUser;
  settings: UserSettings;
}

export function SettingsClient({ user, settings: initial }: SettingsClientProps) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState<UserSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const update = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateUserSettings(settings);
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "Passwords don't match" });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "err", text: "Password must be at least 8 characters" });
      return;
    }
    setPwSaving(true);
    try {
      await updatePassword(currentPw, newPw);
      setPwMsg({ type: "ok", text: "Password updated" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      setPwMsg({ type: "err", text: e instanceof Error ? e.message : "Failed" });
    }
    setPwSaving(false);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount();
      window.location.assign("https://mentrixa.one");
    } catch (e) {
      setDeleting(false);
      setDeleteError(e instanceof Error ? e.message : "Failed to delete account. Please try again.");
    }
  };

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    setAvatarUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        throw new Error("Sign in again to update your profile picture");
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "avatar";
      const path = `${authUser.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-pics")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicData } = supabase.storage.from("profile-pics").getPublicUrl(path);
      await updateUserSettings({ avatar_url: publicData.publicUrl });

      setSettings((prev) => ({ ...prev, avatar_url: publicData.publicUrl }));
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload profile picture");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setError(null);
    try {
      await updateUserSettings({ avatar_url: null });
      setSettings((prev) => ({ ...prev, avatar_url: null }));
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove profile picture");
    }
  }

  const isTutor = user.role === "tutor";
  const isStudent = user.role === "student";
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto w-full max-w-5xl px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 -ml-3 text-xs text-slate-400 hover:text-white hover:bg-white/10"
            onClick={() => router.back()}
          >
            <span className="inline-flex items-center gap-1.5">
              <Image src="/icons/mentrixer.svg" alt="" width={12} height={12} className="opacity-60" />
              Back
            </span>
          </Button>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Settings</h1>
        <p className="mb-8 text-sm text-slate-400">
          Manage your account, notifications, and tutor preferences.
        </p>

        {/* ── Profile ──────────────────────────────────────────────── */}
        <Section title="Profile" description="Your public identity on Mentrixa.">
          <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-700 bg-slate-950">
              {settings.avatar_url ? (
                <Image
                  src={settings.avatar_url}
                  alt={settings.display_name ?? user.email}
                  width={80}
                  height={80}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-medium text-slate-400">
                  {((settings.display_name ?? user.email).slice(0, 1) || "G").toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-100">Profile picture</p>
                <p className="mt-1 text-sm text-slate-400">
                  Use a clear square image so learners recognize you everywhere.
                </p>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-700 bg-slate-950 text-xs text-slate-200 hover:bg-slate-900"
                  disabled={avatarUploading}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Image src={MENTRIXA_LOGO_PNG} alt="" width={12} height={12} className="h-3 w-3" />
                    {avatarUploading ? "Uploading…" : "Change photo"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 border-slate-800 text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  disabled={avatarUploading || !settings.avatar_url}
                  onClick={() => void handleRemoveAvatar()}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Image src={MENTRIXA_LOGO_PNG} alt="" width={12} height={12} className="h-3 w-3" />
                    Remove
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <Field label="Email">
            <Input value={user.email} disabled className="border-slate-700 bg-slate-900 text-slate-400" />
            <p className="mt-1 text-xs text-slate-500">
              Email cannot be changed. Contact support if needed.
            </p>
          </Field>

          <Field label="Display name">
            <Input
              className="border-slate-700 bg-slate-900 text-slate-100"
              value={settings.display_name ?? ""}
              onChange={(e) => update("display_name", e.target.value || null)}
              placeholder={user.email.split("@")[0]}
              maxLength={100}
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown to {isTutor ? "students" : "tutors"} and on your profile.
            </p>
          </Field>

          <Field label="Bio">
            <Textarea
              value={settings.bio ?? ""}
              onChange={(e) => update("bio", e.target.value || null)}
              placeholder={isTutor ? "What you teach, your style, and what learners should know." : "Tell tutors a little about your goals."}
              maxLength={280}
              rows={4}
              className="resize-none border-slate-700 bg-slate-900 text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              Keep it short so your profile reads cleanly.
            </p>
          </Field>

          <Field label="Role">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block rounded-lg px-3 py-2 text-xs font-medium ${
                  isAdmin
                    ? "border border-slate-700 bg-slate-900 text-slate-300"
                    : isTutor
                      ? "border border-slate-700 bg-slate-900 text-slate-300"
                      : "border border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {user.role}
              </span>
            </div>
          </Field>

          <Field label="Timezone">
            <select
              value={settings.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              {APP_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Used for session times and email reminders.
            </p>
          </Field>

          {isTutor && (
            <Field label="Tutor profile note">
              <p className="text-sm leading-relaxed text-slate-400">
                This page controls your public guide identity, including your name, photo, bio, timezone, and booking defaults.
              </p>
            </Field>
          )}
        </Section>

        {/* ── Notifications ────────────────────────────────────────── */}
        <Section title="Email notifications" description="Choose which emails you receive.">
          <Toggle
            label="Session reminders"
            description="Receive a reminder 1 hour before your session starts."
            checked={settings.email_session_reminders}
            onChange={(v) => update("email_session_reminders", v)}
          />
          <Toggle
            label="Session booked"
            description={
              isTutor
                ? "When a student books a session with you."
                : "Confirmation when you book a session."
            }
            checked={settings.email_session_booked}
            onChange={(v) => update("email_session_booked", v)}
          />
          <Toggle
            label="Session cancelled"
            description="When a session is cancelled by either party."
            checked={settings.email_session_cancelled}
            onChange={(v) => update("email_session_cancelled", v)}
          />
          <Toggle
            label="Weekly summary"
            description={
              isTutor
                ? "Weekly report with sessions taught, revenue, and ratings."
                : "Weekly digest of your learning progress and XP."
            }
            checked={settings.email_weekly_summary}
            onChange={(v) => update("email_weekly_summary", v)}
          />
          <Toggle
            label="Product updates"
            description="New features, tips, and announcements from Mentrixa."
            checked={settings.email_marketing}
            onChange={(v) => update("email_marketing", v)}
          />
        </Section>

        {/* ── Session preferences (tutors only) ────────────────────── */}
        {isTutor && (
          <Section
            title="Session defaults"
            description="Default values when creating new availability slots."
          >
            <Field label="Default session duration">
              <select
                value={settings.session_default_duration}
                onChange={(e) =>
                  update("session_default_duration", Number(e.target.value))
                }
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Buffer between sessions">
              <select
                value={settings.session_buffer_minutes}
                onChange={(e) =>
                  update("session_buffer_minutes", Number(e.target.value))
                }
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b === 0 ? "No buffer" : `${b} minutes`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Minimum gap between consecutive sessions.
              </p>
            </Field>
          </Section>
        )}

        {isStudent && (
          <Section
            title="Skill duels"
            description="Other learners can send you a pending challenge. You accept to generate the same quiz for both."
          >
            <Toggle
              label="Accept duel challenges from other learners"
              description="When off, no one can challenge you until you turn this on."
              checked={settings.duel_opt_in}
              onChange={(v) => update("duel_opt_in", v)}
            />
          </Section>
        )}

        {/* ── Admin-only section ───────────────────────────────────── */}
        {isAdmin && (
          <Section
            title="Admin preferences"
            description="Settings specific to your admin role."
          >
            <Toggle
              label="Weekly summary"
              description="Receive a weekly email with platform stats: new users, sessions, revenue."
              checked={settings.email_weekly_summary}
              onChange={(v) => update("email_weekly_summary", v)}
            />
          </Section>
        )}

        {/* ── Save button ──────────────────────────────────────────── */}
        <div className="mb-10 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="bg-slate-100 text-slate-900 hover:bg-white">
            {saving ? "Saving..." : "Save changes"}
          </Button>
          {saved && (
            <span className="text-sm font-medium text-indigo-400">Saved</span>
          )}
          {error && (
            <span className="text-sm font-medium text-red-400">{error}</span>
          )}
        </div>

        <hr className="mb-8 border-slate-800" />

        {/* ── Change password ──────────────────────────────────────── */}
        <Section title="Change password" description="Update your sign-in password.">
          <Field label="Current password">
            <Input
              className="border-slate-700 bg-slate-900 text-slate-100"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <Input
              className="border-slate-700 bg-slate-900 text-slate-100"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              className="border-slate-700 bg-slate-900 text-slate-100"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handlePasswordChange}
              disabled={pwSaving || !currentPw || !newPw || !confirmPw}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              {pwSaving ? "Updating..." : "Update password"}
            </Button>
            {pwMsg && (
              <span
                className={`text-sm font-medium ${
                  pwMsg.type === "ok" ? "text-indigo-400" : "text-red-400"
                }`}
              >
                {pwMsg.text}
              </span>
            )}
          </div>
        </Section>

        <hr className="mb-8 border-slate-800" />

        {/* ── Danger zone ──────────────────────────────────────────── */}
        <Section
          title="Danger zone"
          description="Irreversible actions. Please be certain."
          danger
        >
          {!deleteConfirm ? (
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-900 text-red-400 hover:bg-slate-800 hover:text-red-300"
              onClick={() => {
                setDeleteError(null);
                setDeleteConfirm(true);
              }}
            >
              Delete my account
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-400">
                This will permanently delete your account, all sessions, ratings,
                and XP data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  className="bg-red-600 text-white hover:bg-red-500"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, delete my account"}
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
              {deleteError ? (
                <p className="text-sm font-medium text-red-400">{deleteError}</p>
              ) : null}
            </div>
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  description,
  danger,
  children,
}: {
  title: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2
        className={`mb-1 text-lg font-medium ${
          danger ? "text-red-400" : "text-slate-100"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className="mb-4 text-sm text-slate-400">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
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
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-100">{label}</p>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-slate-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
          checked ? "bg-indigo-600" : "bg-slate-800"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-100 transition duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
