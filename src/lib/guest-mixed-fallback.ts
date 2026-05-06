import { type GuestTryQuestion } from "@/lib/guest-try-types";

/**
 * Subject-specific fallback pack (exam style, no shape templates).
 * Images are generated dynamically from prompts and tied to each answer candidate.
 */
export function buildGuestMixedFallbackPack(subjectRaw: string): GuestTryQuestion[] {
  const subject = subjectRaw.trim() || "General STEM";
  const s = subject.toLowerCase();

  if (s.includes("biology")) {
    return [
      {
        id: "bio-mcq-1",
        kind: "mcq",
        prompt: "Biology exam question: Which organelle is primarily responsible for ATP production in eukaryotic cells?",
        explanation: "Mitochondria perform aerobic respiration and produce most ATP.",
        options: ["Mitochondrion", "Golgi apparatus", "Lysosome", "Nucleolus"],
        correctIndex: 0,
      },
      {
        id: "bio-tf-1",
        kind: "true_false",
        prompt: "Biology exam statement: Ribosomes are the site of protein synthesis.",
        explanation: "Ribosomes translate mRNA into polypeptide chains.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "bio-img-1",
        kind: "image_mcq",
        prompt: "Biology exam visual: Identify the cell type shown in the image options.",
        explanation: "The correct option depicts plant-cell hallmarks including a rigid wall and chloroplasts.",
        options: ["Plant cell", "Animal cell", "Bacterial cell", "Fungal cell"],
        optionImagePrompts: [
          "Detailed biology textbook diagram of a plant cell with cell wall, large central vacuole, chloroplasts, and nucleus, labeled style",
          "Detailed biology textbook diagram of an animal cell with flexible membrane, lysosomes, and nucleus, labeled style",
          "Detailed biology textbook diagram of a bacterial cell with nucleoid region, flagellum, and no nucleus, labeled style",
          "Detailed biology textbook diagram of a fungal cell with cell wall, nucleus, and vacuoles, labeled style",
        ],
        correctIndex: 0,
      },
      {
        id: "bio-short-1",
        kind: "short_answer",
        prompt: "Biology short answer: Name the process by which plants convert light energy into chemical energy.",
        explanation: "Photosynthesis is the light-driven process used by plants to synthesize sugars.",
        referenceAnswer: "photosynthesis | photo synthesis",
      },
      {
        id: "bio-img-2",
        kind: "image_mcq",
        prompt: "Biology exam visual: Which option shows a neuron specialized for signal transmission?",
        explanation: "A neuron is identified by soma, dendrites, and an axon.",
        options: ["Neuron", "Red blood cell", "Skeletal muscle cell", "Epithelial cell"],
        optionImagePrompts: [
          "Biology textbook style neuron with dendrites, soma, axon and myelin, clear educational diagram",
          "Microscopy style red blood cells biconcave discs, educational diagram",
          "Skeletal muscle fiber diagram with striations and multiple nuclei, educational diagram",
          "Simple epithelial tissue cell layer with tight packing, educational diagram",
        ],
        correctIndex: 0,
      },
      {
        id: "bio-mcq-2",
        kind: "mcq",
        prompt: "Biology exam question: During mitosis, sister chromatids separate during which phase?",
        explanation: "Sister chromatids are pulled to opposite poles during anaphase.",
        options: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
        correctIndex: 2,
      },
      {
        id: "bio-tf-2",
        kind: "true_false",
        prompt: "Biology exam statement: Diffusion moves particles from lower concentration to higher concentration without energy input.",
        explanation: "Diffusion is passive movement from higher to lower concentration.",
        options: ["True", "False"],
        correctIndex: 1,
      },
      {
        id: "bio-img-3",
        kind: "image_mcq",
        prompt: "Biology exam visual: Which option depicts DNA double-helix structure?",
        explanation: "DNA is represented as two antiparallel strands in a double helix.",
        options: ["DNA double helix", "Phospholipid bilayer", "Hemoglobin tetramer", "ATP molecule"],
        optionImagePrompts: [
          "High quality educational illustration of DNA double helix with base pairs",
          "Educational cross-sectional phospholipid bilayer with hydrophilic heads and hydrophobic tails",
          "Educational protein structure of hemoglobin tetramer with four subunits",
          "Educational ATP molecule structure with adenine ribose and phosphate groups",
        ],
        correctIndex: 0,
      },
    ];
  }

  if (s.includes("math") || s.includes("algebra") || s.includes("calculus")) {
    return [
      {
        id: "math-mcq-1",
        kind: "mcq",
        prompt: "Mathematics exam question: Which expression is equivalent to log2(8x)?",
        explanation: "Use product rule: log2(8x) = log2(8) + log2(x) = 3 + log2(x).",
        options: ["3 + log2(x)", "log2(x) - 3", "8log2(x)", "log2(8)log2(x)"],
        correctIndex: 0,
      },
      {
        id: "math-tf-1",
        kind: "true_false",
        prompt: "Mathematics exam statement: The function y = log(x - 3) is a horizontal translation of y = log(x) by 3 units to the right.",
        explanation: "Replacing x by x-3 shifts the graph right by 3.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "math-img-1",
        kind: "image_mcq",
        prompt: "Mathematics exam visual: Which graph shows a logarithmic function f(x) = log x?",
        explanation: "The logarithm graph rises steeply at first then flattens, crossing the x-axis at x=1.",
        options: [
          "Logarithm f(x) = log x",
          "Parabola f(x) = x squared",
          "Straight line f(x) = x linear",
          "Exponential f(x) = e^x growth curve",
        ],
        optionImagePrompts: [
          "f(x) = log x: standard logarithm curve, rises from near x-axis crossing at x=1, labeled axes",
          "f(x) = x squared: upward parabola through origin, quadratic, labeled axes",
          "f(x) = x: straight line increasing through origin, linear function, labeled axes",
          "f(x) = e^x: exponential growth curve, rises steeply, labeled axes",
        ],
        correctIndex: 0,
      },
      {
        id: "math-short-1",
        kind: "short_answer",
        prompt: "Mathematics short answer: Differentiate x^3.",
        explanation: "Apply the power rule.",
        referenceAnswer: "3x^2 | 3x² | 3*x^2 | 3x**2",
      },
      {
        id: "math-img-2",
        kind: "image_mcq",
        prompt: "Mathematics exam visual: Which option is the graph of y = x^2 (upward parabola)?",
        explanation: "y = x^2 is an upward-opening parabola symmetric about the y-axis, minimum at origin.",
        options: [
          "Upward parabola y = x squared",
          "Downward parabola y = negative x squared",
          "Straight line increasing linear",
          "Hyperbola 1 over x two branches",
        ],
        optionImagePrompts: [
          "quadratic parabola x^2 upward opening, symmetric about y-axis, minimum at origin, exam graph",
          "quadratic parabola downward opens down -x^2 negative, maximum at origin, exam graph",
          "straight line linear increasing positive slope through origin, exam graph",
          "hyperbola 1/x reciprocal two branches one in first quadrant one in third quadrant, exam graph",
        ],
        correctIndex: 0,
      },
      {
        id: "math-mcq-2",
        kind: "mcq",
        prompt: "Mathematics exam question: If f(x) = x^2 - 4, what are the x-intercepts?",
        explanation: "Solve x^2 - 4 = 0 -> (x-2)(x+2)=0.",
        options: ["x = -2 and x = 2", "x = 0 and x = 4", "x = -4 and x = 4", "x = 2 only"],
        correctIndex: 0,
      },
      {
        id: "math-tf-2",
        kind: "true_false",
        prompt: "Mathematics exam statement: The derivative of sin(x) is cos(x).",
        explanation: "This is a standard derivative identity.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "math-img-3",
        kind: "image_mcq",
        prompt: "Mathematics exam visual: Choose the graph of a function with positive slope and positive y-intercept.",
        explanation: "The correct line rises left-to-right and crosses y-axis above 0.",
        options: [
          "Increasing line crossing y-axis above 0",
          "Increasing line crossing y-axis below 0",
          "Decreasing line crossing y-axis above 0",
          "Horizontal line at y = 0",
        ],
        optionImagePrompts: [
          "straight line increasing positive slope linear, y-intercept above origin, exam graph",
          "straight line increasing positive slope linear, y-intercept below origin negative, exam graph",
          "straight line decreasing negative slope falls from left to right, exam graph",
          "horizontal line at y equals zero zero slope flat, exam graph",
        ],
        correctIndex: 0,
      },
    ];
  }

  if (s.includes("history")) {
    return [
      {
        id: "hist-mcq-1",
        kind: "mcq",
        prompt: "History exam question: In which year did the United States Declaration of Independence occur?",
        explanation: "The Declaration of Independence was adopted in 1776.",
        options: ["1776", "1783", "1789", "1812"],
        correctIndex: 0,
      },
      {
        id: "hist-tf-1",
        kind: "true_false",
        prompt: "History exam statement: World War I began in 1914.",
        explanation: "WWI began in 1914 after the July Crisis.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "hist-img-1",
        kind: "image_mcq",
        prompt: "History exam visual: Identify the U.S. president shown in the image options for the 1980s period.",
        explanation: "Ronald Reagan served as U.S. president during the 1980s.",
        options: ["Ronald Reagan", "Jimmy Carter", "George H. W. Bush", "Gerald Ford"],
        optionImagePrompts: [
          "Historical portrait style image of Ronald Reagan, formal presidential portrait, high detail educational",
          "Historical portrait style image of Jimmy Carter, formal presidential portrait, high detail educational",
          "Historical portrait style image of George H. W. Bush, formal presidential portrait, high detail educational",
          "Historical portrait style image of Gerald Ford, formal presidential portrait, high detail educational",
        ],
        correctIndex: 0,
      },
      {
        id: "hist-short-1",
        kind: "short_answer",
        prompt: "History short answer: Name the event that started World War I in 1914.",
        explanation: "The assassination in Sarajevo triggered the diplomatic crisis.",
        referenceAnswer: "assassination of archduke franz ferdinand | assassination in sarajevo | franz ferdinand assassination",
      },
      {
        id: "hist-img-2",
        kind: "image_mcq",
        prompt: "History exam visual: Which image corresponds to the signing context of the Declaration of Independence era?",
        explanation: "The appropriate image is the Continental Congress-era signing scene.",
        options: ["Continental Congress signing scene", "Industrial factory line", "Trench warfare front", "Space race launch pad"],
        optionImagePrompts: [
          "Historical painting style scene of Continental Congress drafting and signing declaration in 18th century hall",
          "19th century industrial revolution factory floor with steam machinery",
          "World War I trench warfare scene with soldiers in trenches",
          "1960s space launch scene with rocket and mission control",
        ],
        correctIndex: 0,
      },
      {
        id: "hist-mcq-2",
        kind: "mcq",
        prompt: "History exam question: Which treaty formally ended World War I?",
        explanation: "The Treaty of Versailles (1919) formally ended WWI.",
        options: ["Treaty of Versailles", "Treaty of Paris 1763", "Treaty of Tordesillas", "Treaty of Utrecht"],
        correctIndex: 0,
      },
      {
        id: "hist-tf-2",
        kind: "true_false",
        prompt: "History exam statement: The Berlin Wall fell in 1989.",
        explanation: "The wall opened in November 1989.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "hist-img-3",
        kind: "image_mcq",
        prompt: "History exam visual: Choose the image that best represents the Cold War period.",
        explanation: "Cold War imagery includes symbolic U.S.-USSR rivalry and diplomacy/nuclear tension.",
        options: ["U.S.-USSR diplomatic standoff scene", "Medieval castle siege", "Ancient Roman forum", "Renaissance art studio"],
        optionImagePrompts: [
          "Cold War era educational illustration showing U.S. and USSR leaders in diplomatic standoff",
          "Medieval warfare scene with castle siege and trebuchets",
          "Ancient Roman senate forum scene with togas",
          "Renaissance painter workshop with easels and canvases",
        ],
        correctIndex: 0,
      },
    ];
  }

  if (s.includes("economics") || s.includes("economy") || s.includes("microeconomics") || s.includes("macroeconomics")) {
    return [
      {
        id: "econ-mcq-1",
        kind: "mcq",
        prompt:
          "Economics [Industrial Organization]: Two firms sell a homogeneous good with identical constant marginal cost c and compete by simultaneously choosing prices (Bertrand). What is the Nash equilibrium price in pure strategies?",
        explanation:
          "Under Bertrand competition with homogeneous goods, price is driven to marginal cost in the unique pure-strategy Nash equilibrium.",
        options: [
          "Price equals marginal cost c for both firms",
          "Price equals monopoly price for both firms",
          "Price equals average fixed cost",
          "There is no Nash equilibrium in pure strategies",
        ],
        correctIndex: 0,
      },
      {
        id: "econ-tf-1",
        kind: "true_false",
        prompt:
          "Economics exam statement: Ricardian equivalence implies that a temporary tax cut financed by government borrowing necessarily raises current aggregate consumption even if households optimize intertemporally with rational expectations.",
        explanation:
          "Under Ricardian equivalence, forward-looking households anticipate future taxes and adjust saving so consumption need not rise.",
        options: ["True", "False"],
        correctIndex: 1,
      },
      {
        id: "econ-img-1",
        kind: "image_mcq",
        prompt:
          "Economics exam visual [Consumer Theory]: The consumer faces two goods. Income doubles while relative prices stay fixed. Which diagram shows ONLY a parallel outward shift of the budget line through the origin?",
        explanation:
          "A proportional income increase at unchanged prices shifts the budget line outward parallel to itself.",
        options: [
          "Parallel outward budget shift (same slope)",
          "Budget rotation from a change in relative prices only",
          "Budget pivot where only one absolute price changes while nominal income fixed",
          "Indifference map with no budget constraint drawn",
        ],
        optionImagePrompts: [
          "Intermediate microeconomics diagram: two-good budget line shifts outward parallel keeping same slope, higher intercepts on both axes, labeled axes X and Y",
          "Intermediate microeconomics diagram: budget line rotates inward around one intercept showing relative price change",
          "Intermediate microeconomics diagram: budget line pivots from change in one goods price with income fixed",
          "Intermediate microeconomics diagram: indifference curves only with no budget line plotted",
        ],
        correctIndex: 0,
      },
      {
        id: "econ-short-1",
        kind: "short_answer",
        prompt:
          "Economics short answer [Mechanism Design]: Before contracting, one party cannot observe the other party's hidden type; after contracting, hidden effort becomes the worry. Name the two canonical asymmetric-information problems in order (before / after).",
        explanation:
          "Hidden types map to adverse selection before contracting; hidden actions map to moral hazard after contracting.",
        referenceAnswer: "adverse selection then moral hazard | adverse selection, moral hazard | adverse selection and moral hazard",
      },
      {
        id: "econ-img-2",
        kind: "image_mcq",
        prompt:
          "Economics exam visual [Market Power]: Which panel best depicts a linear downward-sloping demand with marginal revenue lying strictly below demand for a profit-maximizing single-price monopolist?",
        explanation:
          "For a downward-sloping demand, marginal revenue is below demand at positive quantities for a linear monopoly.",
        options: [
          "Demand downward-sloping with MR below demand inside positive quantities",
          "Demand downward-sloping with MR coinciding with demand everywhere",
          "Perfectly elastic horizontal demand facing the firm",
          "Vertical demand curve at fixed quantity",
        ],
        optionImagePrompts: [
          "Intermediate microeconomics monopoly diagram: downward-sloping demand and separate marginal-revenue curve strictly below demand between intercepts, labeled D and MR",
          "Intermediate microeconomics diagram incorrectly showing marginal revenue identical to demand everywhere",
          "Perfect competition diagram: horizontal demand curve at market price for individual firm",
          "Diagram showing perfectly inelastic vertical demand line at one quantity",
        ],
        correctIndex: 0,
      },
      {
        id: "econ-mcq-2",
        kind: "mcq",
        prompt:
          "Economics [Open Economy Macro]: In the Mundell-Fleming model with perfect capital mobility and a floating exchange rate, an expansionary fiscal policy shock tends to have which outcome for domestic output?",
        explanation:
          "With floating rates and perfect capital mobility, currency appreciation crowds out net exports so fiscal expansion has little effect on output.",
        options: [
          "Output is largely unchanged because appreciation offsets demand stimulus",
          "Output rises strongly with no exchange-rate response",
          "Output falls because fiscal expansion depreciates the currency",
          "Output doubles regardless of monetary policy",
        ],
        correctIndex: 0,
      },
      {
        id: "econ-tf-2",
        kind: "true_false",
        prompt:
          "Economics exam statement: The First Welfare Theorem of competitive markets guarantees Pareto efficiency even if preferences are not locally non-satiated and competitive equilibrium exists.",
        explanation:
          "Standard proofs assume local non-satiation (among other conditions); dropping it can break the efficiency conclusion.",
        options: ["True", "False"],
        correctIndex: 1,
      },
      {
        id: "econ-img-3",
        kind: "image_mcq",
        prompt:
          "Economics exam visual [Macro Dynamics]: Which stylized diagram pairs a downward-sloping short-run Phillips curve intersecting a vertical long-run Phillips curve at expected inflation?",
        explanation:
          "The textbook expectations-augmented Phillips story shows SRPC downward sloping and LR vertical at natural unemployment.",
        options: [
          "SR Phillips downward with vertical LR Phillips at NAIRU-style point",
          "Vertical SR and downward LR Phillips curves",
          "Single upward-sloping Phillips curve only",
          "Aggregate labor-supply curve in one-good Solow diagram only",
        ],
        optionImagePrompts: [
          "Macroeconomics diagram: short-run Phillips curve downward sloping with long-run vertical Phillips curve crossing at expected inflation label, unemployment on horizontal axis",
          "Incorrect macro diagram swapping slopes so short-run vertical and long-run downward",
          "Single upward-sloping curve labeled inflation versus unemployment only",
          "Neoclassical growth model diagram with capital per worker only, no Phillips curves",
        ],
        correctIndex: 0,
      },
    ];
  }

  if (s.includes("physics")) {
    return [
      {
        id: "phys-mcq-1",
        kind: "mcq",
        prompt: "Physics exam question: What is the SI unit of electric resistance?",
        explanation: "The ohm (Ω) is the SI unit of electrical resistance, defined as V/A.",
        options: ["Ohm (Ω)", "Farad (F)", "Henry (H)", "Siemens (S)"],
        correctIndex: 0,
      },
      {
        id: "phys-tf-1",
        kind: "true_false",
        prompt: "Physics exam statement: The acceleration due to gravity near Earth's surface is approximately 9.8 m/s².",
        explanation: "Standard gravitational acceleration is 9.8 m/s² (or 9.81 m/s²).",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "phys-img-1",
        kind: "image_mcq",
        prompt: "Physics exam visual: Select the circuit diagram that shows resistors connected in series.",
        explanation: "In a series circuit, resistors are connected end-to-end in a single path.",
        options: [
          "Resistors in series (single loop)",
          "Resistors in parallel (multiple branches)",
          "Capacitor in RC low-pass filter",
          "Inductor coil circuit",
        ],
        optionImagePrompts: [
          "Physics textbook circuit diagram with three resistors connected in series, single current path, labeled R1 R2 R3",
          "Physics textbook circuit diagram with three resistors connected in parallel, multiple branches, labeled R1 R2 R3",
          "Physics textbook RC low-pass filter circuit with resistor and capacitor, labeled",
          "Physics textbook circuit with an inductor coil symbol and voltage source, labeled",
        ],
        correctIndex: 0,
      },
      {
        id: "phys-short-1",
        kind: "short_answer",
        prompt: "Physics short answer: State Newton's second law as a mathematical equation.",
        explanation: "Newton's second law: F = ma (net force equals mass times acceleration).",
        referenceAnswer: "f = ma | force equals mass times acceleration | f=ma",
      },
      {
        id: "phys-img-2",
        kind: "image_mcq",
        prompt: "Physics exam visual: Which graph correctly shows velocity vs. time for uniformly accelerated motion from rest?",
        explanation: "Uniform acceleration from rest produces a straight line through the origin on a v-t graph.",
        options: [
          "Straight line through origin (v ∝ t)",
          "Horizontal flat line (constant velocity)",
          "Parabola opening upward",
          "Curved decay approaching zero",
        ],
        optionImagePrompts: [
          "Physics textbook velocity-time graph for uniform acceleration: straight line starting at origin with positive slope, labeled axes",
          "Physics textbook velocity-time graph for constant velocity: horizontal flat line, labeled axes",
          "Physics textbook displacement-time graph for uniform acceleration: parabola, labeled axes",
          "Physics textbook velocity-time graph for deceleration: curve decaying toward zero, labeled axes",
        ],
        correctIndex: 0,
      },
      {
        id: "phys-mcq-2",
        kind: "mcq",
        prompt: "Physics exam question: Which type of wave requires a material medium to propagate?",
        explanation: "Mechanical waves (e.g., sound) require a medium; electromagnetic waves do not.",
        options: ["Mechanical wave", "Electromagnetic wave", "Gravitational wave", "Radio wave"],
        correctIndex: 0,
      },
      {
        id: "phys-tf-2",
        kind: "true_false",
        prompt: "Physics exam statement: The speed of light in a vacuum is approximately 3 × 10⁸ m/s.",
        explanation: "The speed of light in vacuum, c ≈ 2.998 × 10⁸ m/s.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "phys-img-3",
        kind: "image_mcq",
        prompt: "Physics exam visual: Identify the diagram that shows constructive wave interference.",
        explanation: "Constructive interference occurs when two waves in phase combine to produce a larger amplitude.",
        options: [
          "Two in-phase waves combining to larger amplitude",
          "Two out-of-phase waves cancelling each other",
          "Single wave with no superposition",
          "Wave reflection from a fixed boundary",
        ],
        optionImagePrompts: [
          "Physics textbook wave diagram showing two in-phase waves overlapping to produce constructive interference with larger amplitude",
          "Physics textbook wave diagram showing two out-of-phase waves cancelling to produce destructive interference",
          "Physics textbook diagram of a single sinusoidal wave with labeled amplitude and wavelength",
          "Physics textbook diagram of a wave pulse reflecting from a fixed wall with inverted phase",
        ],
        correctIndex: 0,
      },
    ];
  }

  if (s.includes("chemistry") || s.includes("chem")) {
    return [
      {
        id: "chem-mcq-1",
        kind: "mcq",
        prompt: "Chemistry exam question: What is the atomic number of carbon?",
        explanation: "Carbon has 6 protons, giving it atomic number 6.",
        options: ["6", "12", "8", "14"],
        correctIndex: 0,
      },
      {
        id: "chem-tf-1",
        kind: "true_false",
        prompt: "Chemistry exam statement: In an exothermic reaction, heat is released to the surroundings.",
        explanation: "Exothermic reactions release energy (negative ΔH), warming the surroundings.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "chem-img-1",
        kind: "image_mcq",
        prompt: "Chemistry exam visual: Identify the correct Lewis dot structure for water (H₂O).",
        explanation: "Water has two bonding pairs and two lone pairs on the oxygen atom.",
        options: [
          "H₂O Lewis structure with two lone pairs on O",
          "CO₂ Lewis structure with double bonds",
          "NH₃ Lewis structure with one lone pair on N",
          "CH₄ tetrahedral Lewis structure",
        ],
        optionImagePrompts: [
          "Chemistry textbook Lewis dot structure of water (H2O): oxygen in center with two O-H bonds and two lone pairs, labeled",
          "Chemistry textbook Lewis dot structure of CO2: carbon in center with two double bonds to oxygen, labeled",
          "Chemistry textbook Lewis dot structure of ammonia (NH3): nitrogen with three N-H bonds and one lone pair, labeled",
          "Chemistry textbook Lewis dot structure of methane (CH4): carbon with four C-H bonds, tetrahedral geometry, labeled",
        ],
        correctIndex: 0,
      },
      {
        id: "chem-short-1",
        kind: "short_answer",
        prompt: "Chemistry short answer: What is the formula for sulfuric acid?",
        explanation: "Sulfuric acid is H₂SO₄.",
        referenceAnswer: "h2so4 | h₂so₄ | sulfuric acid formula",
      },
      {
        id: "chem-img-2",
        kind: "image_mcq",
        prompt: "Chemistry exam visual: Which periodic table region contains the alkali metals?",
        explanation: "Alkali metals occupy Group 1 (the leftmost column) of the periodic table.",
        options: [
          "Group 1 — leftmost column (Li, Na, K, Rb…)",
          "Group 17 — halogens column (F, Cl, Br…)",
          "Group 18 — noble gases rightmost column",
          "d-block transition metals in the center",
        ],
        optionImagePrompts: [
          "Periodic table diagram with Group 1 alkali metals column highlighted and labeled: H Li Na K Rb Cs Fr",
          "Periodic table diagram with Group 17 halogens column highlighted: F Cl Br I At Ts",
          "Periodic table diagram with Group 18 noble gases rightmost column highlighted: He Ne Ar Kr Xe Rn",
          "Periodic table diagram with d-block transition metals central region highlighted",
        ],
        correctIndex: 0,
      },
      {
        id: "chem-mcq-2",
        kind: "mcq",
        prompt: "Chemistry exam question: Which type of bond involves the sharing of electron pairs between atoms?",
        explanation: "Covalent bonds are formed by the sharing of electron pairs.",
        options: ["Covalent bond", "Ionic bond", "Metallic bond", "Hydrogen bond"],
        correctIndex: 0,
      },
      {
        id: "chem-tf-2",
        kind: "true_false",
        prompt: "Chemistry exam statement: Avogadro's number is approximately 6.022 × 10²³.",
        explanation: "Avogadro's constant is 6.022 × 10²³ mol⁻¹.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "chem-img-3",
        kind: "image_mcq",
        prompt: "Chemistry exam visual: Choose the energy diagram that represents an exothermic reaction.",
        explanation: "An exothermic reaction's products are at lower energy than reactants (ΔH < 0).",
        options: [
          "Products lower than reactants (ΔH < 0)",
          "Products higher than reactants (ΔH > 0)",
          "Reactants and products at equal energy",
          "No activation energy barrier shown",
        ],
        optionImagePrompts: [
          "Chemistry textbook reaction energy diagram for exothermic reaction: reactants higher than products, activation energy hump, labeled ΔH negative",
          "Chemistry textbook reaction energy diagram for endothermic reaction: products higher than reactants, labeled ΔH positive",
          "Chemistry textbook flat energy diagram with reactants and products at same level",
          "Chemistry textbook simple reaction coordinate with no activation energy barrier",
        ],
        correctIndex: 0,
      },
    ];
  }

  if (
    s.includes("computer science") ||
    s.includes("programming") ||
    s.includes("algorithms") ||
    s.includes("data structures") ||
    s.includes(" cs ") ||
    s === "cs"
  ) {
    return [
      {
        id: "cs-mcq-1",
        kind: "mcq",
        prompt: "Computer Science exam question: What is the time complexity of binary search on a sorted array of n elements?",
        explanation: "Binary search halves the search space each step, giving O(log n) time.",
        options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"],
        correctIndex: 0,
      },
      {
        id: "cs-tf-1",
        kind: "true_false",
        prompt: "Computer Science exam statement: A stack data structure follows the Last-In, First-Out (LIFO) principle.",
        explanation: "Stacks are LIFO — the last element pushed is the first one popped.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "cs-img-1",
        kind: "image_mcq",
        prompt: "Computer Science exam visual: Select the data structure diagram that represents a binary search tree (BST).",
        explanation: "A BST has left children smaller than the node and right children larger.",
        options: [
          "Binary search tree with left < root < right property",
          "Linked list with single head and tail pointer",
          "Hash table with chaining buckets",
          "Min-heap with parent ≤ children",
        ],
        optionImagePrompts: [
          "Computer science textbook diagram of a binary search tree with node values showing left < parent < right, arrows and labeled nodes",
          "Computer science textbook diagram of a singly linked list with nodes and next pointers, head and tail labeled",
          "Computer science textbook diagram of a hash table with array of buckets and chaining linked lists",
          "Computer science textbook diagram of a min-heap binary tree with parent values smaller than children",
        ],
        correctIndex: 0,
      },
      {
        id: "cs-short-1",
        kind: "short_answer",
        prompt: "Computer Science short answer: In Big-O notation, what does O(1) describe about an algorithm's time complexity?",
        explanation: "O(1) means constant time — the algorithm takes the same time regardless of input size.",
        referenceAnswer: "constant time | O(1) means constant | independent of input size | fixed number of operations",
      },
      {
        id: "cs-img-2",
        kind: "image_mcq",
        prompt: "Computer Science exam visual: Which sorting algorithm's diagram shows a divide-and-conquer split pattern?",
        explanation: "Merge sort divides the array recursively, sorts halves, then merges — a classic divide-and-conquer.",
        options: [
          "Merge sort — recursive array halving and merging",
          "Bubble sort — adjacent element comparison passes",
          "Insertion sort — element sliding into sorted portion",
          "Selection sort — minimum element selection sweeps",
        ],
        optionImagePrompts: [
          "Computer science textbook diagram of merge sort: array split into halves recursively then merged, tree structure showing divide and conquer",
          "Computer science textbook diagram of bubble sort: arrows showing adjacent swaps across multiple passes",
          "Computer science textbook diagram of insertion sort: element being inserted into the sorted left portion with shift arrows",
          "Computer science textbook diagram of selection sort: minimum element highlighted and swapped to front each pass",
        ],
        correctIndex: 0,
      },
      {
        id: "cs-mcq-2",
        kind: "mcq",
        prompt: "Computer Science exam question: Which data structure uses FIFO (First-In, First-Out) ordering?",
        explanation: "A queue processes elements in the order they arrive — FIFO.",
        options: ["Queue", "Stack", "Heap", "Tree"],
        correctIndex: 0,
      },
      {
        id: "cs-tf-2",
        kind: "true_false",
        prompt: "Computer Science exam statement: In Python, a list is mutable but a tuple is immutable.",
        explanation: "Python lists can be modified after creation; tuples cannot.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "cs-img-3",
        kind: "image_mcq",
        prompt: "Computer Science exam visual: Identify the graph traversal diagram that shows Breadth-First Search (BFS) order.",
        explanation: "BFS explores nodes level by level from the root, visiting all neighbors before going deeper.",
        options: [
          "Level-by-level traversal from root (BFS)",
          "Deepest path first traversal (DFS)",
          "Sorted array binary search steps",
          "Shortest path Dijkstra's weighted graph",
        ],
        optionImagePrompts: [
          "Computer science textbook BFS traversal diagram: tree with nodes labeled by BFS visit order 1 2 3 4 5 level by level",
          "Computer science textbook DFS traversal diagram: tree with nodes labeled by DFS visit order going deep before backtracking",
          "Computer science textbook binary search diagram: sorted array with midpoint markers and narrowing range",
          "Computer science textbook Dijkstra shortest path graph with weighted edges and shortest path highlighted",
        ],
        correctIndex: 0,
      },
    ];
  }

  if (s.includes("geography") || s.includes("geo")) {
    return [
      {
        id: "geo-mcq-1",
        kind: "mcq",
        prompt: "Geography exam question: Which is the world's longest river?",
        explanation: "The Nile River in Africa is generally considered the world's longest at ~6,650 km.",
        options: ["Nile", "Amazon", "Yangtze", "Mississippi"],
        correctIndex: 0,
      },
      {
        id: "geo-tf-1",
        kind: "true_false",
        prompt: "Geography exam statement: The Sahara Desert is located on the African continent.",
        explanation: "The Sahara spans northern Africa, the world's largest hot desert.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "geo-img-1",
        kind: "image_mcq",
        prompt: "Geography exam visual: Identify the map that correctly highlights the continent of South America.",
        explanation: "South America is the fourth-largest continent, located primarily in the Southern Hemisphere.",
        options: [
          "South America highlighted on world map",
          "Africa highlighted on world map",
          "Australia highlighted on world map",
          "North America highlighted on world map",
        ],
        optionImagePrompts: [
          "World map with South America continent highlighted in color, other continents grey, labeled",
          "World map with Africa continent highlighted in color, other continents grey, labeled",
          "World map with Australia continent highlighted in color, other continents grey, labeled",
          "World map with North America continent highlighted in color, other continents grey, labeled",
        ],
        correctIndex: 0,
      },
      {
        id: "geo-short-1",
        kind: "short_answer",
        prompt: "Geography short answer: Name the imaginary line at 0° latitude that divides Earth into Northern and Southern Hemispheres.",
        explanation: "The Equator is the line at 0° latitude dividing the hemispheres.",
        referenceAnswer: "equator | the equator | 0 degrees latitude",
      },
      {
        id: "geo-img-2",
        kind: "image_mcq",
        prompt: "Geography exam visual: Select the physical map feature that represents a river delta.",
        explanation: "A delta forms at a river's mouth where sediment fans out into a body of water.",
        options: [
          "River delta fan shape at coast",
          "Mountain range cross-section",
          "Plateau with flat elevated top",
          "Glacier valley U-shape",
        ],
        optionImagePrompts: [
          "Geography textbook physical map showing a river delta with fan-shaped sediment deposits at coastline, labeled",
          "Geography textbook cross-section diagram of a mountain range with peaks and valleys, labeled",
          "Geography textbook diagram of a plateau showing flat elevated landform with steep edges, labeled",
          "Geography textbook diagram of a glaciated U-shaped valley with ice and carved walls, labeled",
        ],
        correctIndex: 0,
      },
      {
        id: "geo-mcq-2",
        kind: "mcq",
        prompt: "Geography exam question: Which country has the largest total land area in the world?",
        explanation: "Russia is the world's largest country by land area at ~17.1 million km².",
        options: ["Russia", "Canada", "United States", "China"],
        correctIndex: 0,
      },
      {
        id: "geo-tf-2",
        kind: "true_false",
        prompt: "Geography exam statement: Mount Everest is located in the Himalayan mountain range.",
        explanation: "Mount Everest, the world's highest peak, is part of the Himalayas on the Nepal-Tibet border.",
        options: ["True", "False"],
        correctIndex: 0,
      },
      {
        id: "geo-img-3",
        kind: "image_mcq",
        prompt: "Geography exam visual: Which map projection preserves the shape of landmasses (conformal)?",
        explanation: "The Mercator projection is conformal — it preserves local shapes but distorts area at high latitudes.",
        options: [
          "Mercator projection (shapes preserved)",
          "Equal-area (Peters) projection",
          "Azimuthal equidistant polar projection",
          "Robinson projection",
        ],
        optionImagePrompts: [
          "Geography textbook Mercator world map projection with latitude/longitude grid, Greenland appears large, labeled",
          "Geography textbook Peters equal-area world map projection with accurate relative land sizes, labeled",
          "Geography textbook azimuthal equidistant projection centered on North Pole, circular concentric rings, labeled",
          "Geography textbook Robinson world map projection with curved meridians, compromise distortion, labeled",
        ],
        correctIndex: 0,
      },
    ];
  }

  // Subject-generic but still exam-style and specific (no shapes/placeholders)
  return [
    {
      id: "gen-mcq-1",
      kind: "mcq",
      prompt:
        `${subject} exam question: Which statement best reflects a core principle in this subject based on formal definitions?`,
      explanation:
        "The keyed option is the only one consistent with the standard definition.",
      options: [
        "Definition-consistent principle",
        "Overgeneralized exception",
        "Common misconception",
        "Unrelated claim",
      ],
      correctIndex: 0,
    },
    {
      id: "gen-tf-1",
      kind: "true_false",
      prompt:
        `${subject} exam statement: A conclusion that ignores the main constraint of the model is always valid.`,
      explanation: "Ignoring core constraints invalidates conclusions in formal problem solving.",
      options: ["True", "False"],
      correctIndex: 1,
    },
    {
      id: "gen-img-1",
      kind: "image_mcq",
      prompt:
        `${subject} exam visual: Which option image best matches the first concept listed below?`,
      explanation: "The first option image directly depicts the target concept.",
      options: [
        `${subject} foundational model`,
        `${subject} counterexample case`,
        `${subject} edge-condition case`,
        `${subject} unrelated case`,
      ],
      optionImagePrompts: [
        `${subject} textbook-style visual of a foundational model`,
        `${subject} textbook-style visual of a counterexample case`,
        `${subject} textbook-style visual of an edge-condition case`,
        `${subject} textbook-style visual of an unrelated case`,
      ],
      correctIndex: 0,
    },
    {
      id: "gen-short-1",
      kind: "short_answer",
      prompt: `${subject} short answer: write the name of one standard method used to validate a final result.`,
      explanation: "A valid answer names a standard verification method in formal work.",
      referenceAnswer: "consistency check | verify against constraints | substitution check",
    },
    {
      id: "gen-img-2",
      kind: "image_mcq",
      prompt:
        `${subject} exam visual: Select the image that corresponds to the second listed concept.`,
      explanation: "The second option image is keyed to the target concept.",
      options: [
        `${subject} baseline setup`,
        `${subject} target setup`,
        `${subject} overfitted setup`,
        `${subject} invalid setup`,
      ],
      optionImagePrompts: [
        `${subject} textbook visual for a baseline setup`,
        `${subject} textbook visual for the target setup`,
        `${subject} textbook visual for an overfitted setup`,
        `${subject} textbook visual for an invalid setup`,
      ],
      correctIndex: 1,
    },
    {
      id: "gen-mcq-2",
      kind: "mcq",
      prompt:
        `${subject} exam question: After applying the stated condition, which choice remains logically valid?`,
      explanation: "Only one choice respects the stated condition and assumptions.",
      options: ["Condition-consistent choice", "Condition-violating choice", "Numerically impossible choice", "Irrelevant choice"],
      correctIndex: 0,
    },
    {
      id: "gen-mcq-3",
      kind: "mcq",
      prompt:
        `${subject} exam visual: Refer to the image and choose the interpretation that best matches the shown pattern.`,
      explanation: "The keyed interpretation aligns with the dominant pattern in the visual.",
      promptImagePrompt: `${subject} exam-style educational diagram showing one clear dominant pattern for interpretation`,
      options: [
        "Correct interpretation of the displayed pattern",
        "Opposite interpretation",
        "Overstated interpretation",
        "Unrelated interpretation",
      ],
      correctIndex: 0,
    },
    {
      id: "gen-img-3",
      kind: "image_mcq",
      prompt:
        `${subject} exam visual: Final item — select the image tied to the fourth listed concept.`,
      explanation: "The fourth option image corresponds to the requested concept.",
      options: [
        `${subject} early-stage pattern`,
        `${subject} mid-stage pattern`,
        `${subject} near-correct pattern`,
        `${subject} fully-correct pattern`,
      ],
      optionImagePrompts: [
        `${subject} textbook visual of an early-stage pattern`,
        `${subject} textbook visual of a mid-stage pattern`,
        `${subject} textbook visual of a near-correct pattern`,
        `${subject} textbook visual of a fully-correct pattern`,
      ],
      correctIndex: 3,
    },
  ];
}
