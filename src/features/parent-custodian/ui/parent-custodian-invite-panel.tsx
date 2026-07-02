"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { inviteParentCustodian } from "@/features/parent-custodian/invite-parent-custodian";
import { buildParentCustodianInviteCopy } from "@/features/parent-custodian/parent-custodian-pure";

type ParentCustodianInvitePanelProps = {
  studentFirstName: string;
};

export function ParentCustodianInvitePanel({ studentFirstName }: ParentCustodianInvitePanelProps) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const preview = buildParentCustodianInviteCopy({
    studentFirstName,
    custodianEmail: email || "parent@example.com",
  });

  async function submitInvite() {
    setPending(true);
    setError(null);
    const result = await inviteParentCustodian({ custodianEmail: email });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    setInviteUrl(result.inviteUrl);
    setPending(false);
  }

  return (
    <section className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
      <p className="text-sm font-semibold text-indigo-950">Parent custodian view</p>
      <p className="mt-2 text-sm text-indigo-900">{preview.verdict}</p>
      <p className="mt-1 text-sm text-indigo-800">{preview.nextAction}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Parent email"
          className="min-h-11 flex-1 rounded-xl border border-indigo-200 bg-white px-3 text-sm"
        />
        <Button type="button" disabled={pending || !email} onClick={() => void submitInvite()}>
          {pending ? "Sending…" : "Create invite link"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {inviteUrl ? (
        <p className="mt-3 break-all text-xs text-indigo-900">
          Share this link: {inviteUrl}
        </p>
      ) : null}
    </section>
  );
}
