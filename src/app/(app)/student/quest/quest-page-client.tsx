"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { QuestPracticeWorkspace } from "./quest-practice-workspace";
import { GuestQuestClient } from "@/app/(marketing)/try/guest-quest-client";
import { BackButton } from "@/shared/ui/back-button";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  questGuestPageEyebrow,
  questGuestPageSubtitle,
  questPageEyebrow,
  questPageSubtitle,
  questPageTitle,
} from "@/features/quest/quest-hub-messages-pure";
import { OnboardingStepsProgressBar } from "@/shared/ui/progress-bar-patterns";
import { VerifiedFirstAttemptAlert } from "@/shared/ui/alert-patterns";
import { VerifiedFirstAttemptDisclosure } from "@/shared/ui/disclosure-patterns";
import { ProductPageHeader } from "@/features/student-profile/ui/product-page-header";
import { STUDENT_ROUTE_HEADER_VARIANT } from "@/features/student-profile/student-sticky-variants";

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
      <div className={cn(mentrixStudent.pageBgHub, "min-h-[calc(100dvh-4.75rem)]")}>
        <div className="mx-auto w-full max-w-5xl space-y-3 px-4 pt-4 sm:px-6">
          <OnboardingStepsProgressBar currentStep={1} totalSteps={5} tone="dark" />
          <VerifiedFirstAttemptAlert kind="onboarding" subjectLabel={AP_CALC_AB_SUBJECT} tone="dark" />
          <div className="mt-3">
            <VerifiedFirstAttemptDisclosure subjectLabel={AP_CALC_AB_SUBJECT} tone="dark" />
          </div>
        </div>
        <QuestPracticeWorkspace subjectOptions={subjectOptions} onboardingMode />
      </div>
    );
  }

  return (
    <div className={guestMode ? "w-full" : mentrixStudent.pageBgHub}>
      <div className={guestMode ? undefined : cn(mentrixStudent.mainWide, "space-y-4 pb-10")}>
      {!guestMode ? (
        <div>
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
        <ProductPageHeader
          icon="quest"
          eyebrow={guestMode ? questGuestPageEyebrow() : questPageEyebrow()}
          title={questPageTitle()}
          subtitle={guestMode ? questGuestPageSubtitle() : questPageSubtitle()}
          stickyVariant={STUDENT_ROUTE_HEADER_VARIANT.quest}
          className="mb-0"
        />
      ) : null}

      {guestMode ? (
        <GuestQuestClient defaultSubjects={subjectOptions} embedded diagnosticMode={diagnosticMode} />
      ) : (
        <QuestPracticeWorkspace subjectOptions={subjectOptions} />
      )}
      </div>
    </div>
  );
}
