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
    setDeleting(true);
    try {
      await deleteAccount();
      window.location.href = "/";
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-1">Settings</h1>
        <p className="text-sm text-slate-400 mb-8">
          Manage your account, notifications, and tutor preferences.
        </p>

        {/* ── Profile ──────────────────────────────────────────────── */}
        <Section title="Profile" description="Your public identity on Mentrixa.">
          <div className="flex items-start gap-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white">
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
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-500">
                  {((settings.display_name ?? user.email).slice(0, 1) || "G").toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Profile picture</p>
                <p className="mt-0.5 text-xs text-slate-500">
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
                  className="h-8 text-xs"
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
                  className="h-8 text-xs text-slate-600"
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
            <Input value={user.email} disabled className="bg-slate-100 text-slate-500" />
            <p className="text-[11px] text-slate-400 mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </Field>

          <Field label="Display name">
            <Input
              value={settings.display_name ?? ""}
              onChange={(e) => update("display_name", e.target.value || null)}
              placeholder={user.email.split("@")[0]}
              maxLength={100}
            />
            <p className="text-[11px] text-slate-400 mt-1">
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
              className="resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Keep it short so your profile reads cleanly.
            </p>
          </Field>

          <Field label="Role">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${
                  isAdmin
                    ? "bg-violet-50 text-violet-700"
                    : isTutor
                      ? "bg-blue-50 text-blue-700"
                      : "bg-emerald-50 text-emerald-700"
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
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-400/40"
            >
              {APP_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Used for session times and email reminders.
            </p>
          </Field>

          {isTutor && (
            <Field label="Tutor profile note">
              <p className="text-xs leading-relaxed text-slate-500">
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
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-400/40"
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
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-400/40"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b === 0 ? "No buffer" : `${b} minutes`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
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
        <div className="flex items-center gap-3 mb-10">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">Saved</span>
          )}
          {error && (
            <span className="text-sm text-red-600 font-medium">{error}</span>
          )}
        </div>

        <hr className="border-slate-200 mb-8" />

        {/* ── Change password ──────────────────────────────────────── */}
        <Section title="Change password" description="Update your sign-in password.">
          <Field label="Current password">
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <Input
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
            >
              {pwSaving ? "Updating..." : "Update password"}
            </Button>
            {pwMsg && (
              <span
                className={`text-sm font-medium ${
                  pwMsg.type === "ok" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {pwMsg.text}
              </span>
            )}
          </div>
        </Section>

        <hr className="border-slate-200 mb-8" />

        {/* ── Danger zone ──────────────────────────────────────────── */}
        <Section
          title="Danger zone"
          description="Irreversible actions. Please be certain."
          danger
        >
          {!deleteConfirm ? (
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setDeleteConfirm(true)}
            >
              Delete my account
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-700">
                This will permanently delete your account, all sessions, ratings,
                and XP data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, delete my account"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
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
    <section className="mb-8">
      <h2
        className={`text-sm font-semibold mb-0.5 ${
          danger ? "text-red-700" : "text-slate-900"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className="text-xs text-slate-400 mb-4">{description}</p>
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
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
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
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-400/50 ${
          checked ? "bg-mentrixa-600" : "bg-slate-200"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
