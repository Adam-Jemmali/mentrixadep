/**
 * PROMPT P#013: Symbolic free-response grading — mathjs only, no AI, no string match.
 * Deploy: supabase functions deploy grade-expression
 */
import {
  gradeExpressions,
  type GradingVariables,
  type SymbolicGradeRequest,
} from "../_shared/symbolic-grade-pure.ts";

declare const Deno: { serve(handler: (req: Request) => Promise<Response> | Response): void };

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function parseVariables(raw: unknown): GradingVariables {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const variables: GradingVariables = {};
  for (const [name, constraint] of Object.entries(raw as Record<string, unknown>)) {
    if (!constraint || typeof constraint !== "object" || Array.isArray(constraint)) continue;
    const row = constraint as Record<string, unknown>;
    variables[name] = {
      min: typeof row.min === "number" ? row.min : undefined,
      max: typeof row.max === "number" ? row.max : undefined,
    };
  }
  return variables;
}

function parseRequest(body: unknown): SymbolicGradeRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  const student = typeof row.student_expression === "string" ? row.student_expression : "";
  const correct = typeof row.correct_expression === "string" ? row.correct_expression : "";
  if (!student.trim() || !correct.trim()) return null;
  return {
    student_expression: student,
    correct_expression: correct,
    variables: parseVariables(row.variables),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const parsed = parseRequest(body);
  if (!parsed) {
    return jsonResponse({ ok: false, error: "student_expression and correct_expression required" }, 400);
  }

  const result = gradeExpressions(parsed);
  return jsonResponse({ ok: true, ...result });
});
