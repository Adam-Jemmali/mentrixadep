import { describe, expect, it } from "vitest";
import { hydrateGuestTryQuestionImages } from "@/shared/integrations/ai/practice";
import {
  isPlayableGuestTryQuestion,
  isTrustedGuestVisualPickUrl,
  type GuestTryQuestion,
} from "@/features/quest/guest-try-types";

function decodeSvgFromDataUrl(url: string): string {
  const payload = url.split(",")[1] ?? "";
  return url.includes(";base64,") ? atob(payload) : decodeURIComponent(payload);
}

function svgVisualSignature(url: string): string {
  return decodeSvgFromDataUrl(url)
    .replace(/<metadata>[\s\S]*?<\/metadata>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

describe("guest visual pick images", () => {
  it("replaces external image_mcq urls with local exam SVGs", async () => {
    const question: GuestTryQuestion = {
      id: "math-img-2",
      kind: "image_mcq",
      prompt: "Mathematics exam visual: Which option is the graph of y = x^2 (upward parabola)?",
      explanation: "y = x^2 opens upward.",
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
      optionImageUrls: [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/example1.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/example2.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/example3.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/example4.png",
      ],
      correctIndex: 0,
    };

    const hydrated = await hydrateGuestTryQuestionImages("Mathematics", [question]);
    expect("error" in hydrated).toBe(false);
    if ("error" in hydrated) return;

    const out = hydrated.questions[0]!;
    expect(out.optionImageUrls).toHaveLength(4);
    expect(out.optionImageUrls!.every(isTrustedGuestVisualPickUrl)).toBe(true);
    expect(out.optionImageUrls!.every((url) => !url.startsWith("http"))).toBe(true);
    expect(isPlayableGuestTryQuestion(out)).toBe(true);

    const payload = out.optionImageUrls![0]!.split(",")[1] ?? "";
    const svgText = out.optionImageUrls![0]!.includes(";base64,")
      ? atob(payload)
      : decodeURIComponent(payload);
    expect(svgText.toLowerCase()).toContain("parabola");
  });

  it("does not treat upward parabola prompts as history portraits", async () => {
    const question: GuestTryQuestion = {
      id: "math-img-up",
      kind: "image_mcq",
      prompt: "Which graph is y = x^2 opening upward?",
      explanation: "Upward parabola.",
      options: ["Upward parabola", "Downward parabola", "Line", "Hyperbola"],
      optionImagePrompts: [
        "quadratic parabola x^2 upward opening, minimum at origin, exam graph",
        "quadratic parabola downward opens down -x^2, exam graph",
        "straight line linear increasing positive slope, exam graph",
        "hyperbola 1/x reciprocal two branches, exam graph",
      ],
      correctIndex: 0,
    };

    const hydrated = await hydrateGuestTryQuestionImages("Mathematics", [question]);
    expect("error" in hydrated).toBe(false);
    if ("error" in hydrated) return;

    const decodeSvg = (url: string) => {
      const payload = url.split(",")[1] ?? "";
      return url.includes(";base64,") ? atob(payload) : decodeURIComponent(payload);
    };

    const svgText = decodeSvg(hydrated.questions[0]!.optionImageUrls![0]!).toLowerCase();
    expect(svgText).toContain("parabola");
    expect(svgText).not.toContain('cy="258" r="64"');
  });

  it("builds distinct visuals for each option slot", async () => {
    const question: GuestTryQuestion = {
      id: "math-img-1",
      kind: "image_mcq",
      prompt: "Which graph shows a logarithmic function f(x) = log x?",
      explanation: "Log graph rises then flattens.",
      options: ["Log", "Parabola", "Line", "Exponential"],
      optionImagePrompts: [
        "f(x) = log x logarithm curve crossing x=1",
        "f(x) = x squared upward parabola",
        "f(x) = x straight line through origin",
        "f(x) = e^x exponential growth curve",
      ],
      correctIndex: 0,
    };

    const hydrated = await hydrateGuestTryQuestionImages("Mathematics", [question]);
    expect("error" in hydrated).toBe(false);
    if ("error" in hydrated) return;

    const urls = hydrated.questions[0]!.optionImageUrls!;
    const signatures = urls.map(svgVisualSignature);
    expect(new Set(signatures).size).toBe(4);
  });

  it("renders distinct biology cell-type visuals for neuron visual pick", async () => {
    const question: GuestTryQuestion = {
      id: "bio-img-2",
      kind: "image_mcq",
      prompt: "Biology exam visual: Which option shows a neuron specialized for signal transmission?",
      explanation: "A neuron is identified by soma, dendrites, and an axon.",
      options: ["Neuron", "Red blood cell", "Skeletal muscle cell", "Epithelial cell"],
      optionImagePrompts: [
        "Biology textbook style neuron with dendrites, soma, axon and myelin, clear educational diagram",
        "Microscopy style red blood cells biconcave discs, educational diagram",
        "Skeletal muscle fiber diagram with striations and multiple nuclei, educational side view",
        "Simple epithelial tissue cell layer with tight packing, educational diagram",
      ],
      correctIndex: 0,
    };

    const hydrated = await hydrateGuestTryQuestionImages("Biology", [question]);
    expect("error" in hydrated).toBe(false);
    if ("error" in hydrated) return;

    const urls = hydrated.questions[0]!.optionImageUrls!;
    const svgs = urls.map(decodeSvgFromDataUrl);
    const titles = svgs.map((s) => s.match(/text-anchor="middle">([^<]+)/i)?.[1] ?? "?");
    expect(titles).toEqual(["Neuron", "Red Blood Cells", "Skeletal Muscle Fiber", "Epithelial Tissue Layer"]);
    expect(new Set(urls.map(svgVisualSignature)).size).toBe(4);
  });
});
