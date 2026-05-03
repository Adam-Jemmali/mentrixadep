"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useRealtimeRouterRefresh,
  useVisibilityRouterRefresh,
} from "@/hooks/use-realtime-router-refresh";

const POLL_MS = 12_000;
const REALTIME_DEBOUNCE_MS = 320;

/**
 * When an admin approves or rejects a registration, Postgres updates `users` and/or
 * `registration_requests`. Subscribing + soft refresh lets the server `/pending-approval`
 * page re-run `redirect()` immediately — no manual reload. Polling covers environments
 * where Realtime publication is not enabled yet.
 */
export function PendingApprovalRealtimeRefresh({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const normalizedEmail = email.trim().toLowerCase();
  const configs = useMemo(() => {
    const rows: { table: "users" | "registration_requests"; event: "UPDATE"; filter: string }[] = [
      { table: "users", event: "UPDATE", filter: `id=eq.${userId}` },
    ];
    if (normalizedEmail.length > 0) {
      rows.push({
        table: "registration_requests",
        event: "UPDATE",
        filter: `email=eq.${normalizedEmail}`,
      });
    }
    return rows;
  }, [userId, normalizedEmail]);

  useRealtimeRouterRefresh(`pending-approval:${userId}`, configs, REALTIME_DEBOUNCE_MS);
  useVisibilityRouterRefresh(14_000);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      router.refresh();
    }, POLL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [router]);

  /** Covers the narrow window where approval finished during the email-link redirect. */
  useEffect(() => {
    const t = setTimeout(() => router.refresh(), 500);
    return () => clearTimeout(t);
  }, [router]);

  return null;
}
