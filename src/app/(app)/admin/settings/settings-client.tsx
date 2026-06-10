"use client";

import { updateSystemSetting } from "@/features/admin/system-settings";
import type { SystemSettings } from "@/features/admin/system-settings";


import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";


import { createClient } from "@/shared/integrations/supabase/client";



interface Props {
  settings: SystemSettings;
}

type TotpFactor = { id: string; status?: string | null };

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-slate-900" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  img,
  children,
  danger,
}: {
  label: string;
  description: string;
  img: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 px-5 ${danger ? "bg-red-50/50" : ""}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0 pr-8">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 overflow-hidden ${danger ? "bg-red-100" : "bg-slate-100"}`}>
          <Image src={img} alt="" width={24} height={24} className="object-contain" />
        </div>
        <div>
          <p className={`text-[13px] font-medium ${danger ? "text-red-900" : "text-slate-900"}`}>{label}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-20 px-3 py-1.5 text-[13px] font-medium text-slate-900 border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-center transition-all"
      />
      {suffix && <span className="text-[12px] text-slate-500">{suffix}</span>}
    </div>
  );
}

export function AdminSettingsClient({ settings: initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [pendingFactorQrSvg, setPendingFactorQrSvg] = useState<string | null>(null);
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");

  async function refreshMfaState() {
    setMfaError(null);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMfaError(error.message);
      return;
    }
    const factors = (data.totp ?? []) as TotpFactor[];
    const verifiedTotp = factors.find((f: TotpFactor) => f.status === "verified");
    const unverifiedTotp = factors.find((f: TotpFactor) => f.status !== "verified");
    setEnrolledFactorId(verifiedTotp?.id ?? null);
    setPendingFactorId(unverifiedTotp?.id ?? null);
  }

  useEffect(() => {
    void refreshMfaState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startMfaSetup() {
    setMfaLoading(true);
    setMfaError(null);
    setMfaMessage(null);
    setPendingFactorQrSvg(null);
    setPendingChallengeId(null);
    try {
      const list = await supabase.auth.mfa.listFactors();
      if (list.error) throw list.error;
      const factors = (list.data.totp ?? []) as TotpFactor[];
      let factorId: string | null = null;
      let qrSvg: string | null = null;

      const existingUnverified = factors.find((f: TotpFactor) => f.status !== "verified");
      if (existingUnverified) {
        factorId = existingUnverified.id;
      } else {
        const enrolled = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Mentrixa Admin",
        });
        if (enrolled.error) throw enrolled.error;
        factorId = enrolled.data.id;
        qrSvg = enrolled.data.totp.qr_code ?? null;
      }

      if (!factorId) {
        throw new Error("Could not initialize 2FA setup.");
      }
      setPendingFactorId(factorId);
      setPendingFactorQrSvg(qrSvg);

      const challenged = await supabase.auth.mfa.challenge({ factorId });
      if (challenged.error) throw challenged.error;
      setPendingChallengeId(challenged.data.id);
      setMfaMessage("Scan the QR code, then enter the 6-digit code to verify.");
    } catch (error) {
      setMfaError(error instanceof Error ? error.message : "Failed to start 2FA setup.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function cancelMfaSetup() {
    if (!pendingFactorId) return;
    setMfaLoading(true);
    setMfaError(null);
    setMfaMessage(null);
    try {
      const result = await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
      if (result.error) throw result.error;
      setPendingFactorId(null);
      setPendingFactorQrSvg(null);
      setPendingChallengeId(null);
      setVerifyCode("");
      setMfaMessage("2FA setup cancelled.");
      await refreshMfaState();
    } catch (error) {
      setMfaError(error instanceof Error ? error.message : "Failed to cancel setup.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyMfaSetup() {
    if (!pendingFactorId || !pendingChallengeId) {
      setMfaError("Start setup first to generate a verification challenge.");
      return;
    }
    const code = verifyCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setMfaError("Enter a valid 6-digit authenticator code.");
      return;
    }

    setMfaLoading(true);
    setMfaError(null);
    setMfaMessage(null);
    try {
      const verified = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: pendingChallengeId,
        code,
      });
      if (verified.error) throw verified.error;
      setVerifyCode("");
      setPendingFactorQrSvg(null);
      setPendingChallengeId(null);
      setMfaMessage("2FA is enabled for your admin account.");
      await refreshMfaState();
    } catch (error) {
      setMfaError(error instanceof Error ? error.message : "Invalid code. Try again.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function disableMfa() {
    if (!enrolledFactorId) return;
    setMfaLoading(true);
    setMfaError(null);
    setMfaMessage(null);
    try {
      const result = await supabase.auth.mfa.unenroll({ factorId: enrolledFactorId });
      if (result.error) throw result.error;
      setMfaMessage("2FA disabled for your admin account.");
      setVerifyCode("");
      setPendingFactorId(null);
      setPendingFactorQrSvg(null);
      setPendingChallengeId(null);
      await refreshMfaState();
    } catch (error) {
      setMfaError(error instanceof Error ? error.message : "Failed to disable 2FA.");
    } finally {
      setMfaLoading(false);
    }
  }

  const save = (key: string, value: Record<string, unknown>) => {
    startTransition(async () => {
      try {
        await updateSystemSetting(key, value);
        setSavedKey(key);
        setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
      } catch { /* ignore */ }
    });
  };

  const updateToggle = (key: string, stateKey: keyof SystemSettings, dbKey: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [stateKey]: value }));
    save(key, { [dbKey]: value });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-[13px] text-slate-500 mt-1">Control platform behaviour, features, and limits</p>
      </div>

      {/* Registration section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Image src="/images/approved.webp" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Registration</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Auto-approve registrations"
            description="When enabled, new learners and guides are approved instantly without manual review."
            img="/images/approved.webp"
          >
            <div className="flex items-center gap-3">
              {savedKey === "auto_approve_registrations" && (
                <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
              )}
              <Toggle
                checked={settings.autoApproveRegistrations}
                disabled={isPending}
                onChange={(v) => updateToggle("auto_approve_registrations", "autoApproveRegistrations", "enabled", v)}
              />
            </div>
          </SettingRow>
        </div>
      </section>

      {/* Quests section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Image src="/images/quest.webp" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quests</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Max quests per day"
            description="Limit how many AI-generated quests a learner can start per calendar day."
            img="/images/quest.webp"
          >
            <div className="flex items-center gap-3">
              {savedKey === "max_quests_per_day" && (
                <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
              )}
              <NumberInput
                value={settings.maxQuestsPerDay}
                min={1}
                max={100}
                suffix="/ day"
                onChange={(v) => {
                  setSettings((prev) => ({ ...prev, maxQuestsPerDay: v }));
                  save("max_quests_per_day", { value: v });
                }}
              />
            </div>
          </SettingRow>
        </div>
      </section>

      {/* Payments section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Image src="/images/admin.webp" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payments</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Platform fee percentage"
            description="Percentage of each session payment retained by Mentrixa before paying out guides."
            img="/images/admin.webp"
          >
            <div className="flex items-center gap-3">
              {savedKey === "platform_fee_percent" && (
                <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
              )}
              <NumberInput
                value={settings.platformFeePercent}
                min={0}
                max={50}
                suffix="%"
                onChange={(v) => {
                  setSettings((prev) => ({ ...prev, platformFeePercent: v }));
                  save("platform_fee_percent", { value: v });
                }}
              />
            </div>
          </SettingRow>
        </div>
      </section>

      {/* Feature flags section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Image src="/images/admin.webp" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Admin Security</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Admin 2FA (Authenticator app)"
            description="Protect your admin account with one-time codes from an authenticator app."
            img="/images/admin.webp"
          >
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-medium ${enrolledFactorId ? "text-emerald-600" : "text-slate-500"}`}>
                {enrolledFactorId ? "Enabled" : "Not enabled"}
              </span>
            </div>
          </SettingRow>
          <div className="px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startMfaSetup}
                disabled={mfaLoading}
                className="px-3 py-2 text-[12px] rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {mfaLoading ? "Working..." : pendingFactorId ? "Restart setup" : enrolledFactorId ? "Reset setup" : "Set up 2FA"}
              </button>
              {pendingFactorId ? (
                <button
                  type="button"
                  onClick={cancelMfaSetup}
                  disabled={mfaLoading}
                  className="px-3 py-2 text-[12px] rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel setup
                </button>
              ) : null}
              {enrolledFactorId ? (
                <button
                  type="button"
                  onClick={disableMfa}
                  disabled={mfaLoading}
                  className="px-3 py-2 text-[12px] rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Disable 2FA
                </button>
              ) : null}
            </div>

            {pendingFactorQrSvg ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[12px] text-slate-700 mb-2">Scan this code in Google Authenticator, 1Password, Authy, or similar:</p>
                <div
                  className="inline-block rounded bg-white p-2 border border-slate-200"
                  dangerouslySetInnerHTML={{ __html: pendingFactorQrSvg }}
                />
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="123456"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-28 px-3 py-2 text-[12px] rounded-lg border border-slate-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={verifyMfaSetup}
                    disabled={mfaLoading}
                    className="px-3 py-2 text-[12px] rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Verify code
                  </button>
                </div>
              </div>
            ) : null}

            {mfaError ? <p className="mt-3 text-[12px] text-red-600">{mfaError}</p> : null}
            {mfaMessage ? <p className="mt-3 text-[12px] text-emerald-600">{mfaMessage}</p> : null}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Image src="/images/sword.webp" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Feature Flags</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Skill duels"
            description="Allow learners to challenge each other to real-time quiz duels."
            img="/images/sword.webp"
          >
            <div className="flex items-center gap-3">
              {savedKey === "feature_duels_enabled" && (
                <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
              )}
              <Toggle
                checked={settings.duelsEnabled}
                disabled={isPending}
                onChange={(v) => updateToggle("feature_duels_enabled", "duelsEnabled", "enabled", v)}
              />
            </div>
          </SettingRow>
          <SettingRow
            label="Clans"
            description="Enable team-based communities where learners can form groups and compete."
            img="/images/clan.webp"
          >
            <div className="flex items-center gap-3">
              {savedKey === "feature_clans_enabled" && (
                <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
              )}
              <Toggle
                checked={settings.clansEnabled}
                disabled={isPending}
                onChange={(v) => updateToggle("feature_clans_enabled", "clansEnabled", "enabled", v)}
              />
            </div>
          </SettingRow>
          <SettingRow
            label="Mentrixa quests"
            description="Allow learners to generate AI-powered practice quests."
            img="/images/quest.webp"
          >
            <div className="flex items-center gap-3">
              {savedKey === "feature_ai_quests_enabled" && (
                <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
              )}
              <Toggle
                checked={settings.aiQuestsEnabled}
                disabled={isPending}
                onChange={(v) => updateToggle("feature_ai_quests_enabled", "aiQuestsEnabled", "enabled", v)}
              />
            </div>
          </SettingRow>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Image src="/images/pending.webp" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Maintenance</p>
        </div>
        <div className="bg-white border border-red-100 rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Maintenance mode"
            description="When on, all non-admin users see a maintenance page. Use during deployments or critical fixes."
            img="/images/pending.webp"
            danger
          >
            <div className="flex items-center gap-3">
              {savedKey === "maintenance_mode" && (
                <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
              )}
              <Toggle
                checked={settings.maintenanceMode}
                disabled={isPending}
                onChange={(v) => updateToggle("maintenance_mode", "maintenanceMode", "enabled", v)}
              />
            </div>
          </SettingRow>
        </div>
        {settings.maintenanceMode && (
          <div className="mt-3 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Image src="/images/pending.webp" alt="" width={16} height={16} className="object-contain shrink-0" />
            <p className="text-[12px] text-amber-800 font-medium">
              Maintenance mode is active. Learners and guides cannot access the platform.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
