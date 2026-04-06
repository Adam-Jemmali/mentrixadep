"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLATFORM_FEE_BPS } from "@/lib/booking-pricing";

const HOLD_DAYS = 7;
const TUTOR_SHARE_BPS = 10_000 - PLATFORM_FEE_BPS;

function tutorNetCents(grossCents: number): number {
  return Math.round((grossCents * TUTOR_SHARE_BPS) / 10_000);
}

function platformFeeCents(grossCents: number): number {
  return grossCents - tutorNetCents(grossCents);
}

function holdUntilFromSessionEnd(endIso: string | null): string | null {
  if (!endIso) return null;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return null;
  return new Date(end.getTime() + HOLD_DAYS * 86_400_000).toISOString();
}

export type PayoutLedgerRow = {
  id: string;
  session_id: string | null;
  session_date: string | null;
  course: string | null;
  gross_cents: number;
  platform_fee_cents: number;
  net_cents: number;
  status: "held" | "transferred";
  transfer_id: string | null;
  transferred_at: string | null;
  hold_until: string | null;
  created_at: string;
  student_id?: string | null;
  student_name?: string | null;
};

export type PayoutDashboardData = {
  pendingCents: number;
  heldCents: number;
  availableCents: number;
  lifetimeEarnedCents: number;
  ledger: PayoutLedgerRow[];
};

export async function getPayoutDashboardData(tutorIdOverride?: string): Promise<PayoutDashboardData> {
  const user = await requireRole(["tutor", "admin"]);
  const tutorId = tutorIdOverride ?? user.id;
  const admin = createAdminClient();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, student_id, course, start_time, end_time, price_per_session")
    .eq("tutor_id", tutorId)
    .eq("status", "completed")
    .order("end_time", { ascending: false })
    .limit(100);

  const rows = sessions ?? [];
  const studentIds = [...new Set(rows.map((r) => r.student_id).filter(Boolean))] as string[];
  const nameMap = new Map<string, string>();

  if (studentIds.length > 0) {
    const { data: settings } = await admin
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", studentIds);

    (settings ?? []).forEach((row) => {
      if (row.display_name) {
        nameMap.set(row.user_id, row.display_name);
      }
    });

    await Promise.all(
      studentIds
        .filter((id) => !nameMap.has(id))
        .map(async (id) => {
          try {
            const { data: authUser } = await admin.auth.admin.getUserById(id);
            const email = authUser?.user?.email;
            if (email) {
              nameMap.set(id, email.split("@")[0] ?? "Learner");
            }
          } catch {
            // Best-effort fallback only.
          }
        })
    );
  }

  const now = Date.now();
  let heldCents = 0;
  let availableCents = 0;
  let lifetimeEarnedCents = 0;

  const ledger: PayoutLedgerRow[] = rows.map((row) => {
    const gross = typeof row.price_per_session === "number" ? row.price_per_session : 0;
    const net = tutorNetCents(gross);
    const holdUntil = holdUntilFromSessionEnd(row.end_time);
    const holdTs = holdUntil ? new Date(holdUntil).getTime() : 0;
    const isHeld = holdTs > now;
    const status: "held" | "transferred" = isHeld ? "held" : "transferred";

    if (isHeld) {
      heldCents += net;
    } else {
      availableCents += net;
    }
    lifetimeEarnedCents += net;

    return {
      id: row.id,
      session_id: row.id,
      session_date: row.start_time,
      student_id: row.student_id,
      student_name: row.student_id ? (nameMap.get(row.student_id) ?? null) : null,
      course: row.course,
      gross_cents: gross,
      platform_fee_cents: platformFeeCents(gross),
      net_cents: net,
      status,
      transfer_id: null,
      transferred_at: !isHeld ? row.end_time : null,
      hold_until: holdUntil,
      created_at: row.end_time ?? row.start_time ?? new Date().toISOString(),
    };
  });

  return {
    pendingCents: 0,
    heldCents,
    availableCents,
    lifetimeEarnedCents,
    ledger,
  };
}
