import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import ws from "k6/ws";
import { resolveProfile } from "./profiles.js";

/**
 * Arena board load: GET /arena + optional Realtime subscribe.
 *
 * Full target (PROFILE=full): 200 VUs, 5m, p95 first event < 1s.
 * CI default (PROFILE=smoke): 8 VUs, 45s — valuable without melting Hobby.
 *
 * Optional Realtime:
 *   SUPABASE_URL + SUPABASE_ANON_KEY
 * Without them, only HTTP arena TTFB is measured (still the SSR bottleneck).
 *
 * Usage:
 *   k6 run load-tests/arena-board.js
 *   k6 run -e PROFILE=full -e BASE_URL=https://staging… load-tests/arena-board.js
 */

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = (__ENV.SUPABASE_URL || __ENV.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY =
  __ENV.SUPABASE_ANON_KEY || __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const profile = resolveProfile("arena");
const firstEvent = new Trend("arena_time_to_first_event", true);

export const options = {
  scenarios: {
    arena_board: {
      executor: "constant-vus",
      vus: profile.vus,
      duration: profile.duration,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    arena_time_to_first_event: [`p(95)<${profile.p95Ms}`],
  },
  tags: { profile: profile.name },
};

function measureArenaHttp() {
  const started = Date.now();
  const res = http.get(`${BASE_URL}/arena`, {
    tags: { name: "arena_get" },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirects: 5,
    // Vercel Attack Challenge Mode returns 403 to non-browser clients — not an app outage.
    responseCallback: http.expectedStatuses(200, 301, 302, 303, 307, 308, 403),
  });
  const elapsed = Date.now() - started;
  firstEvent.add(elapsed);

  const body = typeof res.body === "string" ? res.body : "";
  const botChallenged =
    res.status === 403 &&
    (body.includes("vercel") || body.includes("Challenge") || body.includes("Security Checkpoint"));
  const okStatus = (res.status >= 200 && res.status < 400) || botChallenged;
  const hasMarkup =
    botChallenged ||
    body.includes("Live") ||
    body.includes("Arena") ||
    body.includes("arena") ||
    body.includes("feed");

  check(res, {
    "arena status ok or bot challenge": () => okStatus,
    "arena has board markup or bot challenge": () => hasMarkup,
  });

  return elapsed;
}

function tryRealtimeSubscribe(timeoutMs = 800) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;

  const started = Date.now();
  const url = `${SUPABASE_URL.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}&vsn=1.0.0`;

  let gotEvent = false;
  const result = ws.connect(url, { tags: { name: "arena_realtime" } }, (socket) => {
    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          topic: "realtime:public:live_board_events",
          event: "phx_join",
          payload: {
            config: {
              postgres_changes: [
                {
                  event: "*",
                  schema: "public",
                  table: "live_board_events",
                },
              ],
            },
          },
          ref: "1",
        }),
      );
    });

    socket.on("message", (msg) => {
      if (typeof msg === "string" && msg.includes("postgres_changes")) {
        gotEvent = true;
        firstEvent.add(Date.now() - started);
        socket.close();
      }
    });

    socket.setTimeout(() => {
      socket.close();
    }, timeoutMs);
  });

  check(result, {
    "realtime connect attempted": (r) => r && r.status === 101,
  });

  return gotEvent;
}

export default function () {
  measureArenaHttp();
  // Best-effort Realtime. Do not fail the run if the channel is quiet.
  tryRealtimeSubscribe(600);
  sleep(1);
}
