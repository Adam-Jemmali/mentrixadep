import { QuestPageClient } from "@/app/(app)/student/quest/quest-page-client";
import { getDivisionsCatalog } from "@/features/divisions/leaderboard";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { HeroMentrixerBounce } from "@/features/student-profile/ui/hero-mentrixer-bounce";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { BackButton } from "@/shared/ui/back-button";
import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { Typewriter } from "@/shared/ui/typewriter";
import { TiltCard } from "@/shared/ui/tilt-card";

export default async function TryPage() {
  const divisions = await getDivisionsCatalog();
  const subjectOptions = divisions.map((d) => ({ key: d.key, name: d.name }));
  const hasApCalc = subjectOptions.some(
    (option) =>
      option.name.replace(/\s+Division$/i, "").trim().toLowerCase() === "ap calculus ab",
  );
  if (!hasApCalc) {
    subjectOptions.push({ key: "ap-calculus-ab", name: AP_CALC_AB_SUBJECT });
    subjectOptions.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className={`${mentrixStudent.pageBg} relative min-h-screen`}>
      <div className="pointer-events-none absolute inset-0 z-0 opacity-80">
        <HeroMentrixerBounce />
      </div>
      <div className={`${mentrixStudent.mainWide} relative z-10`}>
        <div className="mb-6">
          <BackButton href="/" />
        </div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mt-2 h-[48px] md:h-[64px] w-full flex justify-center">
            <ParticleTextEffect
              words={["TRY A QUEST", "MENTRIXA", "PROVE IT", "CLIMB", "WIN"]}
              className="text-center"
            />
          </div>
          <div className="mt-4 min-h-[24px] w-full flex justify-center px-2">
            <Typewriter
              text="Full Quest workspace: practice packs, problem solver, and adaptive challenge scenarios."
              speed={40}
              waitTime={5000}
              className="text-center"
            />
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_6px_18px_-12px_rgba(15,23,42,0.22)]">
          <QuestPageClient subjectOptions={subjectOptions} guestMode />
        </div>
      </div>
      <div className="border-t border-slate-200/50 bg-white/30 backdrop-blur-sm py-10 mt-10">
        <div className={mentrixStudent.mainWide}>
          <TiltCard tiltLimit={2} className="p-6 bg-white/40 border border-white/40 shadow-xl rounded-3xl backdrop-blur-md">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Why try a Quest?</h2>
            <ul className="space-y-2.5 text-sm text-slate-700 max-w-2xl">
              <li className="flex gap-3">
                <span className="text-mentrixa-500 font-bold">✓</span>
                <span>Run timed practice packs with rank and XP preview</span>
              </li>
              <li className="flex gap-3">
                <span className="text-mentrixa-500 font-bold">✓</span>
                <span>Type any problem with exam, interview, or assignment scenarios</span>
              </li>
              <li className="flex gap-3">
                <span className="text-mentrixa-500 font-bold">✓</span>
                <span>Toggle adaptive challenge mode for multi step scenarios</span>
              </li>
              <li className="flex gap-3">
                <span className="text-mentrixa-500 font-bold">✓</span>
                <span>Create your free account to save everything and climb ranks</span>
              </li>
            </ul>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
