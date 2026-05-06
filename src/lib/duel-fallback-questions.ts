import type { SkillDuelQuestion } from "@/lib/database.types";
import { DUEL_QUESTION_COUNT } from "@/lib/duel-constants";
import { inferStemBucket, type StemBucket } from "@/lib/stem-bucket";

/**
 * Offline duel items when Gemini is unavailable (circuit open, timeout, parse errors).
 * Banks are split by coarse discipline so a calculus duel never serves biology stems.
 */
export function buildSkillDuelFallbackPack(
  divisionName: string,
  divisionKey: string,
  count: number = DUEL_QUESTION_COUNT
): SkillDuelQuestion[] {
  const d = divisionName.replace(/\s+Division$/i, "").trim() || divisionKey.trim() || "this subject";
  const n = Math.max(3, Math.min(10, Math.floor(count)));
  const bucket = inferStemBucket(`${divisionName} ${divisionKey}`);

  const banks: Record<StemBucket, SkillDuelQuestion[]> = {
    mathematics: [
      {
        type: "mcq",
        prompt: `[${d}] A graph shows a U-shaped curve opening upward with its lowest point at (2, -3). Which statement about that vertex is correct?`,
        choices: [
          "It is a minimum of the function shown",
          "It is a maximum of the function shown",
          "The curve has no extrema there",
          "The vertex always lies on the y-axis",
        ],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] A right triangle has legs of length 3 and 4. What is the hypotenuse length?`,
        choices: ["5", "7", "12", "25"],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] If f(x) = 2x + 1, then f(3) = 7. True or false?`,
        choices: ["True", "False"],
        correctIndex: 1,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Which expression is equivalent to (x^3)(x^2)?`,
        choices: ["x^5", "x^6", "x", "2x^5"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] What is the slope of the line through (0, 1) and (2, 5)?`,
        choices: ["2", "1", "3", "4"],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] The square root of 36 is 7. True or false?`,
        choices: ["True", "False"],
        correctIndex: 1,
      },
      {
        type: "flashcard",
        prompt: `[${d}] What is the derivative of x^2 with respect to x (informal power rule)?`,
        choices: ["2x", "x", "x^2", "2"],
        correctIndex: 0,
      },
    ],
    economics: [
      {
        type: "mcq",
        prompt: `[${d}] Two demand curves are drawn with D2 to the right of D1 while supply S is unchanged. If only demand shifts right, what happens to equilibrium price?`,
        choices: ["Price rises", "Price falls", "Price is unchanged", "Supply shifts left"],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] At a binding price ceiling below equilibrium, quantity demanded typically exceeds quantity supplied. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] A supply–demand diagram shows equilibrium at E0 with a price floor set above E0. What usually occurs at a binding price floor?`,
        choices: [
          "Quantity supplied exceeds quantity demanded (surplus)",
          "Quantity demanded exceeds quantity supplied (shortage)",
          "The market clears with no excess quantity",
          "The floor never affects quantity traded",
        ],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] When marginal cost equals marginal revenue for a profit-maximizing firm, what condition holds (standard narrative)?`,
        choices: [
          "Output is often where incremental profit turns zero",
          "Average cost is always minimized",
          "Demand is perfectly inelastic",
          "Fixed costs are zero",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] If a consumer's income falls and relative prices are unchanged, the budget line typically shifts inward parallel to the original. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] If consumer income rises and good X is a normal good, which curve shifts for demand for X (holding other factors)?`,
        choices: ["Demand shifts right", "Supply shifts right", "Demand shifts left", "Only movement along demand"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] If total revenue rises when price rises along the demand curve, demand is likely:`,
        choices: ["Inelastic", "Elastic", "Perfectly elastic", "Unit elastic always"],
        correctIndex: 0,
      },
    ],
    biology: [
      {
        type: "flashcard",
        prompt: `[${d}] Which organelles are most associated with ATP production in typical eukaryotic cells?`,
        choices: ["Mitochondria", "Ribosomes", "Golgi apparatus", "Centrioles"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Which base pairing follows Watson–Crick rules in DNA?`,
        choices: [
          "Adenine pairs with thymine",
          "Adenine pairs with cytosine",
          "Guanine pairs with thymine",
          "Uracil pairs with thymine in DNA",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Prokaryotic cells lack a membrane-bound nucleus. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Which process converts mRNA into a polypeptide chain?`,
        choices: ["Translation", "Transcription", "Replication only", "Binary fission only"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Diffusion moves particles:`,
        choices: [
          "From higher concentration toward lower concentration",
          "From lower toward higher without energy",
          "Only across membranes that lack proteins",
          "Only when ATP is hydrolyzed",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Mitosis produces four genetically distinct haploid daughter cells in humans. True or false?`,
        choices: ["True", "False"],
        correctIndex: 1,
      },
      {
        type: "mcq",
        prompt: `[${d}] Which molecule carries genetic instructions for protein synthesis from nucleus to ribosomes?`,
        choices: ["mRNA", "tRNA only", "ATP only", "Cholesterol"],
        correctIndex: 0,
      },
    ],
    chemistry: [
      {
        type: "flashcard",
        prompt: `[${d}] On a reaction coordinate diagram, what names the high-energy peak between reactants and products?`,
        choices: [
          "Transition state (activated complex)",
          "Terminal catalyst product",
          "Melting plateau only",
          "Equivalence endpoint only",
        ],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Which bond type involves sharing electron pairs between atoms?`,
        choices: ["Covalent", "Ionic only", "Metallic only", "Hydrogen only"],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Increasing temperature typically increases the rate of many chemical reactions. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] What does pH measure?`,
        choices: [
          "Hydrogen ion concentration (acidity)",
          "Electron mass",
          "Boiling point alone",
          "Molar mass directly",
        ],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] In a redox reaction, the species that loses electrons is:`,
        choices: ["Oxidized", "Reduced", "The cathode always", "Always the solvent"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Avogadro's number relates moles to:`,
        choices: ["Counts of particles", "Kelvin temperature", "Liters of gas only always", "Electron volts"],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Catalysts are consumed completely by the overall balanced reaction. True or false?`,
        choices: ["True", "False"],
        correctIndex: 1,
      },
    ],
    physics: [
      {
        type: "mcq",
        prompt: `[${d}] A position–time graph has a segment with the steepest positive slope compared with a gentler positive segment. During the steeper segment, which quantity is typically largest?`,
        choices: [
          "Average velocity over that interval",
          "Displacement must be zero there",
          "The object must be at rest",
          "Time runs backward on that segment",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] In a simple series circuit with one battery and ideal wires, the current is the same everywhere in the loop. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Newton's second law states F = ma relates net force to:`,
        choices: ["Mass times acceleration", "Momentum only", "Kinetic energy only", "Power divided by distance"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Which quantity has SI units of joules?`,
        choices: ["Energy", "Force", "Power", "Electric charge"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] For uniform circular motion at constant speed, acceleration points:`,
        choices: ["Toward the center", "Tangent forward always", "Opposite velocity always zero", "Along velocity"],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Mechanical waves require a medium to propagate; electromagnetic waves in vacuum do not require matter. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Ideal gas law relates pressure, volume, moles, and:`,
        choices: ["Temperature", "Density only", "Charge only", "Frequency only"],
        correctIndex: 0,
      },
    ],
    history: [
      {
        type: "mcq",
        prompt: `[${d}] Primary sources typically include:`,
        choices: [
          "Letters or artifacts from the period studied",
          "Only modern textbooks",
          "Only encyclopedia summaries",
          "Hypothetical scenarios",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Cause-and-effect claims in history should be supported by evidence from sources. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Chronology in historical argument matters because:`,
        choices: [
          "Sequence affects causal interpretation",
          "Dates never matter",
          "Only geography matters",
          "Sources are unnecessary",
        ],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Bias in a historical document refers to:`,
        choices: [
          "Tilts from viewpoint or purpose",
          "Objective neutrality always",
          "Random spelling errors only",
          "Publication date alone",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Historians may revise interpretations when new credible evidence appears. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Corroboration between independent sources tends to:`,
        choices: [
          "Strengthen confidence in a claim",
          "Always disprove claims",
          "Replace reading entirely",
          "Eliminate need for context",
        ],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Historical significance differs from mere chronological listing because it emphasizes:`,
        choices: [
          "Impact and consequence analysis",
          "Alphabetical ordering only",
          "Ignoring evidence",
          "Avoiding dates entirely",
        ],
        correctIndex: 0,
      },
    ],
    computer_science: [
      {
        type: "mcq",
        prompt: `[${d}] What does binary search require of its underlying array (classic textbook assumption)?`,
        choices: ["Sorted order", "Unsorted only", "Infinite length", "Duplicate keys forbidden always"],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] A stack is typically described as LIFO (last in, first out). True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Big-O describes:`,
        choices: [
          "Growth rate of resource use vs input size",
          "Exact runtime in milliseconds always",
          "CPU brand preference",
          "Screen resolution",
        ],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Which structure pairs keys to values with average O(1) expected lookup in typical hash tables?`,
        choices: ["Hash map / hash table", "Sorted linked list only", "Queue only", "Binary heap only"],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Recursion needs:`,
        choices: [
          "A base case to terminate",
          "No functions",
          "Infinite loops only",
          "Only parallel hardware",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Graph edges can be directed or undirected depending on the model. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Logical AND of true and false evaluates to:`,
        choices: ["False", "True", "Undefined always", "Both"],
        correctIndex: 0,
      },
    ],
    general: [
      {
        type: "mcq",
        prompt: `[${d}] Before applying a formula in this subject, what is the best first step?`,
        choices: [
          "Identify knowns and the unknown you need",
          "Skip defining variables",
          "Guess randomly among choices",
          "Ignore units entirely",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] Checking boundary cases often distinguishes nearly correct answers from distractors. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] After solving a multi-step problem, what should you verify first?`,
        choices: [
          "Answers satisfy stated constraints",
          "Rewrite the prompt only",
          "Erase intermediate steps always",
          "Assume first guess is final",
        ],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] Two answer choices look similar—what is the strongest discriminator?`,
        choices: [
          "Compare assumptions each requires",
          "Pick the longest option",
          "Pick alphabetically first",
          "Ignore definitions",
        ],
        correctIndex: 0,
      },
      {
        type: "mcq",
        prompt: `[${d}] What does a concise final answer line usually include in quantitative work?`,
        choices: [
          "The result with correct units/context",
          "Only intermediate scratchwork",
          "A question back to the reader",
          "No labels",
        ],
        correctIndex: 0,
      },
      {
        type: "tf",
        prompt: `[${d}] If your solution contradicts given conditions, revise assumptions before forcing an answer. True or false?`,
        choices: ["True", "False"],
        correctIndex: 0,
      },
      {
        type: "flashcard",
        prompt: `[${d}] Distractors often succeed because they encode:`,
        choices: [
          "Common partial misconceptions",
          "Always random letters",
          "Identical meanings always",
          "Empty strings",
        ],
        correctIndex: 0,
      },
    ],
  };

  const bank = banks[bucket] ?? banks.general;
  const out: SkillDuelQuestion[] = [];
  if (bank.length === 0) return out;
  for (let i = 0; i < n; i++) {
    const q = bank[i % bank.length]!;
    out.push({ ...q });
  }
  return out;
}
