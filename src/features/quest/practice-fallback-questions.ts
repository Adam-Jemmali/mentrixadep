import type { PracticePackType, PracticeQuestion } from "@/features/quest/practice-quest-types";
import { inferStemBucket, type StemBucket } from "@/features/learning-path/stem-bucket";

function cycleBank(bank: PracticeQuestion[], n: number, prefixSubject: string): PracticeQuestion[] {
  const out: PracticeQuestion[] = [];
  if (bank.length === 0) return out;
  for (let i = 0; i < n; i++) {
    const base = bank[i % bank.length]!;
    let prompt = base.prompt.trimStart();
    if (!prompt.startsWith("[")) {
      prompt = `[${prefixSubject}] ${prompt}`;
    }
    out.push({ ...base, id: `q${i}`, prompt } as PracticeQuestion);
  }
  return out;
}

/** Offline practice packs — grouped by discipline (avoid econ graphs inside biology quests). */
export function buildPracticeFallbackQuestions(
  subject: string,
  packType: PracticePackType,
  count: number
): PracticeQuestion[] {
  const n = Math.min(10, Math.max(5, Math.floor(count)));
  const s = subject.trim() || "General";
  const bucket = inferStemBucket(s);

  const mcqByBucket: Record<StemBucket, PracticeQuestion[]> = {
    mathematics: [
      {
        id: "x",
        kind: "mcq",
        prompt: "Which expression simplifies (x^3)(x^2)?",
        options: ["x^5", "x^6", "x", "2x^5"],
        correctIndex: 0,
        explanation: "Add exponents when multiplying powers with the same base.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "What is the slope of the line through (0, 2) and (4, 10)?",
        options: ["2", "4", "8", "12"],
        correctIndex: 0,
        explanation: "Slope = (10 − 2) / (4 − 0) = 2.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Which derivative matches d/dx(x^2)?",
        options: ["2x", "x", "x^2", "2"],
        correctIndex: 0,
        explanation: "Power rule: exponent moves down as coefficient.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Solve for x: 2x − 6 = 0.",
        options: ["3", "−3", "6", "12"],
        correctIndex: 0,
        explanation: "2x = 6 ⇒ x = 3.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "What is √144?",
        options: ["12", "14", "10", "16"],
        correctIndex: 0,
        explanation: "12 × 12 = 144.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Which equation describes a circle centered at the origin with radius r?",
        options: ["x² + y² = r²", "y = mx + b", "x + y = r", "y = x² + r"],
        correctIndex: 0,
        explanation: "Standard circle centered at (0,0).",
      },
    ],
    economics: [
      {
        id: "x",
        kind: "mcq",
        prompt: "When demand shifts right while supply is unchanged, equilibrium price typically:",
        options: ["Rises", "Falls", "Never moves", "Only shifts supply"],
        correctIndex: 0,
        explanation: "Higher demand bids price up along an upward-sloping supply curve.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "A binding price ceiling below equilibrium tends to cause:",
        options: ["Shortage", "Surplus", "Perfect clearing always", "Higher supplier profits always"],
        correctIndex: 0,
        explanation: "Price held below equilibrium ⇒ quantity demanded exceeds quantity supplied.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Marginal cost intersecting marginal revenue often signals:",
        options: [
          "Profit-maximizing output for many firms",
          "Shutdown immediately always",
          "Perfect competition never applies",
          "Demand curve slope equals zero always",
        ],
        correctIndex: 0,
        explanation: "Standard MR = MC rule under classical assumptions.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "If income rises and good X is normal, demand for X:",
        options: ["Shifts right", "Shifts left always", "Never moves", "Only rotates supply"],
        correctIndex: 0,
        explanation: "Higher income raises quantity demanded at each price.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Elastic demand means:",
        options: [
          "Quantity is relatively responsive to price changes",
          "Quantity never responds",
          "Supply is vertical always",
          "Only luxury taxes matter",
        ],
        correctIndex: 0,
        explanation: "Elastic ⇒ percentage quantity change large vs price change.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Opportunity cost captures:",
        options: [
          "The next-best alternative forgone",
          "Only accounting expenses",
          "Sunk costs always",
          "Only monetary wages",
        ],
        correctIndex: 0,
        explanation: "Economics focuses on trade-offs vs alternatives.",
      },
    ],
    biology: [
      {
        id: "x",
        kind: "mcq",
        prompt: "Which organelle is most tied to aerobic ATP generation in many eukaryotes?",
        options: ["Mitochondrion", "Ribosome", "Chloroplast only (always)", "Centriole"],
        correctIndex: 0,
        explanation: "Mitochondria host oxidative phosphorylation.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "In DNA, adenine pairs with:",
        options: ["Thymine", "Cytosine", "Guanine directly always wrong here", "Uracil"],
        correctIndex: 0,
        explanation: "Watson–Crick pairing A–T (DNA).",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Translation synthesizes:",
        options: ["Proteins from mRNA", "DNA from RNA always", "Lipids only", "ATP only"],
        correctIndex: 0,
        explanation: "Ribosomes translate mRNA into polypeptide.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Diffusion moves molecules:",
        options: [
          "Down their concentration gradient passively",
          "Always against gradient without energy",
          "Only through active pumps always",
          "Only when DNA replicates",
        ],
        correctIndex: 0,
        explanation: "Simple diffusion is passive high→low concentration.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Prokaryotic cells typically:",
        options: [
          "Lack a membrane-bound nucleus",
          "Have multiple nuclei always",
          "Lack ribosomes",
          "Cannot have DNA",
        ],
        correctIndex: 0,
        explanation: "Nucleoid region vs membrane-bound nucleus.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Photosynthesis overall converts:",
        options: [
          "Light energy into chemical energy stored in sugars",
          "Sugars directly into heat only",
          "Oxygen into glucose alone",
          "Glucose into starch only in animals",
        ],
        correctIndex: 0,
        explanation: "Light drives fixation into organic molecules.",
      },
    ],
    chemistry: [
      {
        id: "x",
        kind: "mcq",
        prompt: "Shared electron pairs between nonmetals commonly indicate:",
        options: ["Covalent bonding", "Pure ionic lattice always here", "Metallic sea always", "Only hydrogen bonds"],
        correctIndex: 0,
        explanation: "Covalent bond sharing.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Higher temperature usually:",
        options: [
          "Increases molecular kinetic energy and collision frequency",
          "Eliminates activation energy always",
          "Prevents reactions always",
          "Freezes equilibrium constants always",
        ],
        correctIndex: 0,
        explanation: "Arrhenius-style intuition.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "On a reaction coordinate diagram, the peak between reactants and products is:",
        options: ["Transition state", "Final product always only", "Only solvent cage forever", "Only catalyst endpoint"],
        correctIndex: 0,
        explanation: "Activated complex region.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Avogadro’s number relates:",
        options: ["Moles to particle counts", "Energy to wavelength only", "Force to mass only", "Voltage to pressure"],
        correctIndex: 0,
        explanation: "NA bridges microscopic counts ↔ moles.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "A Bronsted–Lowry acid is best described as:",
        options: ["Proton donor", "Electron donor always here", "Neutron acceptor", "Only metal cation"],
        correctIndex: 0,
        explanation: "Acid/base proton transfer framing.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Oxidation involves:",
        options: [
          "Loss of electrons",
          "Gain of electrons always here",
          "No electron transfer",
          "Only proton gain always",
        ],
        correctIndex: 0,
        explanation: "LEO says GER — oxidation loses electrons.",
      },
    ],
    physics: [
      {
        id: "x",
        kind: "mcq",
        prompt: "Newton’s second law states:",
        options: ["F = ma", "F = mv always", "a = v² always", "F = m/a always"],
        correctIndex: 0,
        explanation: "Net force equals mass times acceleration.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "In uniform circular motion at constant speed, acceleration points:",
        options: ["Toward the center", "Tangent forward always", "Always zero", "Opposite velocity exactly"],
        correctIndex: 0,
        explanation: "Centripetal acceleration.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "The SI unit of power is:",
        options: ["Watt", "Joule only", "Newton only", "Pascal only"],
        correctIndex: 0,
        explanation: "Power is energy per time.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Elastic potential energy in an ideal spring scales with:",
        options: ["Displacement squared (½kx² form)", "Displacement only linear always here", "Mass cubed", "Charge only"],
        correctIndex: 0,
        explanation: "Hook’s law energy storage.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "In a simple series circuit, current:",
        options: [
          "Is the same everywhere in the loop",
          "Always divides randomly",
          "Zero at battery always",
          "Largest across open gap always",
        ],
        correctIndex: 0,
        explanation: "Series single-loop current continuity.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Electromagnetic waves in vacuum:",
        options: [
          "Do not require a material medium",
          "Always require air",
          "Cannot transport energy",
          "Are always longitudinal here",
        ],
        correctIndex: 0,
        explanation: "Light propagates in vacuum.",
      },
    ],
    history: [
      {
        id: "x",
        kind: "mcq",
        prompt: "A primary source is typically:",
        options: [
          "Created during or near the period studied",
          "Always written centuries later only",
          "Only a textbook glossary",
          "Only a movie trailer",
        ],
        correctIndex: 0,
        explanation: "Eyewitness artifacts, letters, records.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Historical causation requires:",
        options: [
          "Evidence-backed reasoning about influence",
          "Pure guessing without sources",
          "Ignoring chronology always",
          "Only geography maps",
        ],
        correctIndex: 0,
        explanation: "Claims must be supported.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Bias in a historical account refers to:",
        options: [
          "Systematic tilt from viewpoint or incentives",
          "Perfect neutrality always",
          "Only spelling mistakes",
          "Only publication length",
        ],
        correctIndex: 0,
        explanation: "Perspective shapes interpretation.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Corroboration means:",
        options: [
          "Independent sources supporting the same claim",
          "Deleting sources",
          "Using one diary only always enough",
          "Ignoring chronology",
        ],
        correctIndex: 0,
        explanation: "Multiple independent lines strengthen confidence.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Change over time is central to history because:",
        options: [
          "Context and sequence shape meaning",
          "Dates never matter",
          "Geography replaces narrative",
          "Only statistics matter",
        ],
        correctIndex: 0,
        explanation: "Historians analyze contexts across periods.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Historical significance differs from trivia because it emphasizes:",
        options: [
          "Consequences and importance",
          "Alphabetical ordering only",
          "Memorizing isolated digits only",
          "Deleting evidence",
        ],
        correctIndex: 0,
        explanation: "Impact frames historical importance.",
      },
    ],
    computer_science: [
      {
        id: "x",
        kind: "mcq",
        prompt: "Binary search requires:",
        options: ["Sorted underlying data (usual textbook assumption)", "Unsorted arrays always", "Infinite memory", "Queues only"],
        correctIndex: 0,
        explanation: "Divide interval using ordering.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "A stack is commonly described as:",
        options: ["LIFO", "FIFO always here", "Random access primary", "Priority-only always"],
        correctIndex: 0,
        explanation: "Last in, first out.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Big-O notation captures:",
        options: [
          "Growth rate vs input size",
          "Exact milliseconds always",
          "CPU serial numbers",
          "RGB values",
        ],
        correctIndex: 0,
        explanation: "Asymptotic scaling.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Hash tables aim for average:",
        options: ["O(1) lookups with good hashing", "O(n²) always", "O(log log n) only theoretical never", "Infinite time"],
        correctIndex: 0,
        explanation: "Expected constant-time access.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Recursion requires:",
        options: ["A base case", "No functions allowed", "Infinite recursion always safe", "Parallel GPU always"],
        correctIndex: 0,
        explanation: "Termination condition prevents infinite regress.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Logical AND of true ∧ false yields:",
        options: ["False", "True", "Undefined always", "Both"],
        correctIndex: 0,
        explanation: "Conjunction needs both true.",
      },
    ],
    general: [
      {
        id: "x",
        kind: "mcq",
        prompt: "Before choosing a formula, you should:",
        options: [
          "Identify knowns and the target unknown",
          "Skip defining variables",
          "Guess randomly",
          "Ignore constraints",
        ],
        correctIndex: 0,
        explanation: "Problem setup prevents misapplied equations.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Boundary checks help because:",
        options: [
          "They expose distractors based on edge cases",
          "They remove all algebra",
          "They forbid diagrams",
          "They eliminate units",
        ],
        correctIndex: 0,
        explanation: "Edge reasoning distinguishes similar answers.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "After solving, first verify:",
        options: [
          "Your answer satisfies stated constraints",
          "Only font choice",
          "Nothing — submit blindly",
          "Random reshuffling",
        ],
        correctIndex: 0,
        explanation: "Plug-back catches slips.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Two answers look alike — discriminate using:",
        options: [
          "Different assumptions each requires",
          "Word length only",
          "Alphabetical order only",
          "Ignoring definitions",
        ],
        correctIndex: 0,
        explanation: "Assumption audit separates traps.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "Distractors often tempt students because they:",
        options: [
          "Encode common partial misconceptions",
          "Always spell correctly only",
          "Repeat the stem verbatim only",
          "Are blank",
        ],
        correctIndex: 0,
        explanation: "Plausible wrong answers mirror incomplete models.",
      },
      {
        id: "x",
        kind: "mcq",
        prompt: "A strong final answer line usually:",
        options: [
          "States the result with appropriate units/context",
          "Deletes reasoning entirely always",
          "Lists unrelated trivia",
          "Omits the actual answer",
        ],
        correctIndex: 0,
        explanation: "Communicates conclusion clearly.",
      },
    ],
  };

  if (packType === "mcq") {
    const bank = mcqByBucket[bucket] ?? mcqByBucket.general;
    return cycleBank(bank, n, s);
  }

  const generalShort: PracticeQuestion[] = [
    {
      id: "x",
      kind: "short_answer",
      prompt: `[${s}] State one reason definitions matter before solving applied prompts.`,
      referenceAnswer: "Terms anchor what is being modeled",
      explanation: "Clear definitions prevent formula misuse.",
    },
    {
      id: "x",
      kind: "short_answer",
      prompt: `[${s}] Name one habit that catches sign mistakes quickly.`,
      referenceAnswer: "Plug back into constraints",
      explanation: "Verification surfaces inconsistencies.",
    },
    {
      id: "x",
      kind: "short_answer",
      prompt: `[${s}] Why compare assumptions between similar-looking answers?`,
      referenceAnswer: "Different assumptions change validity",
      explanation: "MCQ traps often hinge on hidden assumptions.",
    },
    {
      id: "x",
      kind: "short_answer",
      prompt: `[${s}] What belongs in a concise final line after quantitative work?`,
      referenceAnswer: "Final value with units or stated conclusion",
      explanation: "Readers grade conclusions, not only scratch work.",
    },
    {
      id: "x",
      kind: "short_answer",
      prompt: `[${s}] One purpose of sketching a diagram before equations is:`,
      referenceAnswer: "Expose relationships among quantities",
      explanation: "Representation clarifies unknown linkage.",
    },
  ];

  const shortAnswerByBucket: Record<StemBucket, PracticeQuestion[]> = {
    mathematics: [
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Why can squaring both sides of an equation introduce extraneous solutions?`,
        referenceAnswer: "Operations need not preserve equivalence unless reversible",
        explanation: "Extraneous roots can satisfy the squared form but not the original.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] State the slope-intercept form of a non-vertical line.`,
        referenceAnswer: "y = mx + b",
        explanation: "m is slope; b is y-intercept.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] What does the derivative represent geometrically for a function graph?`,
        referenceAnswer: "instantaneous rate of change / slope of tangent",
        explanation: "Local linear approximation slope.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] In probability, when are events mutually exclusive?`,
        referenceAnswer: "They cannot both occur in the same trial",
        explanation: "Disjoint outcomes.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Why factor denominators before simplifying rational expressions?`,
        referenceAnswer: "Identify restrictions and cancel common factors safely",
        explanation: "Avoid division by zero and track domain.",
      },
    ],
    biology: [
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Where is DNA primarily located in a typical animal cell?`,
        referenceAnswer: "nucleus",
        explanation: "Nuclear chromosomes carry genomic DNA.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] What molecule carries genetic code from nucleus to ribosomes?`,
        referenceAnswer: "mRNA",
        explanation: "Transcript template for translation.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Name one product of photosynthesis besides oxygen.`,
        referenceAnswer: "glucose",
        explanation: "Carbon fixation yields sugars.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Mitochondria are most associated with which energy molecule for the cell?`,
        referenceAnswer: "ATP",
        explanation: "Oxidative phosphorylation yields ATP.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Viruses require host cells mainly because:`,
        referenceAnswer: "they lack full replication machinery alone",
        explanation: "Obligate intracellular parasites hijack host biosynthesis.",
      },
    ],
    chemistry: [
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] In a neutral atom, how do proton number and electron number compare?`,
        referenceAnswer: "equal",
        explanation: "Overall charge zero.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Does melting absorb or release heat from the substance's perspective?`,
        referenceAnswer: "absorb",
        explanation: "Solid→liquid increases internal energy.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] What does a catalyst change about a reaction pathway?`,
        referenceAnswer: "lowers activation energy",
        explanation: "Offers alternate route without being consumed net.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Is bonding in solid NaCl primarily ionic or covalent?`,
        referenceAnswer: "ionic",
        explanation: "Electron transfer between metal and nonmetal.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] In DNA, adenine pairs with which base?`,
        referenceAnswer: "thymine",
        explanation: "A–T pairing (RNA uses uracil instead of thymine).",
      },
    ],
    physics: [
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] State Newton's second law in equation form for linear motion.`,
        referenceAnswer: "F = ma",
        explanation: "Net force equals mass times acceleration.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] If wave speed is constant and wavelength doubles, what happens to frequency?`,
        referenceAnswer: "halves",
        explanation: "v = fλ ⇒ inverse relation.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] SI unit of power is:`,
        referenceAnswer: "watt",
        explanation: "Joules per second.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] In uniform circular motion at constant speed, acceleration points:`,
        referenceAnswer: "toward center",
        explanation: "Centripetal acceleration.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] State Ohm's law relating voltage V, current I, and resistance R.`,
        referenceAnswer: "V = IR",
        explanation: "Linear resistive materials.",
      },
    ],
    economics: [
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] If price rises while we move along an unchanged demand curve, is demand shifting?`,
        referenceAnswer: "no",
        explanation: "Movement along curve vs shift of curve.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] A binding price ceiling below equilibrium causes shortage or surplus?`,
        referenceAnswer: "shortage",
        explanation: "Qd > Qs at the capped price.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Opportunity cost refers to:`,
        referenceAnswer: "next best alternative forgone",
        explanation: "Marginal trade-off framing.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Normal goods see demand shift which direction when consumer income rises?`,
        referenceAnswer: "right",
        explanation: "Higher income raises quantity demanded at each price.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Profit-maximizing output narrative often sets marginal cost equal to what?`,
        referenceAnswer: "marginal revenue",
        explanation: "MR = MC rule under usual assumptions.",
      },
    ],
    history: [
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] What makes a source primary rather than secondary?`,
        referenceAnswer: "created close to the events or period studied",
        explanation: "Proximity to the historical moment.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Why does chronology matter for causal claims?`,
        referenceAnswer: "causes must precede effects",
        explanation: "Temporal order constrains narrative.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Corroboration means independent sources:`,
        referenceAnswer: "support the same claim",
        explanation: "Strength through multiplicity.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Historical bias often stems from:`,
        referenceAnswer: "viewpoint incentives or selective emphasis",
        explanation: "Perspective shapes narrative.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Significance differs from trivia because significance emphasizes:`,
        referenceAnswer: "consequences and importance",
        explanation: "Impact framing.",
      },
    ],
    computer_science: [
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Binary search on a sorted array of n items typically uses how many comparisons per step in the usual analysis?`,
        referenceAnswer: "one midpoint comparison leading to halving",
        explanation: "O(log n) iterations.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Stack discipline is commonly summarized as:`,
        referenceAnswer: "LIFO",
        explanation: "Last in, first out.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Hash collision means two keys:`,
        referenceAnswer: "map to the same slot or bucket",
        explanation: "Needs chaining or probing.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Adjacency list representation is especially helpful when graphs are:`,
        referenceAnswer: "sparse",
        explanation: "Avoids dense matrix waste.",
      },
      {
        id: "x",
        kind: "short_answer",
        prompt: `[${s}] Big-O describes:`,
        referenceAnswer: "growth rate versus input size",
        explanation: "Asymptotic scaling.",
      },
    ],
    general: generalShort,
  };

  if (packType === "short_answer") {
    const bank = shortAnswerByBucket[bucket] ?? generalShort;
    return cycleBank(bank, n, s);
  }

  const mathProb: PracticeQuestion[] = [
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Simplify: 3x + 5x. Give the simplified expression.`,
      referenceAnswer: "8x",
      explanation: "Combine like terms.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Solve for y: y − 4 = 10.`,
      referenceAnswer: "14",
      explanation: "Add 4 to both sides.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Evaluate (7 − 2) × 3.`,
      referenceAnswer: "15",
      explanation: "Parentheses first: 5 × 3 = 15.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Differentiate x³ with respect to x.`,
      referenceAnswer: "3x²",
      explanation: "Power rule.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Factor x² − 9.`,
      referenceAnswer: "(x − 3)(x + 3)",
      explanation: "Difference of squares.",
    },
  ];

  const bioProb: PracticeQuestion[] = [
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] In one sentence, contrast passive diffusion with active transport.`,
      referenceAnswer:
        "Passive diffusion moves down gradient without ATP; active transport moves against gradient using cellular energy",
      explanation: "Energy coupling distinguishes mechanisms.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Name the base pairing for guanine in DNA.`,
      referenceAnswer: "cytosine",
      explanation: "G pairs with C in DNA.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Where does translation mainly occur in eukaryotic cells?`,
      referenceAnswer: "ribosome",
      explanation: "Polypeptide elongation on ribosomes.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] One role of the nucleus is:`,
      referenceAnswer: "stores genetic material / houses DNA",
      explanation: "Chromosome organization and transcription initiation.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] State why enzymes matter for metabolic pathways.`,
      referenceAnswer: "They catalyze reactions lowering activation energy",
      explanation: "Catalysts regulate pathway throughput.",
    },
  ];

  const chemProb: PracticeQuestion[] = [
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] How many hydrogen atoms are in one molecule of H₂SO₄?`,
      referenceAnswer: "2",
      explanation: "Subscript on H gives atom count per formula unit.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Is melting ice endothermic or exothermic from the ice's perspective?`,
      referenceAnswer: "endothermic",
      explanation: "System absorbs heat to break hydrogen bonds.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] What charge does a chloride ion Cl⁻ carry relative to a neutral Cl atom?`,
      referenceAnswer: "-1",
      explanation: "Gain of one electron.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] True or false style answer only: Does a catalyst change the stoichiometric mole ratios of overall reaction?`,
      referenceAnswer: "no",
      explanation: "Same net reaction; faster path.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] In oxidation, does an atom gain or lose electrons?`,
      referenceAnswer: "lose",
      explanation: "LEO — lose electrons oxidation.",
    },
  ];

  const physicsProb: PracticeQuestion[] = [
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] A 4 kg block accelerates at 3 m/s². Find the net force in newtons.`,
      referenceAnswer: "12",
      explanation: "F = ma.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] What is the kinetic energy (in joules) of a 2 kg object moving at 3 m/s? Use KE = ½mv².`,
      referenceAnswer: "9",
      explanation: "½ × 2 × 9 = 9 J.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] A resistor carries 2 A and drops 6 V. Find its resistance in ohms.`,
      referenceAnswer: "3",
      explanation: "R = V/I.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] If frequency is 5 Hz, how many full cycles occur in 2 seconds?`,
      referenceAnswer: "10",
      explanation: "cycles = f × t.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] For vertical projectile near Earth's surface, acceleration magnitude is often approximated as how many m/s² downward?`,
      referenceAnswer: "9.8",
      explanation: "g ≈ 9.8 m/s².",
    },
  ];

  const econProb: PracticeQuestion[] = [
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] At equilibrium, quantity demanded equals quantity supplied: true or false? Answer one word.`,
      referenceAnswer: "true",
      explanation: "Market clearing definition.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] A binding minimum wage set above equilibrium typically creates excess supply or excess demand of labor?`,
      referenceAnswer: "excess supply",
      explanation: "Surplus of labor (unemployment pressure).",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] If marginal cost exceeds marginal revenue, should a profit-maximizing firm increase output? Answer yes or no.`,
      referenceAnswer: "no",
      explanation: "Additional units reduce profit.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] When demand is perfectly inelastic, does quantity demanded change when price rises? Answer yes or no.`,
      referenceAnswer: "no",
      explanation: "Vertical demand curve narrative.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Public good problems often involve non-rivalry and difficult exclusion — name one issue.`,
      referenceAnswer: "free rider",
      explanation: "Incentive to consume without paying.",
    },
  ];

  const historyProb: PracticeQuestion[] = [
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] In one sentence, why read multiple independent accounts before asserting a bold causal claim?`,
      referenceAnswer: "Corroboration reduces reliance on a single biased source",
      explanation: "Evidence discipline.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Chronology means arranging events in:`,
      referenceAnswer: "time order",
      explanation: "Sequence matters for narrative.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Give one reason context (date, place, audience) changes how we interpret a speech.`,
      referenceAnswer: "same words carry different stakes for different audiences",
      explanation: "Historicity of meaning.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Secondary sources are typically written:`,
      referenceAnswer: "after the fact summarizing or analyzing primary evidence",
      explanation: "Interpretive distance.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] One hallmark of historical significance is emphasis on:`,
      referenceAnswer: "consequences",
      explanation: "Impact vs trivia.",
    },
  ];

  const csProb: PracticeQuestion[] = [
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] For input size n, which grows faster asymptotically: n² or n log n? Answer with the faster-growing expression.`,
      referenceAnswer: "n²",
      explanation: "Compare dominant terms.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] If each recursive call halves array length, typical recursion depth for binary search on n elements is Θ of:`,
      referenceAnswer: "log n",
      explanation: "Repeated halving.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Does DFS always require a queue as its primary frontier structure? Answer yes or no.`,
      referenceAnswer: "no",
      explanation: "DFS uses stack/recursion; BFS uses queue.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] In Big-O, constants and lower-order terms are typically:`,
      referenceAnswer: "dropped",
      explanation: "Asymptotic dominance.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Which abstract data structure does breadth-first search typically use for its frontier?`,
      referenceAnswer: "queue",
      explanation: "FIFO ordering explores layer by layer.",
    },
  ];

  /** Neutral prompts when subject bucket is unknown — no calculus or lab discipline assumed. */
  const generalProb: PracticeQuestion[] = [
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Before answering, list two pieces of information the prompt explicitly gives vs one you must infer.`,
      referenceAnswer: "given facts separated from inferred assumptions",
      explanation: "Structured reading prevents mis-modeling.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] After finishing, name one check that would reveal if your conclusion contradicts the stem.`,
      referenceAnswer: "plug-back or boundary check against stated constraints",
      explanation: "Verification habit.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Two answer choices look similar — what assumption differs between them? Answer in one phrase.`,
      referenceAnswer: "they rely on different unstated premises",
      explanation: "Assumption audit.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] Why define terms before applying a rule or formula?`,
      referenceAnswer: "definitions fix what variables mean",
      explanation: "Semantic clarity.",
    },
    {
      id: "x",
      kind: "problem_solving",
      prompt: `[${s}] What belongs in a concise final line after any worked solution?`,
      referenceAnswer: "the explicit conclusion requested by the prompt",
      explanation: "Answers the question asked.",
    },
  ];

  const problemSolvingByBucket: Record<StemBucket, PracticeQuestion[]> = {
    mathematics: mathProb,
    biology: bioProb,
    chemistry: chemProb,
    physics: physicsProb,
    economics: econProb,
    history: historyProb,
    computer_science: csProb,
    general: generalProb,
  };

  const probBank = problemSolvingByBucket[bucket] ?? generalProb;

  return cycleBank(probBank, n, s);
}
