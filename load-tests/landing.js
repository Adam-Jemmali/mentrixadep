import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

/** Requires BASE_URL pointing at a deployed environment (landing page is public). */
export const options = {
  vus: 30,
  duration: "45s",
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    "landing status 200": (r) => r.status === 200,
  });
  sleep(1);
}
