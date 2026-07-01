"use client";

import { useSearchParams } from "next/navigation";
import { mentrixStudent, mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";
import { QuestPracticeWorkspace } from "./quest-practice-workspace";
import { GuestQuestClient } from "@/app/(marketing)/try/guest-quest-client";
import { Typewriter } from "@/shared/ui/typewriter";
import { TiltCard } from "@/shared/ui/tilt-card";
import { BackButton } from "@/shared/ui/back-button";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { OnboardingStepsProgressBar } from "@/shared/ui/progress-bar-patterns";
import { VerifiedFirstAttemptAlert } from "@/shared/ui/alert-patterns";
import { VerifiedFirstAttemptDisclosure } from "@/shared/ui/disclosure-patterns";

export function QuestPageClient({
  subjectOptions,
  guestMode = false,
  diagnosticMode = false,
}: {
  subjectOptions: { key: string; name: string }[];
  guestMode?: boolean;
  diagnosticMode?: boolean;
}) {
  const searchParams = useSearchParams();
  const onboardingMode = !guestMode && searchParams.get("onboarding") === "true";

  if (onboardingMode) {
    return (
      <div className={`${mentrixStudent.pageBg} min-h-screen`}>
        <div className="mx-auto w-full max-w-5xl space-y-3 px-4 pt-4 sm:px-6">
          <OnboardingStepsProgressBar currentStep={1} totalSteps={5} tone="light" />
          <VerifiedFirstAttemptAlert kind="onboarding" subjectLabel={AP_CALC_AB_SUBJECT} />
          <div className="mt-3">
            <VerifiedFirstAttemptDisclosure subjectLabel={AP_CALC_AB_SUBJECT} />
          </div>
        </div>
        <QuestPracticeWorkspace subjectOptions={subjectOptions} onboardingMode />
      </div>
    );
  }

  return (
    <div
      className={
        guestMode ? "w-full" : `${mentrixStudent.pageBg} min-h-0 md:min-h-[calc(100dvh-3.5rem)]`
      }
    >
      {!guestMode ? (
        <div className="mb-4 px-4 pt-4 sm:px-6">
          <BackButton />
        </div>
      ) : null}

      {guestMode && !diagnosticMode ? (
        <div className="mx-4 mb-4 sm:mx-6">
          <VerifiedFirstAttemptAlert kind="guest_preview" subjectLabel={AP_CALC_AB_SUBJECT} />
          <div className="mt-3">
            <VerifiedFirstAttemptDisclosure subjectLabel={AP_CALC_AB_SUBJECT} />
          </div>
        </div>
      ) : null}

      {!diagnosticMode ? (
        <TiltCard
          tiltLimit={2}
          className="mx-surface-light block rounded-none border-b border-violet-200 px-4 pt-5 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] sm:px-6"
        >
          <p className={mentrixStudent.sectionEyebrowOnLight}>
            {guestMode ? "Quest preview" : null}
          </p>
          <h1 className={`mt-1 h-[28px] ${mentrixProfileType.pageTitle}`}>
            <Typewriter text={AP_CALC_AB_SUBJECT} speed={70} waitTime={8000} />
          </h1>
          <p className={`mt-0.5 ${mentrixProfileType.pageSubtitle}`}>
            {guestMode
              ? "Same verified item bank students use. Preview only until you sign up."
              : "First attempt per skill counts toward rank. Practice after that never moves it."}
          </p>
        </TiltCard>
      ) : null}

      {guestMode ? (
        <GuestQuestClient defaultSubjects={subjectOptions} embedded diagnosticMode={diagnosticMode} />
      ) : (
        <QuestPracticeWorkspace subjectOptions={subjectOptions} />
      )}
    </div>
  );
}
