export interface PreSessionBrief {
  likelyCoverage: string[];
  weakSpotsToWatch: string[];
  warmUpExercise: {
    title: string;
    prompt: string;
    hint?: string;
  };
  questionsToAsk: string[];
}
