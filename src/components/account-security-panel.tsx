"use client";

import { useState } from "react";
import { updatePassword, deleteAccount } from "@/app/actions/settings";
import { isNextRedirectError } from "@/lib/is-next-redirect-error";
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
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
      setDeleting(false);
      setDeleteError(e instanceof Error ? e.message : "Failed to delete account. Please try again.");
    }
  }

  const inputClasses = "mt-2 border-indigo-100 bg-indigo-50/20 text-indigo-900 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl h-11";

  return (
    <section className={cn("mt-8 rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.08)]", className)}>
      <div className="flex items-center gap-3 mb-8">

        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-indigo-950">Identity Encryption</h2>
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-indigo-400">Current Cipher</label>
          <Input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            placeholder="Current password"
            className={inputClasses}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-indigo-400">New Cipher</label>
          <Input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            placeholder="8+ characters"
            className={inputClasses}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-indigo-400">Verify Cipher</label>
          <Input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            placeholder="Verify new password"
            className={inputClasses}
          />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-6">
        <Button
          type="button"
          onClick={() => void handlePasswordChange()}
          disabled={pwSaving || !currentPw || !newPw || !confirmPw}
          className="h-12 min-w-[200px] rounded-2xl bg-indigo-600 text-xs font-black uppercase italic tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
        >
          {pwSaving ? "Encrypting..." : "Update Cycpher"}
        </Button>
        {pwMsg ? (
          <span className={cn("text-[11px] font-black uppercase italic tracking-widest", pwMsg.type === "ok" ? "text-emerald-600" : "text-red-600")}>
            {pwMsg.text}
          </span>
        ) : null}
      </div>

      <div className="mt-10 border-t border-red-50 pt-8">
        <div className="flex items-center gap-3 mb-4">
      
           <h3 className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Termination Protocol</h3>
        </div>
        <p className="text-[11px] leading-relaxed text-red-800/60 italic max-w-xl">
          Initiating account termination is permanent. All XP data, battle history, and identity records will be purged.
        </p>

        {!deleteArmed ? (
          <Button
            type="button"
            variant="outline"
            className="mt-6 border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100 hover:text-red-700 text-[10px] font-black uppercase tracking-widest h-11 px-8 rounded-2xl"
            onClick={() => {
              setDeleteArmed(true);
              setDeleteError(null);
            }}
          >
            Purge Identity
          </Button>
        ) : (
          <div className="mt-8 space-y-5 max-w-sm rounded-3xl border border-red-100 bg-red-50/30 p-6">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-red-600">Authorization Key</label>
              <Input
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
                placeholder="Type DELETE"
                className="border-red-200 bg-white text-red-900 placeholder:text-red-200 h-11 rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="h-11 bg-red-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-700 shadow-lg shadow-red-600/20 px-6 rounded-xl"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting || !canDelete}
              >
                {deleting ? "Purging..." : "Execute Purge"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 border-indigo-100 bg-white text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-50 px-6 rounded-xl"
                onClick={() => {
                  setDeleteArmed(false);
                  setDeletePhrase("");
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Abort
              </Button>
            </div>
            {deleteError ? <p className="text-[11px] font-bold text-red-600 uppercase italic tracking-widest">{deleteError}</p> : null}
          </div>
        )}
      </div>
    </section>
  );
}
