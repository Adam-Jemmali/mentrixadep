"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FeedbackWidget() {
  const pathname = usePathname();
  const studentShell = pathname.startsWith("/student");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const remaining = useMemo(() => 2000 - message.length, [message.length]);

  async function submitFeedback(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please add a short message before sending.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: message.trim(),
          pagePath: pathname,
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not send feedback right now. Please try again.");
        return;
      }

      setMessage("");
      setSuccess("Thanks. Your feedback was sent.");
      window.setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1000);
    } catch {
      setError("Could not send feedback right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className={cn(
          "fixed z-[70] inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-slate-800 md:px-4 md:py-2.5",
          studentShell
            ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 md:bottom-4 md:right-4"
            : "bottom-4 right-4",
        )}
      >
        <MessageSquareText className="h-5 w-5 shrink-0 md:h-4 md:w-4" aria-hidden />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-y-auto overflow-x-hidden p-4 sm:w-full sm:p-6">
          <form onSubmit={submitFeedback} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">Send feedback</DialogTitle>
              <DialogDescription>
                Tell us what was confusing, broken, or missing. We read every submission.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                placeholder="What happened? What did you expect?"
                className="min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                maxLength={2000}
                required
              />
              <div className="text-right text-xs text-slate-500">{remaining} characters left</div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
            </div>

            <DialogFooter>
              <Button type="button" className="text-white" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel  
              </Button>
              <Button type="submit" disabled={busy || !message.trim()}>
                {busy ? "Sending..." : "Send feedback"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
