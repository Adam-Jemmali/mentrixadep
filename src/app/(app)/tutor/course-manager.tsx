"use client";

import { useState } from "react";
import { addTutorCourse, removeTutorCourse } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";
import { GooeyText } from "@/components/ui/gooey-text";
import { ParticleTextEffect } from "@/components/ui/particle-text";
import { BubbleText } from "@/components/ui/bubble-text";

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
  const [courseName, setCourseName] = useState("");
  const [proof, setProof] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!courseName.trim() || !proof.trim() || !evidenceLink.trim()) {
      setError("Course name, mastery proof, and evidence link are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addTutorCourse(courseName, proof, evidenceLink, viewingAsUserId ?? undefined);
      setCourseName("");
      setProof("");
      setEvidenceLink("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add course");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(courseId: string) {
    try {
      await removeTutorCourse(courseId, viewingAsUserId ?? undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove course");
    }
  }

  return (
    <div id="course-manager" className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] backdrop-blur-2xl">
      {/* Cinematic Soft Glows */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-mentrixa-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      {/* Particle Header */}
      <div className="absolute -top-16 left-0 right-0 h-48 pointer-events-none opacity-40 z-0">
        <ParticleTextEffect 
          words={["COURSES", "MASTERY", "EXPERTISE"]} 
          className="h-full scale-110" 
        />
      </div>

      <div className="relative z-20">
        <div className="flex flex-col gap-2 mb-10">
          <GooeyText 
            texts={["PROFICIENCIES", "KNOWLEDGE", "GUIDANCE"]} 
            className="justify-start w-auto"
            textClassName="text-2xl font-black tracking-[-0.05em] text-slate-900"
          />
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-mentrixa-600 ml-0.5">
              Courses
            </h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-mentrixa-200 to-transparent" />
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-[1.5rem] border border-slate-100 bg-slate-50/50 mb-10 backdrop-blur-sm">
            <div className="relative mb-6">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={48} height={48} className="relative opacity-20 grayscale" />
            </div>
            <p className="text-sm font-bold text-slate-800 tracking-tight">
              Awaiting your expertise.
            </p>
            <p className="text-xs text-slate-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
              Add the subjects you master to begin your journey as a Guide.
            </p>
          </div>
        ) : (
          <div className="mb-10 space-y-4">
            {courses.map((c) => (
              <div 
                key={c.id} 
                className="group relative flex items-start justify-between p-5 rounded-2xl border border-slate-100 bg-white transition-all hover:bg-slate-50 hover:border-slate-200 hover:scale-[1.01] hover:shadow-lg"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-slate-900 tracking-tight">{c.course_name}</span>
                    {c.verified && (
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    )}
                    {!c.verified && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        Pending admin review
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                    {c.proof_description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(c.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 border border-slate-200"
                  title="Remove course"
                >
                  <span className="text-base font-bold leading-none mt-[-1px]">×</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="relative space-y-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-6 shadow-inner">
          <div className="relative space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Subject Title</label>
              <Input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Linear Algebra"
                className="h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-mentrixa-500 focus:ring-mentrixa-500/10 rounded-xl font-bold"
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Evidence of Mastery</label>
              <textarea
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder="e.g. TA for 3 terms, A+ grade, Published research..."
                className="w-full h-28 text-sm rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-mentrixa-500/10 focus:border-mentrixa-500 transition-all font-semibold"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                Physical evidence link
              </label>
              <Input
                value={evidenceLink}
                onChange={(e) => setEvidenceLink(e.target.value)}
                placeholder="https://... (certificate, transcript, portfolio, publication)"
                className="h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-mentrixa-500 focus:ring-mentrixa-500/10 rounded-xl font-semibold"
                maxLength={500}
                type="url"
              />
              <p className="text-[11px] text-slate-500">
                Admin reviews this evidence before proficiency is established.
              </p>
            </div>

            {error && <p className="text-xs font-bold text-red-500 bg-red-50 px-4 py-3 rounded-xl border border-red-200">{error}</p>}
            
            <Button 
              type="submit" 
              className="relative w-full h-12 bg-slate-900 text-white hover:bg-slate-800 transition-all font-black overflow-hidden group shadow-xl rounded-xl" 
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Syncing...
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  <Image src={MENTRIXA_LOGO_PNG} alt="" width={18} height={18} className="h-4.5 w-4.5 brightness-0 invert" />
                  <BubbleText text="Establish Proficiency" className="text-white font-black text-sm" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}
