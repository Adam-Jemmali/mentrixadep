import { GuestQuestClient } from "@/app/(marketing)/try/guest-quest-client";
import { TryQuestShell } from "@/app/(marketing)/try/try-quest-shell";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { BackButton } from "@/shared/ui/back-button";

const AP_CALC_SUBJECT_OPTIONS = [{ key: "ap-calculus-ab", name: AP_CALC_AB_SUBJECT }];

export default function TryPage() {
  return (
    <TryQuestShell>
      <div className={`${mentrixStudent.mainWide} py-8`}>
        <div className="mb-6">
          <BackButton href="/" variant="light" />
        </div>
        <GuestQuestClient defaultSubjects={AP_CALC_SUBJECT_OPTIONS} diagnosticMode />
      </div>
    </TryQuestShell>
  );
}
