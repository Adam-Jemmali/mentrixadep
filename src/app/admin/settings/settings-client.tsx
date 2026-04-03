"use client";

import { useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { updateSystemSetting } from "@/app/actions/admin";
import type { SystemSettings } from "@/app/actions/admin";



interface Props {
  settings: SystemSettings;
}

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
  children: ReactNode;
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
          <Image src="/images/approved.png" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Registration</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Auto-approve registrations"
            description="When enabled, new learners and guides are approved instantly without manual review."
            img="/images/approved.png"
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
          <Image src="/images/quest.png" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quests</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Max quests per day"
            description="Limit how many AI-generated quests a learner can start per calendar day."
            img="/images/quest.png"
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
          <Image src="/images/admin.png" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payments</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Platform fee percentage"
            description="Percentage of each session payment retained by Mentrixa before paying out guides."
            img="/images/admin.png"
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
          <Image src="/images/sword.png" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Feature Flags</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Skill duels"
            description="Allow learners to challenge each other to real-time quiz duels."
            img="/images/sword.png"
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
            img="/images/clan.png"
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
            img="/images/quest.png"
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
          <Image src="/images/pending.png" alt="" width={14} height={14} className="object-contain opacity-60" />
          <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Maintenance</p>
        </div>
        <div className="bg-white border border-red-100 rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
          <SettingRow
            label="Maintenance mode"
            description="When on, all non-admin users see a maintenance page. Use during deployments or critical fixes."
            img="/images/pending.png"
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
            <Image src="/images/pending.png" alt="" width={16} height={16} className="object-contain shrink-0" />
            <p className="text-[12px] text-amber-800 font-medium">
              Maintenance mode is active. Learners and guides cannot access the platform.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
