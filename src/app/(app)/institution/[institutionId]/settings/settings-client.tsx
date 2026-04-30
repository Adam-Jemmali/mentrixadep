"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Building2, ImageIcon } from "lucide-react";
import { updateInstitution } from "@/app/actions/institution";
import type { Institution } from "@/lib/database.types";
import { Button } from "@/components/ui/button";

export function InstitutionSettingsClient({ institution }: { institution: Institution }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(institution.name);
  const [logoUrl, setLogoUrl] = useState(institution.logo_url ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateInstitution(institution.id, {
        name: name.trim(),
        logo_url: logoUrl.trim() || null,
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8 max-w-[600px]">
      <div>
        <h1 className="text-[15px] font-semibold text-slate-900">Institution settings</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">
          Branding and identity settings visible to tutors and learners
        </p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-lg divide-y divide-[#F1F5F9]">
        {/* Institution name */}
        <div className="p-5">
          <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
            Institution name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-md bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        {/* Domain (read-only) */}
        <div className="p-5">
          <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
            Auto-enroll domain
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={institution.domain}
              readOnly
              className="flex-1 h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-md bg-[#FAFAFA] text-slate-500 cursor-not-allowed"
            />
            <span className="text-[11px] text-slate-400">Set by platform admin</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Users who sign up with @{institution.domain} emails are automatically added as students.
          </p>
        </div>

        {/* Logo URL */}
        <div className="p-5">
          <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
            Logo URL
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Paste a direct link to your institution logo (PNG or SVG, square preferred). Shown on tutor session cards.
          </p>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://your-institution.edu/logo.png"
            className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />

          {/* Preview */}
          {logoUrl ? (
            <div className="mt-3 flex items-center gap-3">
              <Image
                src={logoUrl}
                alt="Logo preview"
                width={40}
                height={40}
                unoptimized
                className="w-10 h-10 rounded-md object-contain border border-slate-200"
              />
              <p className="text-[11px] text-slate-400">Preview — how it appears on session cards</p>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              </div>
              <p className="text-[11px] text-slate-400">No logo set — initials shown instead</p>
            </div>
          )}
        </div>

        {/* Tutor view preview */}
        <div className="p-5 bg-[#FAFAFA]">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
            How tutors see institution students
          </p>
          <div className="border border-[#E5E7EB] rounded-md bg-white p-3 flex items-center gap-3 max-w-sm">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="w-5 h-5 rounded object-contain"
              />
            ) : (
              <Building2 className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
            )}
            <div>
              <p className="text-[11px] font-medium text-slate-700">{name || "Institution name"}</p>
              <p className="text-[10px] text-slate-400">Institution student</p>
            </div>
            <span className="ml-auto text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
              Inst.
            </span>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="bg-slate-900 text-white hover:bg-indigo-600"
        >
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        {saved && <p className="text-[12px] text-emerald-600">Saved.</p>}
        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}
