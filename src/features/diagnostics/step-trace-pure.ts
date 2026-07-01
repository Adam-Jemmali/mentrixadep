import {
  buildStepTraceCompletion,
  misconceptionTagForPick,
  type StepTraceCompletion,
  type StepTraceProblem,
  type StepTraceStep,
  type StepTraceStepResult,
} from "@/features/diagnostics/step-trace-types";

export type StepTraceLiveStep = {
  picks: number[];
  misconception_tags: string[];
  wrongAttempts: number;
  revealed: boolean;
  awaitingContinue: boolean;
};

export type StepTraceSessionState = {
  currentStepIndex: number;
  stepResults: StepTraceStepResult[];
  liveSteps: StepTraceLiveStep[];
  complete: boolean;
  completion: StepTraceCompletion | null;
};

export function createStepTraceSession(problem: StepTraceProblem): StepTraceSessionState {
  return {
    currentStepIndex: 0,
    stepResults: [],
    liveSteps: problem.stepSequence.map(() => ({
      picks: [],
      misconception_tags: [],
      wrongAttempts: 0,
      revealed: false,
      awaitingContinue: false,
    })),
    complete: false,
    completion: null,
  };
}

function finishStepResult(
  step: StepTraceStep,
  live: StepTraceLiveStep,
  resolved_correctly: boolean,
  required_reveal: boolean,
): StepTraceStepResult {
  return {
    step_number: step.step_number,
    picks: [...live.picks],
    misconception_tags: [...live.misconception_tags],
    resolved_correctly,
    required_reveal,
  };
}

export type StepTracePickOutcome =
  | { kind: "correct_advance"; next: StepTraceSessionState }
  | { kind: "wrong_retry"; next: StepTraceSessionState }
  | { kind: "wrong_reveal"; next: StepTraceSessionState }
  | { kind: "continue_advance"; next: StepTraceSessionState }
  | { kind: "complete"; next: StepTraceSessionState };

function advanceAfterStep(
  problem: StepTraceProblem,
  state: StepTraceSessionState,
  stepResult: StepTraceStepResult,
): StepTracePickOutcome {
  const nextResults = [...state.stepResults, stepResult];
  const nextIndex = state.currentStepIndex + 1;
  if (nextIndex >= problem.stepSequence.length) {
    const completion = buildStepTraceCompletion(problem, nextResults);
    return {
      kind: "complete",
      next: {
        ...state,
        stepResults: nextResults,
        currentStepIndex: nextIndex,
        complete: true,
        completion,
      },
    };
  }
  return {
    kind: "correct_advance",
    next: {
      ...state,
      stepResults: nextResults,
      currentStepIndex: nextIndex,
    },
  };
}

/** Apply one option pick on the active step. */
export function applyStepTracePick(
  problem: StepTraceProblem,
  state: StepTraceSessionState,
  optionIndex: number,
): StepTracePickOutcome | null {
  if (state.complete) return null;
  const step = problem.stepSequence[state.currentStepIndex];
  const live = state.liveSteps[state.currentStepIndex];
  if (!step || !live || live.awaitingContinue || live.revealed) return null;
  if (optionIndex < 0 || optionIndex >= step.options.length) return null;

  const nextLive = [...state.liveSteps];
  const stepLive: StepTraceLiveStep = {
    ...live,
    picks: [...live.picks, optionIndex],
  };
  const isCorrect = optionIndex === step.correct_option_index;

  if (isCorrect) {
    stepLive.wrongAttempts = live.wrongAttempts;
    nextLive[state.currentStepIndex] = stepLive;
    const stepResult = finishStepResult(
      step,
      stepLive,
      live.wrongAttempts === 0,
      false,
    );
    return advanceAfterStep(problem, { ...state, liveSteps: nextLive }, stepResult);
  }

  const tag = misconceptionTagForPick(step, optionIndex);
  if (tag && !stepLive.misconception_tags.includes(tag)) {
    stepLive.misconception_tags.push(tag);
  }

  if (live.wrongAttempts === 0) {
    stepLive.wrongAttempts = 1;
    nextLive[state.currentStepIndex] = stepLive;
    return {
      kind: "wrong_retry",
      next: { ...state, liveSteps: nextLive },
    };
  }

  stepLive.wrongAttempts = live.wrongAttempts + 1;
  stepLive.revealed = true;
  stepLive.awaitingContinue = true;
  nextLive[state.currentStepIndex] = stepLive;
  const stepResult = finishStepResult(step, stepLive, false, true);
  return {
    kind: "wrong_reveal",
    next: {
      ...state,
      liveSteps: nextLive,
      stepResults: [...state.stepResults, stepResult],
    },
  };
}

/** Advance after the user acknowledges the revealed correct move. */
export function continueAfterStepReveal(
  problem: StepTraceProblem,
  state: StepTraceSessionState,
): StepTracePickOutcome | null {
  if (state.complete) return null;
  const live = state.liveSteps[state.currentStepIndex];
  if (!live?.awaitingContinue) return null;

  const stepResult = state.stepResults[state.stepResults.length - 1];
  if (!stepResult || !stepResult.required_reveal) return null;

  const nextLive = [...state.liveSteps];
  nextLive[state.currentStepIndex] = {
    ...live,
    awaitingContinue: false,
  };

  const nextIndex = state.currentStepIndex + 1;
  if (nextIndex >= problem.stepSequence.length) {
    const completion = buildStepTraceCompletion(problem, state.stepResults);
    return {
      kind: "complete",
      next: {
        ...state,
        liveSteps: nextLive,
        currentStepIndex: nextIndex,
        complete: true,
        completion,
      },
    };
  }

  return {
    kind: "continue_advance",
    next: {
      ...state,
      liveSteps: nextLive,
      currentStepIndex: nextIndex,
    },
  };
}
