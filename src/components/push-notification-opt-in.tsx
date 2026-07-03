"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

const PUSH_DISMISS_KEY = "mentrixa-push-prompt-dismissed";
const PUSH_SUBSCRIBED_KEY = "mentrixa-push-subscribed";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export function PushNotificationOptIn() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (!pathname.startsWith("/student")) {
      setOpen(false);
      return;
    }
    if (localStorage.getItem(PUSH_DISMISS_KEY) === "1" || localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "1") return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/student/pwa-context", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { completedSessions?: number };
        if ((data.completedSessions ?? 0) >= 3) setOpen(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const subscribe = async () => {
    setError(null);
    setBusy(true);
    try {
      const vapidRes = await fetch("/api/push/vapid-public");
      const vapidJson = (await vapidRes.json()) as { configured?: boolean; publicKey?: string | null };
      if (!vapidJson.configured || !vapidJson.publicKey) {
        setError("Push is not configured yet. Ask your admin to add VAPID keys.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidJson.publicKey),
      });
      const body = sub.toJSON();
      if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
        setError("Could not read subscription keys.");
        setBusy(false);
        return;
      }
      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: body.endpoint,
          keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
        }),
      });
      if (!save.ok) {
        setError("Could not save subscription.");
        setBusy(false);
        return;
      }
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, "1");
      setOpen(false);
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : "";
      if (/permission denied|denied/i.test(rawMessage)) {
        setError("Notification permission is blocked. Enable notifications in your browser site settings.");
      } else {
        setError(rawMessage || "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(PUSH_DISMISS_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg text-blue-900 font-semibold">Enable notifications?</DialogTitle>
          <DialogDescription className="text-sm text-slate-600 leading-relaxed">
            Get session reminders, duel challenges, and level-up moments.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button type="button" variant="outline" className="min-h-[44px]  text-white w-full sm:w-auto" onClick={dismiss}>
            Not now
          </Button>
          <Button type="button" className="min-h-[44px] w-full sm:w-auto" disabled={busy} onClick={() => void subscribe()}>
            {busy ? "Enabling…" : "Enable notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
