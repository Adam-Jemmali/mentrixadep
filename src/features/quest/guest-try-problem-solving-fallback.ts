import type { GuestTryQuestion } from "@/features/quest/guest-try-types";

function guestTryCapstoneProblem(subject: string): GuestTryQuestion {
  return {
    id: `ps-cap-${subject.slice(0, 16).replace(/\W+/g, "-")}`,
    kind: "problem_solving",
    prompt: `${subject} capstone: Apply the field's core method to a constrained scenario. State assumptions, show intermediate steps, and give a justified final answer.`,
    explanation: "Strong responses include explicit assumptions, a visible reasoning chain, and a defensible conclusion.",
    referenceAnswer: "assumptions stated | step-by-step reasoning | justified final answer",
  };
}

function withCapstone(subject: string, items: GuestTryQuestion[]): GuestTryQuestion[] {
  return items.length >= 3 ? items : [...items, guestTryCapstoneProblem(subject)];
}

/** Hard multi-step items injected when AI/fallback packs lack written problem-solving depth. */
export function buildGuestProblemSolvingSupplement(subjectRaw: string): GuestTryQuestion[] {
  const subject = subjectRaw.trim() || "General STEM";
  const s = subject.toLowerCase();

  if (s.includes("biology")) {
    return withCapstone(subject, [
      {
        id: "bio-ps-1",
        kind: "problem_solving",
        prompt:
          "A bacterial culture starts with 500 cells and doubles every 4 hours. How many cells are present after 12 hours? Show the doubling steps in your answer.",
        explanation: "Three doubling periods: 500 → 1000 → 2000 → 4000 cells.",
        referenceAnswer: "4000 | 500 * 2^3 | 500 × 8",
      },
      {
        id: "bio-ps-2",
        kind: "problem_solving",
        prompt:
          "In a dihybrid cross AaBb × AaBb, what fraction of offspring show both dominant traits (A_ and B_)? State the probability as a simplified fraction.",
        explanation: "Independent assortment: P(A_) = 3/4 and P(B_) = 3/4, so (3/4)(3/4) = 9/16.",
        referenceAnswer: "9/16 | 0.5625",
      },
    ]);
  }

  if (s.includes("math") || s.includes("algebra") || s.includes("calculus")) {
    return withCapstone(subject, [
      {
        id: "math-ps-1",
        kind: "problem_solving",
        prompt:
          "Find the area under \\(y = 2x\\) from \\(x = 0\\) to \\(x = 4\\). Give the numeric area.",
        explanation: "∫₀⁴ 2x dx = [x²]₀⁴ = 16.",
        referenceAnswer: "16 | 16 square units",
      },
      {
        id: "math-ps-2",
        kind: "problem_solving",
        prompt:
          "Solve \\(2x^2 - 5x - 3 = 0\\). List both real roots.",
        explanation: "Factor or quadratic formula: (2x+1)(x-3)=0 → x = -1/2 or x = 3.",
        referenceAnswer: "-1/2 and 3 | -0.5 and 3 | x = -1/2, x = 3",
      },
    ]);
  }

  if (s.includes("physics")) {
    return withCapstone(subject, [
      {
        id: "phys-ps-1",
        kind: "problem_solving",
        prompt:
          "A 3 kg block accelerates at 4 m/s² on a frictionless surface. What net force (in N) acts on the block?",
        explanation: "Newton's second law: F = ma = 3 × 4 = 12 N.",
        referenceAnswer: "12 | 12 N | 12 newtons",
      },
      {
        id: "phys-ps-2",
        kind: "problem_solving",
        prompt:
          "A ball is dropped from rest and falls 20 m (ignore air resistance, g ≈ 10 m/s²). How long (in seconds) does it take to hit the ground?",
        explanation: "Use d = ½gt² → 20 = 5t² → t² = 4 → t = 2 s.",
        referenceAnswer: "2 | 2 s | 2 seconds",
      },
    ]);
  }

  if (s.includes("chemistry") || s.includes("chem")) {
    return withCapstone(subject, [
      {
        id: "chem-ps-1",
        kind: "problem_solving",
        prompt:
          "How many moles are in 36 g of water (H₂O)? Use M ≈ 18 g/mol and show your setup.",
        explanation: "n = mass/M = 36/18 = 2 mol.",
        referenceAnswer: "2 | 2 mol | 2 moles",
      },
      {
        id: "chem-ps-2",
        kind: "problem_solving",
        prompt:
          "Balance this reaction and give the coefficient in front of O₂: C₃H₈ + O₂ → CO₂ + H₂O.",
        explanation: "Balanced: C₃H₈ + 5O₂ → 3CO₂ + 4H₂O, so O₂ coefficient is 5.",
        referenceAnswer: "5 | coefficient 5",
      },
    ]);
  }

  if (s.includes("economics")) {
    return withCapstone(subject, [
      {
        id: "econ-ps-1",
        kind: "problem_solving",
        prompt:
          "Price rises from $10 to $12 and quantity demanded falls from 200 to 160. Compute the price elasticity of demand (use midpoint formula) and state whether demand is elastic or inelastic.",
        explanation: "Midpoint %ΔQ ≈ -20%, %ΔP ≈ 18.2%, |Ed| ≈ 1.1 → elastic.",
        referenceAnswer: "elastic | |Ed| > 1 | approximately 1.1 elastic",
      },
      {
        id: "econ-ps-2",
        kind: "problem_solving",
        prompt:
          "Fixed cost is $400, price is $20, and variable cost per unit is $12. How many units must be sold to break even?",
        explanation: "Break-even Q = FC/(P-AVC) = 400/8 = 50 units.",
        referenceAnswer: "50 | 50 units",
      },
    ]);
  }

  if (s.includes("history")) {
    return withCapstone(subject, [
      {
        id: "hist-ps-1",
        kind: "problem_solving",
        prompt:
          "A treaty signed in 1919 imposed reparations and territorial losses on one European power. Name that power and one major constraint the treaty placed on its military.",
        explanation: "Germany faced reparations and army limits under the Treaty of Versailles.",
        referenceAnswer:
          "Germany and army size limit | Germany reparations | Treaty of Versailles Germany military restrictions",
      },
      {
        id: "hist-ps-2",
        kind: "problem_solving",
        prompt:
          "Explain one cause AND one consequence of the Columbian Exchange for the Americas in 2–4 sentences.",
        explanation:
          "Accept answers linking Old World diseases/crops/livestock to demographic and agricultural change in the Americas.",
        referenceAnswer:
          "disease depopulation | new crops livestock | smallpox mortality | horses changed Plains societies",
      },
    ]);
  }

  return withCapstone(subject, [
    {
      id: "gen-ps-1",
      kind: "problem_solving",
      prompt: `${subject} problem: A model gives output Y = 3X + 7. If X increases from 2 to 9, what is the change in Y? Show the before/after values.`,
      explanation: "At X=2, Y=13; at X=9, Y=34; change = 21.",
      referenceAnswer: "21 | Y changes by 21 | 34 - 13 = 21",
    },
    {
      id: "gen-ps-2",
      kind: "problem_solving",
      prompt: `${subject} problem: You must verify a claim using two independent checks. Describe both checks you would run before accepting the claim as valid.`,
      explanation: "Strong answers name two distinct validation steps tied to the subject's methods.",
      referenceAnswer:
        "cross-check sources | replicate calculation | compare against baseline model | sanity check units",
    },
  ]);
}
