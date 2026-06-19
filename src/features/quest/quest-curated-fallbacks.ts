import type { QuestExplanationResponse } from "@/shared/integrations/ai";
import type { QuestMode } from "@/features/quest/quest-internal";

function withMode(
  response: QuestExplanationResponse,
  mode: QuestMode
): QuestExplanationResponse {
  return {
    ...response,
    reasoning: mode === "exam" ? "" : response.reasoning,
  };
}

const STACK_HEAP: QuestExplanationResponse = {
  hints: [
    "Stack memory is automatic and LIFO: each function call pushes a frame; locals die when the function returns.",
    "Heap memory holds objects with lifetimes you control (or the garbage collector controls): malloc, new, allocations that outlive one call.",
    "Compare four axes: who allocates, who frees, typical speed, and typical failure mode (stack overflow vs out-of-memory).",
    "Anchor each side with one example: stack = nested function calls; heap = a dynamically sized list stored across multiple functions.",
  ],
  reasoning: `Stack
• Managed by the runtime for call frames (LIFO).
• Stores return addresses, parameters, and local variables tied to scope.
• Allocation and cleanup are fast and automatic when a function returns.
• Size is limited; deep recursion can cause stack overflow.

Heap
• Stores data whose lifetime is not tied to a single function scope.
• Allocation is explicit (C/C++ malloc) or via language constructs (new, objects); freeing may be manual or GC.
• Larger and slower than stack; fragmentation and leaks are heap risks.

Logical distinction
Stack answers "what is this function doing right now?"
Heap answers "where do I keep data that must survive after this function returns?"`,
  finalAnswer: `Stack is fast, scope-bound, automatic memory for call frames and locals (last-in, first-out). Heap is dynamic memory for objects that outlive a single function, with explicit or garbage-collected lifetime. They differ in allocation speed, size limits, lifetime rules, and failure modes.`,
};

const BIG_O: QuestExplanationResponse = {
  hints: [
    "Big O describes how time or space grows as input size n grows, not the exact constant runtime.",
    "Drop fixed constants and lower-order terms: 3n² + 100n becomes O(n²).",
    "Name the dominant term for typical loops: one loop O(n), nested loop O(n²), halving each step O(log n).",
    "Use one example: scanning an array is O(n); binary search is O(log n).",
  ],
  reasoning: `Big O is an upper-bound growth rate for an algorithm as n → ∞.
• O(1): constant time regardless of n.
• O(log n): divide the problem repeatedly (binary search).
• O(n): single pass over input.
• O(n log n): efficient sorts such as mergesort.
• O(n²): nested loops over the same input.

It compares scalability, not microseconds. Constants are ignored because hardware changes; growth shape does not.`,
  finalAnswer: `Big O notation states the asymptotic upper bound of runtime or memory as input size grows. It keeps the dominant term and drops constants, so you can compare algorithm scalability (for example O(n) vs O(n²)) independent of machine speed.`,
};

const DYNAMIC_PROGRAMMING: QuestExplanationResponse = {
  hints: [
    "Dynamic programming applies when a problem has overlapping subproblems and optimal substructure.",
    "Write the recurrence first: how does the answer for size n depend on smaller sizes?",
    "Choose top-down (memoization) or bottom-up (tabulation) to store each subproblem once.",
    "Validate with a tiny case (n = 3 or 4) and trace the table or memo fills.",
  ],
  reasoning: `Dynamic programming avoids recomputation.
1. Overlapping subproblems: the same smaller case appears many times (Fibonacci, knapsack).
2. Optimal substructure: the best overall answer is built from best sub-answers.

Method
• Define state (often dp[i]).
• Recurrence linking dp[i] to earlier states.
• Base cases.
• Fill memo/table once per state.

Without memoization you repeat work; with DP each state is solved once.`,
  finalAnswer: `Dynamic programming solves problems by breaking them into overlapping subproblems, storing each result once (memoization or tabulation), and combining optimal sub-answers through a recurrence. It trades memory for time when brute force would recompute the same subcases exponentially.`,
};

type CuratedMatcher = {
  test: (normalized: string) => boolean;
  response: QuestExplanationResponse;
};

const CURATED: CuratedMatcher[] = [
  {
    test: (k) => k.includes("stack") && k.includes("heap"),
    response: STACK_HEAP,
  },
  {
    test: (k) => k.includes("big o") || k.includes("big-o") || k.includes("time complexity"),
    response: BIG_O,
  },
  {
    test: (k) => k.includes("dynamic programming") || /\bdp\b/.test(k),
    response: DYNAMIC_PROGRAMMING,
  },
];

export function normalizeQuestPromptKey(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchCuratedQuestFallback(
  prompt: string,
  mode: QuestMode
): QuestExplanationResponse | null {
  const key = normalizeQuestPromptKey(prompt);
  for (const entry of CURATED) {
    if (entry.test(key)) {
      return withMode(entry.response, mode);
    }
  }
  return null;
}

export function isComputationalQuestPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return (
    /[=+\-*/^]|solve|calculate|compute|integral|derivative|equation|factor|simplify/.test(p) ||
    /\d+\s*[+\-*/]\s*\d+/.test(p)
  );
}

export function buildConceptualQuestFallback(
  prompt: string,
  mode: QuestMode
): QuestExplanationResponse {
  const topic = prompt.trim().slice(0, 200);
  return withMode(
    {
      hints: [
        `Define the key terms in "${topic}" before comparing ideas.`,
        "List 2 or 3 properties that separate the concepts in this question.",
        "Give one concrete example that makes the distinction obvious.",
        "Review each sentence: does it follow from your definitions without mixing terms?",
      ],
      reasoning: `Work in four checkpoints for "${topic}".
1. Definitions: name each concept in plain language.
2. Comparison: state how they differ on purpose, behavior, or constraints.
3. Example: one small real case for each side.
4. Sanity check: remove any claim that contradicts your definitions.`,
      finalAnswer: `A complete answer defines each term, contrasts them on the most important axes, and supports the contrast with a concrete example. If any step uses a term before defining it, rewrite that step first.`,
    },
    mode
  );
}

export function buildComputationalQuestFallback(
  prompt: string,
  mode: QuestMode
): QuestExplanationResponse {
  const compactPrompt = prompt.trim().length > 200 ? `${prompt.trim().slice(0, 200)}...` : prompt.trim();
  return withMode(
    {
      hints: [
        `Restate the target of "${compactPrompt}" and list the givens.`,
        "Choose the governing rule, formula, or algorithm before doing arithmetic.",
        "Solve one checkpoint at a time and keep intermediate results labeled.",
        "Verify units, signs, and edge cases before stating the final result.",
      ],
      reasoning: `For "${compactPrompt}", isolate givens, select the governing method, execute step by step, then verify the final value against the original constraints.`,
      finalAnswer: `Show givens, method, each checkpoint, and a verified final result. If stuck, identify the exact checkpoint where the reasoning diverged.`,
    },
    mode
  );
}
