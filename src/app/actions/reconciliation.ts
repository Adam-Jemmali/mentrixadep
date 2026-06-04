"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureUnexpectedError } from "@/lib/observability";

export interface PipelineHealth {
  checkoutsStarted: number;
  checkoutsCompleted: number;
  checkoutsExpired: number;
  webhooksReceived: number;
  webhooksFailed: number;
  sessionsBooked: number;
  orphanedPayments: OrphanedPayment[];
  recentWebhookErrors: WebhookError[];
}

export interface OrphanedPayment {
  checkoutSessionId: string;
  eventType: string;
  createdAt: string;
}

export interface WebhookError {
  eventId: string;
  eventType: string;
  createdAt: string;
}

export async function getReconciliationData(
  days: number = 7
): Promise<PipelineHealth | null> {
  await requireRole("admin");
  const admin = createAdminClient();

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [webhookLogs, sessionRequests, sessions] = await Promise.all([
      admin
        .from("stripe_webhook_log")
        .select("event_id, event_type, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
      admin
        .from("session_requests")
        .select("id, status, stripe_checkout_session_id, created_at")
        .gte("created_at", since),
      admin
        .from("sessions")
        .select("id, created_at")
        .gte("created_at", since),
    ]);

    const logs = webhookLogs.data ?? [];
    const requests = sessionRequests.data ?? [];

    const checkoutCompleted = logs.filter(
      (l) => l.event_type === "checkout.session.completed"
    );
    const checkoutExpired = logs.filter(
      (l) => l.event_type === "checkout.session.expired"
    );

    const bookedRequestIds = new Set(
      requests
        .filter((r) => r.status === "approved" || r.status === "pending")
        .map((r) => r.stripe_checkout_session_id)
        .filter(Boolean)
    );

    const orphaned: OrphanedPayment[] = checkoutCompleted
      .filter((log) => !bookedRequestIds.has(log.event_id))
      .slice(0, 20)
      .map((log) => ({
        checkoutSessionId: log.event_id,
        eventType: log.event_type,
        createdAt: log.created_at,
      }));

    const allCheckoutEvents = logs.filter((l) =>
      l.event_type.startsWith("checkout.session.")
    );

    return {
      checkoutsStarted: allCheckoutEvents.length,
      checkoutsCompleted: checkoutCompleted.length,
      checkoutsExpired: checkoutExpired.length,
      webhooksReceived: logs.length,
      webhooksFailed: 0,
      sessionsBooked: (sessions.data ?? []).length,
      orphanedPayments: orphaned,
      recentWebhookErrors: [],
    };
  } catch (err) {
    captureUnexpectedError("reconciliation-data", err);
    return null;
  }
}
