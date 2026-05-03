import {
  type GuestTryQuestion,
  GUEST_TRY_IMAGE_OPTIONS,
} from "@/lib/guest-try-types";

/** Strict captions aligned with `generateGuestTryQuestPack` so AI and fallback stay interchangeable. */
const IMAGE_SHAPE_CAPTIONS = [
  "Rounded square (blue)",
  "Circle (green)",
  "Triangle (orange)",
  "Star (purple)",
] as const;

/**
 * Honors-level mixed pack — no flashcards; several rounds require interpreting images (shapes + diagram).
 * Subject is shown only as a UI chip (no bracket tags in prompts).
 */
export function buildGuestMixedFallbackPack(_subjectRaw: string): GuestTryQuestion[] {
  return [
    {
      id: "fb-mcq-1",
      kind: "mcq",
      prompt:
        "Enzyme kinetics: noncompetitive inhibition is added to an enzyme at fixed substrate. Compared with the uninhibited reaction at the same substrate concentration, which pair is most characteristic?",
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
      prompt:
        "Statement: In textbook RSA, an attacker who sees only the public modulus N and public exponent e can recover the private exponent d in polynomial time in log N using generic grade-school arithmetic alone.",
      explanation:
        "RSA security rests on the hardness of factoring N (or related problems); knowing (N, e) alone does not grant a known polynomial-time classical break for well-sized keys.",
      options: ["True", "False"],
      correctIndex: 1,
    },
    {
      id: "fb-img-1",
      kind: "image_mcq",
      prompt:
        "Look at the four icons: which shape has a smooth closed boundary with no corners (no vertices)?",
      explanation: "A circle has no vertices; the square, triangle, and star each has corners or intersecting segments.",
      options: [...IMAGE_SHAPE_CAPTIONS],
      optionImageUrls: [...GUEST_TRY_IMAGE_OPTIONS],
      correctIndex: 1,
    },
    {
      id: "fb-short-1",
      kind: "short_answer",
      prompt: "Short answer (one expression): what is the derivative of x³ with respect to x?",
      explanation: "Power rule: derivative is 3x².",
      referenceAnswer: "3x² | 3x^2 | 3*x^2 | 3x**2 | 3 x^2 | 3 x² | 3 x squared",
    },
    {
      id: "fb-img-2",
      kind: "image_mcq",
      prompt:
        "Which icon is the only simple polygon here with exactly three straight edges and three vertices?",
      explanation: "Only the triangle fits; the star has many edges and intersections.",
      options: [...IMAGE_SHAPE_CAPTIONS],
      optionImageUrls: [...GUEST_TRY_IMAGE_OPTIONS],
      correctIndex: 2,
    },
    {
      id: "fb-mcq-2",
      kind: "mcq",
      prompt:
        "Probability: two fair dice are rolled. Conditioning on the sum being 8, what is the probability the larger showing face is 5?",
      explanation:
        "Sum 8 outcomes are (2,6),(3,5),(4,4),(5,3),(6,2); five equally likely pairs under standard dice. Larger face is 5 only for (3,5) and (5,3): 2/5.",
      options: ["1/5", "2/5", "1/2", "3/8"],
      correctIndex: 1,
    },
    {
      id: "fb-mcq-diagram",
      kind: "mcq",
      prompt:
        "Study the diagram: moving left to right along the bottom axis, the blue curve always rises (height increases). Which choice best describes that behavior on the window shown?",
      explanation: "The plotted curve is monotone increasing across the visible domain.",
      promptImageUrl: "/guest-quest/diagram-grid.svg",
      options: [
        "The curve is strictly increasing on the visible window",
        "The curve is strictly decreasing on the visible window",
        "The curve stays flat",
        "The curve repeatedly rises and falls",
      ],
      correctIndex: 0,
    },
    {
      id: "fb-img-3",
      kind: "image_mcq",
      prompt:
        "Which icon shows a star-like silhouette with several sharp outer points radiating from the center?",
      explanation: "The purple star icon matches that description; the other shapes do not.",
      options: [...IMAGE_SHAPE_CAPTIONS],
      optionImageUrls: [...GUEST_TRY_IMAGE_OPTIONS],
      correctIndex: 3,
    },
  ];
}
