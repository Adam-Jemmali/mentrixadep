import {
  type GuestTryQuestion,
  GUEST_TRY_IMAGE_OPTIONS,
} from "@/lib/guest-try-types";

function isGeneralMixedLocal(subjectRaw: string): boolean {
  const s = subjectRaw
    .trim()
    .toLowerCase()
    .replace(/\s+division$/i, "")
    .trim();
  if (!s) return true;
  return s === "general" || s === "mixed";
}

const TAG = (s: string) => (subject: string) =>
  isGeneralMixedLocal(subject) ? `[Mixed] ${s}` : `[${subject.slice(0, 40)}] ${s}`;

/** Strict captions aligned with `generateGuestTryQuestPack` so AI and fallback stay interchangeable. */
const IMAGE_SHAPE_CAPTIONS = [
  "Rounded square (blue)",
  "Circle (green)",
  "Triangle (orange)",
  "Star (purple)",
] as const;

/** Honors / early undergrad traps — mixed modalities; same-origin images only. */
export function buildGuestMixedFallbackPack(subjectRaw: string): GuestTryQuestion[] {
  const subject = subjectRaw.trim() || "General";
  const t = TAG(subject);

  const q: GuestTryQuestion[] = [
    {
      id: "fb-mcq-1",
      kind: "mcq",
      prompt: `${t(
        "Enzyme kinetics: noncompetitive inhibition is added to an enzyme at fixed substrate. Compared with the uninhibited reaction at the same substrate concentration, which pair is most characteristic?",
      )}`,
      explanation:
        "Noncompetitive inhibitors bind elsewhere than the active site and typically lower Vmax (fewer functional enzyme complexes reach turnover), often without changing Km.",
      options: [
        "Vmax unchanged; Km increases sharply",
        "Vmax decreases; Km often roughly unchanged",
        "Both Vmax and Km increase together",
        "Km decreases while Vmax is unchanged",
      ],
      correctIndex: 1,
    },
    {
      id: "fb-tf-1",
      kind: "true_false",
      prompt: `${t(
        "Statement: In textbook RSA, an attacker who sees only the public modulus N and public exponent e can recover the private exponent d in polynomial time in log N using generic grade-school arithmetic alone.",
      )}`,
      explanation:
        "RSA security rests on the hardness of factoring N (or related problems); knowing (N, e) alone does not grant a known polynomial-time classical break for well-sized keys.",
      options: ["True", "False"],
      correctIndex: 1,
    },
    {
      id: "fb-flash-1",
      kind: "flashcard",
      prompt: `${t("FLASHCARD — Term: homomorphism (algebra)\nPick the best gloss.")}`,
      explanation:
        "A homomorphism preserves the relevant operations (e.g., f(ab) = f(a)f(a) in groups), structure maps rather than arbitrary functions.",
      options: [
        "Any bijection between two sets",
        "A structure-preserving map that respects the operations",
        "A matrix that is always orthogonal",
        "An algorithm that sorts in O(n log n) time only",
      ],
      correctIndex: 1,
    },
    {
      id: "fb-short-1",
      kind: "short_answer",
      prompt: `${t("Short answer (one expression): d/dx of x³.")}`,
      explanation: "Power rule: derivative is 3x².",
      referenceAnswer: "3x²; 3x^2; 3 x squared",
    },
    {
      id: "fb-img-1",
      kind: "image_mcq",
      prompt: `${t(
        "Visual pick: which icon is the only simple polygon here with exactly three straight edges meeting at three vertices?",
      )}`,
      explanation: "Only the triangle has three edges and three vertices; the star has more edges and intersecting segments.",
      options: [...IMAGE_SHAPE_CAPTIONS],
      optionImageUrls: [...GUEST_TRY_IMAGE_OPTIONS],
      correctIndex: 2,
    },
    {
      id: "fb-mcq-2",
      kind: "mcq",
      prompt: `${t(
        "Probability: two fair dice are rolled. Conditioning on the sum being 8, what is the probability the larger showing face is 5?",
      )}`,
      explanation:
        "Sum 8 outcomes are (2,6),(3,5),(4,4),(5,3),(6,2); five equally likely pairs under standard dice. Larger face is 5 only for (3,5) and (5,3): 2/5.",
      options: ["1/5", "2/5", "1/2", "3/8"],
      correctIndex: 1,
      promptImageUrl: "/guest-quest/diagram-grid.svg",
    },
    {
      id: "fb-tf-2",
      kind: "true_false",
      prompt: `${t(
        "Statement: Every invertible square matrix over the reals is diagonalizable.",
      )}`,
      explanation:
        "Invertible only guarantees nonsingular; defective matrices (e.g., a nontrivial Jordan block) can be invertible yet not diagonalizable.",
      options: ["True", "False"],
      correctIndex: 1,
    },
    {
      id: "fb-short-2",
      kind: "short_answer",
      prompt: `${t(
        "Short answer: worst-case time complexity class for comparison-based sorting of n items (standard big-O family).",
      )}`,
      explanation:
        "Comparison sorts need Ω(n log n) comparisons in the worst case; mergesort/heapsort achieve Θ(n log n).",
      referenceAnswer: "O(n log n) | n log n | theta(n log n) | Θ(n log n)",
    },
  ];

  return q;
}
