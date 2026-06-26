"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { sanitizeError } from "@/shared/core/security";
import { z } from "zod";

export interface SystemSettings {
  autoApproveRegistrations: boolean;
  maxQuestsPerDay: number;
  platformFeePercent: number;
  maintenanceMode: boolean;
  duelsEnabled: boolean;
  aiQuestsEnabled: boolean;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data } = await adminClient
    .from("system_settings")
    .select("key, value");

  const map: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }

  return {
    autoApproveRegistrations: map["auto_approve_registrations"]?.enabled !== false,
    maxQuestsPerDay: (map["max_quests_per_day"]?.value as number) ?? 10,
    platformFeePercent: (map["platform_fee_percent"]?.value as number) ?? 15,
    maintenanceMode: map["maintenance_mode"]?.enabled === true,
    duelsEnabled: map["feature_duels_enabled"]?.enabled !== false,
    aiQuestsEnabled: map["feature_ai_quests_enabled"]?.enabled !== false,
  };
}

export async function updateSystemSetting(key: string, value: Record<string, unknown>) {
  z.string().min(1).max(100).parse(key);
  z.record(z.string(), z.any()).parse(value);
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("system_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw new Error(sanitizeError(error));
  revalidatePath("/admin/settings");
  return { success: true };
}
