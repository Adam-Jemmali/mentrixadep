"use client";

import { useState } from "react";
import { addTutorCourse, removeTutorCourse } from "@/features/tutor/courses";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { GuideStickyNote } from "@/features/tutor/ui/guide-sticky-note";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { AP_CALC_AB_SUBJECT, findGuideApCalcCourse } from "@/features/tutor/guide-ap-calc-pure";
import { GUIDE_PROFICIENCY } from "@/features/tutor/guide-home-copy-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { ProficiencyScanResult } from "@/features/tutor/guide-proficiency-scan-pure";
import { GuideProficiencyScanReveal } from "@/features/tutor/ui/guide-proficiency-scan-reveal";

interface TutorCourseItem {
  id: string;
  course_name: string;
  proof_description: string;
  verified: boolean;
}

interface CourseManagerProps {
  courses: TutorCourseItem[];
}

export function CourseManager({ courses }: CourseManagerProps) {
  const apCalc = findGuideApCalcCourse(courses);
  const [proof, setProof] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ProficiencyScanResult | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!proof.trim()) {
      setError(GUIDE_PROFICIENCY.errMastery);
      return;
    }
    if (!evidenceLink.trim()) {
      setError(GUIDE_PROFICIENCY.errEvidence);
      return;
    }
    setLoading(true);
    setError(null);
    setScanResult(null);
    setScanComplete(false);
    try {
      const result = await addTutorCourse(
        AP_CALC_AB_SUBJECT,
        proof,
        evidenceLink.trim(),
        viewingAsUserId ?? undefined,
      );

      setScanResult(result.scan);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setProof("");
      setEvidenceLink("");
    } catch (err) {
      setError(err instanceof Error ? err.message : GUIDE_PROFICIENCY.errSubmit);
    } finally {
      setLoading(false);
    }
  }

  function handleScanComplete(verdict: ProficiencyScanResult["verdict"]) {
    setScanComplete(true);
    if (verdict === "verified") {
      router.refresh();
    }
  }

  async function handleRemove(courseId: string) {
    try {
      await removeTutorCourse(courseId, viewingAsUserId ?? undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : GUIDE_PROFICIENCY.errRemove);
    }
  }

  const showForm = !apCalc && !(scanResult && scanResult.verdict === "verified" && scanComplete);

  return (
    <section id="skill-manager">
      <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.home} className="h-full">
        <div className="flex items-center gap-2">
          <MentrixaVocabIcon name="skills" size={18} surface="light" title="AP Calculus AB" />
          <p className={mentrixStudent.sectionEyebrowOnLight}>{GUIDE_PROFICIENCY.eyebrow}</p>
        </div>
        <h2 className={`mt-2 ${mentrixStudent.cardTitle}`}>{AP_CALC_AB_SUBJECT}</h2>
        <p className={`mt-2 text-sm leading-relaxed ${mentrixStudent.textMutedOnLight}`}>
          {GUIDE_PROFICIENCY.intro}
        </p>

        {apCalc ? (
          <div className="mt-5 rounded-xl border border-[#C4B5FD] bg-white/90 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-[#0B1220]">{apCalc.course_name}</span>
                  {apCalc.verified ? (
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                      {GUIDE_PROFICIENCY.verified}
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                      {GUIDE_PROFICIENCY.pending}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#334155]">{apCalc.proof_description}</p>
                {!apCalc.verified ? (
                  <p className="mt-2 text-xs font-medium text-amber-900">{GUIDE_PROFICIENCY.slotsLocked}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleRemove(apCalc.id)}
                className="shrink-0 rounded-full border border-[#CBD5E1] bg-white px-2 py-1 text-xs font-semibold text-[#64748B] hover:border-red-200 hover:text-red-700"
                title={GUIDE_PROFICIENCY.remove}
              >
                {GUIDE_PROFICIENCY.remove}
              </button>
            </div>
          </div>
        ) : null}

        {scanResult ? (
          <GuideProficiencyScanReveal scan={scanResult} onComplete={handleScanComplete} />
        ) : null}

        {showForm ? (
          <form onSubmit={handleAdd} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-[#475569]">
                {GUIDE_PROFICIENCY.masteryLabel}
              </label>
              <textarea
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder={GUIDE_PROFICIENCY.masteryPlaceholder}
                className="w-full min-h-[7rem] rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#0B1220] placeholder:text-[#64748B] resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]"
                maxLength={500}
                disabled={loading || Boolean(scanResult && !scanComplete)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-[#475569]">
                {GUIDE_PROFICIENCY.evidenceLabel}
              </label>
              <Input
                value={evidenceLink}
                onChange={(e) => setEvidenceLink(e.target.value)}
                placeholder={GUIDE_PROFICIENCY.evidencePlaceholder}
                className="h-11 border-[#CBD5E1] bg-white text-[#0B1220] placeholder:text-[#64748B]"
                maxLength={500}
                type="url"
                disabled={loading || Boolean(scanResult && !scanComplete)}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              variant="workbenchPrimary"
              disabled={loading || Boolean(scanResult && !scanComplete)}
            >
              {loading ? GUIDE_PROFICIENCY.submitting : GUIDE_PROFICIENCY.submit}
            </Button>
          </form>
        ) : null}

        {scanResult && scanComplete && scanResult.verdict === "needs_revision" ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => {
              setScanResult(null);
              setScanComplete(false);
              setError(null);
            }}
          >
            Revise proof
          </Button>
        ) : null}

        {error && apCalc ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900">
            {error}
          </p>
        ) : null}
      </GuideStickyNote>
    </section>
  );
}
