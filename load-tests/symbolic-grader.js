import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { resolveProfile } from "./profiles.js";

/**
 * Symbolic grader load: POST grade-expression edge function.
 *
 * Full target (PROFILE=full): 50 VUs, 3m, p95 < 2s.
 * CI default (PROFILE=smoke): 5 VUs, 30s.
 *
 * Requires:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *
 * Mix of correct and incorrect expressions — no AI, mathjs only.
 *
 * Usage:
 *   k6 run -e SUPABASE_URL=… -e SUPABASE_ANON_KEY=… load-tests/symbolic-grader.js
 *   k6 run -e PROFILE=full … load-tests/symbolic-grader.js
 */

const SUPABASE_URL = (
  __ENV.SUPABASE_URL ||
  __ENV.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).replace(/\/$/, "");
const SUPABASE_ANON_KEY =
  __ENV.SUPABASE_ANON_KEY || __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const profile = resolveProfile("symbolic");
const gradeDuration = new Trend("symbolic_grade_duration", true);

const CASES = [
  { student_expression: "2*x", correct_expression: "2*x", expectOk: true },
  { student_expression: "x+x", correct_expression: "2*x", expectOk: true },
  { student_expression: "3*x", correct_expression: "2*x", expectOk: true },
  { student_expression: "x^2", correct_expression: "x**2", expectOk: true },
  { student_expression: "sin(x)", correct_expression: "cos(x)", expectOk: true },
];

export const options = {
  scenarios: {
    symbolic_grader: {
      executor: "constant-vus",
      vus: profile.vus,
      duration: profile.duration,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.1"],
    symbolic_grade_duration: [`p(95)<${profile.p95Ms}`],
  },
  tags: { profile: profile.name },
};

export function setup() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "[symbolic-grader] Missing SUPABASE_URL / SUPABASE_ANON_KEY — checks will soft-skip.",
    );
  }
  return { ready: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) };
}

export default function (data) {
  if (!data.ready) {
    sleep(1);
    return;
  }

  const sample = CASES[Math.floor(Math.random() * CASES.length)];
  const url = `${SUPABASE_URL}/functions/v1/grade-expression`;
  const payload = JSON.stringify({
    student_expression: sample.student_expression,
    correct_expression: sample.correct_expression,
    variables: { x: { min: -2, max: 2 } },
  });

  const res = http.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    tags: { name: "grade_expression" },
  });

  gradeDuration.add(res.timings.duration);

  check(res, {
    "grade status 200": (r) => r.status === 200,
    "grade body ok": (r) => {
      try {
        const body = JSON.parse(String(r.body || "{}"));
        return body.ok === true && typeof body.equivalent === "boolean";
      } catch {
        return false;
      }
    },
  });

  sleep(0.4);
}
