import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const startDuration = new Trend("guest_diagnostic_start_duration", true);

/**
 * Simulates concurrent guest try diagnostic session starts.
 * Expect flat p95 when item_bank step_sequence pool is seeded — one read, cookie write only.
 *
 * Usage: k6 run -e BASE_URL=https://mentrixa.one load-tests/guest-diagnostic.js
 */
export const options = {
  scenarios: {
    guest_spike: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 50),
      duration: __ENV.DURATION || "60s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    guest_diagnostic_start_duration: ["p(95)<800"],
  },
};

export default function () {
  const res = http.post(
    `${BASE_URL}/api/guest-diagnostic/start`,
    JSON.stringify({}),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "guest_diagnostic_start" },
    },
  );

  startDuration.add(res.timings.duration);

  check(res, {
    "start status 200 or 503": (r) => r.status === 200 || r.status === 503,
    "start has success field": (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.success === "boolean";
      } catch {
        return false;
      }
    },
    "session cookie on success": (r) =>
      r.status !== 200 || (r.headers["Set-Cookie"] ?? "").includes("guest_try_diagnostic"),
  });

  sleep(0.5);
}
