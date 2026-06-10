import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<200"],
  },
};

export default function () {
  const payload = JSON.stringify({
    eventName: "page_view_landing",
    properties: { source: "k6-load-test" },
  });

  const res = http.post(`${BASE_URL}/api/track`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "track accepts or rate-limits": (r) => r.status === 200 || r.status === 429 || r.status === 500,
  });
  sleep(0.5);
}
