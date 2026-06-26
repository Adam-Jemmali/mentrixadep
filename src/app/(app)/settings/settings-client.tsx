"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateUserSettings,
  updatePassword,
  deleteAccount,
  type UserSettings,
} from "@/features/settings/user-settings";
import { isNextRedirectError } from "@/shared/core/is-next-redirect-error";
import { createClient } from "@/shared/integrations/supabase/client";
import { MentrixaTimezoneSelect } from "@/shared/ui/select-patterns";
import { MentrixaNumberField } from "@/shared/ui/number-field-patterns";
import { MentrixaSettingsSectionDivider } from "@/shared/ui/separator-patterns";
import {
  guideSessionNumberFieldMessage,
  validateSessionBufferMinutes,
  validateSessionDurationMinutes,
} from "@/shared/ui/number-field-messages-pure";
import { Button } from "@/shared/ui/button";
import Image from "next/image";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import {
  MentrixaSettingsSwitch,
  MentrixaSettingsSwitchGroup,
} from "@/shared/ui/switch-patterns";
import {
  MentrixaFieldset,
  MentrixaFormField,
} from "@/shared/ui/form-patterns";
import {
  settingsPasswordFieldMessage,
  settingsPasswordFieldsetMessage,
  settingsProfileFieldMessage,
  settingsProfileFieldsetMessage,
  validateNewPassword,
} from "@/shared/ui/form-messages-pure";
import {
  notificationSwitchGroupAriaLabel,
} from "@/shared/ui/switch-messages-pure";

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
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
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
        <MentrixaFieldset
          legend="Profile"
          description="Your public identity on Mentrixa."
          tone="dark"
          message={settingsProfileFieldsetMessage()}
        >
          <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
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

          <MentrixaFormField
            label="Email"
            value={user.email}
            isReadOnly
            tone="dark"
            hint="Email cannot be changed. Contact support if needed."
            message={settingsProfileFieldMessage("email")}
            suppressFooter
          />

          <MentrixaFormField
            label="Display name"
            value={settings.display_name ?? ""}
            onChange={(v) => update("display_name", v || null)}
            placeholder={user.email.split("@")[0]}
            maxLength={100}
            tone="dark"
            message={settingsProfileFieldMessage("display_name")}
          />

          <MentrixaFormField
            label="Bio"
            multiline
            rows={4}
            value={settings.bio ?? ""}
            onChange={(v) => update("bio", v || null)}
            placeholder={
              isTutor
                ? "What you teach, your style, and what learners should know."
                : "Tell tutors a little about your goals."
            }
            maxLength={280}
            tone="dark"
            hint="Keep it short so your profile reads cleanly."
            message={settingsProfileFieldMessage("bio")}
          />

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
            <MentrixaTimezoneSelect
              value={settings.timezone}
              onChange={(tz) => update("timezone", tz)}
              tone="dark"
              brandKind={isTutor ? "guide" : "mentrixer"}
            />
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
        </MentrixaFieldset>

        {/* ── Notifications ────────────────────────────────────────── */}
        <Section title="Email notifications" description="Choose which emails you receive.">
          <MentrixaSettingsSwitchGroup
            ariaLabel={notificationSwitchGroupAriaLabel()}
            tone="dark"
          >
            <MentrixaSettingsSwitch
              label="Session reminders"
              description="Receive a reminder 1 hour before your session starts."
              isSelected={settings.email_session_reminders}
              onChange={(v) => update("email_session_reminders", v)}
              settingId="email_session_reminders"
              isTutor={isTutor}
              tone="dark"
            />
            <MentrixaSettingsSwitch
              label="Session booked"
              description={
                isTutor
                  ? "When a student books a session with you."
                  : "Confirmation when you book a session."
              }
              isSelected={settings.email_session_booked}
              onChange={(v) => update("email_session_booked", v)}
              settingId="email_session_booked"
              isTutor={isTutor}
              tone="dark"
            />
            <MentrixaSettingsSwitch
              label="Session cancelled"
              description="When a session is cancelled by either party."
              isSelected={settings.email_session_cancelled}
              onChange={(v) => update("email_session_cancelled", v)}
              settingId="email_session_cancelled"
              isTutor={isTutor}
              tone="dark"
            />
            <MentrixaSettingsSwitch
              label="Weekly summary"
              description={
                isTutor
                  ? "Weekly report with sessions taught, revenue, and ratings."
                  : "Weekly digest of your learning progress and XP."
              }
              isSelected={settings.email_weekly_summary}
              onChange={(v) => update("email_weekly_summary", v)}
              settingId="email_weekly_summary"
              isTutor={isTutor}
              tone="dark"
            />
            <MentrixaSettingsSwitch
              label="Product updates"
              description="New features, tips, and announcements from Mentrixa."
              isSelected={settings.email_marketing}
              onChange={(v) => update("email_marketing", v)}
              settingId="email_marketing"
              isTutor={isTutor}
              tone="dark"
            />
          </MentrixaSettingsSwitchGroup>
        </Section>

        {/* ── Session preferences (tutors only) ────────────────────── */}
        {isTutor && (
          <Section
            title="Session defaults"
            description="Default values when creating new availability slots."
          >
            <Field label="Default session duration">
              <MentrixaNumberField
                label="Default session duration"
                tone="dark"
                value={settings.session_default_duration}
                onChange={(v) => update("session_default_duration", v)}
                minValue={15}
                maxValue={120}
                step={15}
                suffix="minutes"
                validate={validateSessionDurationMinutes}
                message={guideSessionNumberFieldMessage("session_default_duration")}
              />
            </Field>

            <Field label="Buffer between sessions">
              <MentrixaNumberField
                label="Buffer between sessions"
                tone="dark"
                value={settings.session_buffer_minutes}
                onChange={(v) => update("session_buffer_minutes", v)}
                minValue={0}
                maxValue={60}
                step={5}
                suffix="minutes"
                validate={validateSessionBufferMinutes}
                message={guideSessionNumberFieldMessage("session_buffer_minutes")}
              />
            </Field>
          </Section>
        )}

        {isStudent && (
          <Section
            title="Skill duels"
            description="Other learners can send you a pending challenge. You accept to generate the same quiz for both."
          >
            <MentrixaSettingsSwitch
              label="Accept duel challenges from other learners"
              description="When off, no one can challenge you until you turn this on."
              isSelected={settings.duel_opt_in}
              onChange={(v) => update("duel_opt_in", v)}
              settingId="duel_opt_in"
              tone="dark"
            />
          </Section>
        )}

        {/* ── Admin-only section ───────────────────────────────────── */}
        {isAdmin && (
          <Section
            title="Admin preferences"
            description="Settings specific to your admin role."
          >
            <MentrixaSettingsSwitch
              label="Weekly summary"
              description="Receive a weekly email with platform stats: new users, sessions, revenue."
              isSelected={settings.email_weekly_summary}
              onChange={(v) => update("email_weekly_summary", v)}
              settingId="email_weekly_summary"
              isTutor={isTutor}
              tone="dark"
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

        <MentrixaSettingsSectionDivider />

        {/* ── Change password ──────────────────────────────────────── */}
        <MentrixaFieldset
          legend="Change password"
          description="Update your sign-in password."
          tone="dark"
          message={settingsPasswordFieldsetMessage()}
          actions={
            <>
              <Button
                variant="outline"
                onClick={handlePasswordChange}
                disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              >
                {pwSaving ? "Updating..." : "Update password"}
              </Button>
              {pwMsg ? (
                <span
                  className={`text-sm font-medium ${
                    pwMsg.type === "ok" ? "text-indigo-400" : "text-red-400"
                  }`}
                >
                  {pwMsg.text}
                </span>
              ) : null}
            </>
          }
        >
          <MentrixaFormField
            label="Current password"
            type="password"
            value={currentPw}
            onChange={setCurrentPw}
            placeholder="••••••••"
            autoComplete="current-password"
            tone="dark"
            message={settingsPasswordFieldMessage("current_password")}
          />
          <MentrixaFormField
            label="New password"
            type="password"
            value={newPw}
            onChange={setNewPw}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            validate={validateNewPassword}
            tone="dark"
            hint="Must be at least 8 characters with 1 uppercase and 1 number"
            message={settingsPasswordFieldMessage("new_password")}
          />
          <MentrixaFormField
            label="Confirm new password"
            type="password"
            value={confirmPw}
            onChange={setConfirmPw}
            placeholder="Re-enter new password"
            autoComplete="new-password"
            validate={(value) =>
              value && newPw && value !== newPw ? "Passwords do not match" : null
            }
            tone="dark"
            message={settingsPasswordFieldMessage("confirm_password")}
          />
        </MentrixaFieldset>

        <MentrixaSettingsSectionDivider />

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
