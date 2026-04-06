"use client";

import { useState } from "react";
import { updatePassword, deleteAccount } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AccountSecurityPanel({ className }: { className?: string }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canDelete = deletePhrase.trim().toUpperCase() === "DELETE";

  async function handlePasswordChange() {
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "Passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "err", text: "Password must be at least 8 characters." });
      return;
    }

    setPwSaving(true);
    try {
      await updatePassword(currentPw, newPw);
      setPwMsg({ type: "ok", text: "Password updated." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      setPwMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Failed to update password.",
      });
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!canDelete) {
      setDeleteError('Type DELETE to confirm account removal.');
      return;
    }
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount();
      window.location.href = "/";
    } catch {
      setDeleting(false);
      setDeleteError("Failed to delete account. Please try again.");
    }
  }

  return (
    <section className={cn("mt-8 rounded-md border border-slate-200 bg-white p-5 sm:p-6", className)}>
      <h2 className="text-sm font-semibold text-slate-900">Account security</h2>
      <p className="mt-1 text-xs text-slate-500">
        Manage your sign-in password and permanently delete your account.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Current password</label>
          <Input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            placeholder="Current password"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">New password</label>
          <Input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Confirm new password</label>
          <Input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            placeholder="Re-enter new password"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handlePasswordChange()}
          disabled={pwSaving || !currentPw || !newPw || !confirmPw}
        >
          {pwSaving ? "Updating..." : "Update password"}
        </Button>
        {pwMsg ? (
          <span className={cn("text-sm font-medium", pwMsg.type === "ok" ? "text-emerald-700" : "text-red-700")}>
            {pwMsg.text}
          </span>
        ) : null}
      </div>

      <div className="mt-6 border-t border-red-100 pt-4">
        <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
        <p className="mt-1 text-xs text-red-700/80">
          Deleting your account is permanent and removes your profile, sessions, ratings, and XP data.
        </p>

        {!deleteArmed ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3 border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => {
              setDeleteArmed(true);
              setDeleteError(null);
            }}
          >
            Delete my account
          </Button>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-red-700">Type DELETE to confirm</label>
              <Input
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
                placeholder="DELETE"
                className="border-red-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting || !canDelete}
              >
                {deleting ? "Deleting..." : "Permanently delete account"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteArmed(false);
                  setDeletePhrase("");
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
            {deleteError ? <p className="text-sm text-red-700">{deleteError}</p> : null}
          </div>
        )}
      </div>
    </section>
  );
}
