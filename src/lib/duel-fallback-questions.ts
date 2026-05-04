import type { SkillDuelQuestion } from "@/lib/database.types";
import { DUEL_QUESTION_COUNT } from "@/lib/duel-constants";

/**
 * Offline duel items when Gemini is unavailable (circuit open, timeout, parse errors).
 * Same shape as AI output: scenario-style stems + MCQ / TF / flashcard mix.
 */
export function buildSkillDuelFallbackPack(
  divisionName: string,
  divisionKey: string,
  count: number = DUEL_QUESTION_COUNT
): SkillDuelQuestion[] {
  const d = divisionName.replace(/\s+Division$/i, "").trim() || divisionKey.trim() || "this subject";
  const n = Math.max(3, Math.min(10, Math.floor(count)));

  const bank: SkillDuelQuestion[] = [
    {
      type: "mcq",
      prompt: `Scenario sketch — Axes labeled x and y. A smooth U-shaped curve opens upward with its lowest point at (2, -3) and crosses the x-axis on both sides of that vertex. In ${d}, which statement is correct about that vertex?`,
      choices: [
        "It is a minimum of the function shown",
        "It is a maximum of the function shown",
        "The curve has no extrema there",
        "The vertex always lies on the y-axis",
      ],
      correctIndex: 0,
    },
    {
      type: "tf",
      prompt: `Diagram described — Two parallel demand curves labeled D1 and D2, with D2 farther right than D1, same supply curve S crossing both. In ${d}, if only demand shifts right while supply is unchanged, equilibrium price rises. True or false?`,
      choices: ["True", "False"],
      correctIndex: 0,
    },
    {
      type: "flashcard",
      prompt: `Scenario sketch — A circular cell cross-section with a thick outer boundary, a large central region, and many small green ovals scattered in the periphery. In ${d}, which term best labels the energy-producing organelles suggested by those small ovals?`,
      choices: ["Mitochondria", "Ribosomes", "Golgi apparatus", "Centrioles"],
      correctIndex: 0,
    },
    {
      type: "mcq",
      prompt: `Diagram described — A position–time graph is piecewise linear: flat, then a straight segment with positive slope, then steeper positive slope. In ${d}, during the steepest segment, which quantity is largest compared with the gentler positive segment?`,
      choices: [
        "Average velocity over that interval",
        "Displacement is always zero there",
        "The object must be at rest",
        "Time is decreasing on that segment",
      ],
      correctIndex: 0,
    },
    {
      type: "mcq",
      prompt: `Scenario sketch — A supply–demand diagram: upward-sloping S, downward-sloping D, initial crossing at E0. A vertical line labeled “price floor” sits above E0 and intersects S above D. In ${d}, what typically happens at a binding price floor?`,
      choices: [
        "Quantity supplied exceeds quantity demanded (surplus)",
        "Quantity demanded exceeds quantity supplied (shortage)",
        "Markets clear with no excess quantity",
        "The floor has no effect if it is above equilibrium",
      ],
      correctIndex: 0,
    },
    {
      type: "tf",
      prompt: `Scenario sketch — A simple series circuit: single battery, one resistor, one ideal ammeter wired in series. In ${d}, the ammeter reading is the same at every point in that single series loop. True or false?`,
      choices: ["True", "False"],
      correctIndex: 0,
    },
    {
      type: "flashcard",
      prompt: `Diagram described — A reaction coordinate diagram: reactants lower than products, with a tall hump between them labeled “transition state.” In ${d}, which term names the hump’s peak region?`,
      choices: [
        "Transition state (activated complex)",
        "Catalyst endpoint",
        "Melting plateau",
        "Equivalence point only",
      ],
      correctIndex: 0,
    },
    {
      type: "mcq",
      prompt: `Scenario sketch — A right triangle drawn on a grid with legs 3 units and 4 units along the axes, hypotenuse connecting their tips. In ${d}, what is the hypotenuse length?`,
      choices: ["5", "7", "12", "25"],
      correctIndex: 0,
    },
    {
      type: "mcq",
      prompt: `Scenario sketch — A DNA double helix cartoon with two antiparallel strands and rungs as paired bases. In ${d}, which pairing obeys standard Watson–Crick rules?`,
      choices: [
        "Adenine pairs with thymine (in DNA)",
        "Adenine pairs with cytosine",
        "Guanine pairs with thymine",
        "Uracil pairs with thymine in DNA",
      ],
      correctIndex: 0,
    },
    {
      type: "tf",
      prompt: `Diagram described — A budget line between “food” and “other goods” pivots inward from the food axis intercept while the other intercept is fixed. In ${d}, that pivot usually represents a decrease in income with unchanged prices. True or false?`,
      choices: ["True", "False"],
      correctIndex: 1,
    },
  ];

  return bank.slice(0, n);
}
