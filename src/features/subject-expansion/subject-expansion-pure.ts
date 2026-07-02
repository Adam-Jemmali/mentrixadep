export type SubjectMomentumGate = {
  subject: string;
  momentumEligible: boolean;
  minVerifiedFirstAttempts: number;
  minReviewedItems: number;
  eligibleAt: string | null;
};

export type SubjectExpansionBarInput = {
  subject: string;
  verifiedFirstAttempts: number;
  reviewedItems: number;
  gate: Pick<
    SubjectMomentumGate,
    "minVerifiedFirstAttempts" | "minReviewedItems" | "momentumEligible"
  >;
};

export function subjectPassesMomentumBar(input: SubjectExpansionBarInput): boolean {
  if (input.gate.momentumEligible) return true;
  return (
    input.verifiedFirstAttempts >= input.gate.minVerifiedFirstAttempts &&
    input.reviewedItems >= input.gate.minReviewedItems
  );
}

export function buildSubjectExpansionVerdict(input: {
  subject: string;
  eligible: boolean;
  verifiedFirstAttempts: number;
  minVerifiedFirstAttempts: number;
}): { verdict: string; nextAction: string } {
  if (input.eligible) {
    return {
      verdict: `${input.subject} is on the Momentum stack. Your rank and grid stay free; trajectory custody is per subject.`,
      nextAction: "Practice this subject from Quest or Mastery Grid to keep verified movement on record.",
    };
  }

  const remaining = Math.max(0, input.minVerifiedFirstAttempts - input.verifiedFirstAttempts);
  return {
    verdict: `${input.subject} is not on the Momentum stack yet. The bar is ${input.minVerifiedFirstAttempts.toLocaleString()} verified first attempts across the cohort.`,
    nextAction:
      remaining > 0
        ? `${remaining.toLocaleString()} more verified first attempts are needed before this subject clears the bar.`
        : "This subject clears the bar when the reviewed item bank and cohort volume are both sufficient.",
  };
}
