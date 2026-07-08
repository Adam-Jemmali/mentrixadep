#!/usr/bin/env bash
# Ping a Mentrixa cron route from GitHub Actions (Bearer + x-cron-secret + optional HMAC).
set -euo pipefail

CRON_PATH="${1:?Usage: github-cron-ping.sh /api/cron/your-job}"
BASE_URL="${PLAYWRIGHT_BASE_URL:-https://mentrixa.one}"

if [ -z "${CRON_SECRET:-}" ]; then
  echo "CRON_SECRET is not set — add it under repository secrets."
  exit 1
fi

CRON_SECRET="$(printf '%s' "${CRON_SECRET}" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
URL="${BASE_URL%/}${CRON_PATH}"
TS="$(($(date +%s) * 1000))"
PAYLOAD="${TS}.GET.${CRON_PATH}"
SIG="$(printf '%s' "${PAYLOAD}" | openssl dgst -sha256 -hmac "${CRON_SECRET}" | awk '{print $2}')"

echo "Pinging ${URL}"
headers=$(mktemp)
code=$(curl -sS -L --max-redirs 5 -D "${headers}" -o /tmp/cron-body.txt -w "%{http_code}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "x-cron-timestamp: ${TS}" \
  -H "x-cron-signature: ${SIG}" \
  "${URL}")

echo "HTTP ${code}"
if [ "${code}" = "307" ] || [ "${code}" = "302" ] || [ "${code}" = "301" ]; then
  echo "Redirect location:"
  grep -i '^location:' "${headers}" || true
  echo "Cron routes must bypass session middleware — deploy latest main and retry."
fi
cat /tmp/cron-body.txt
echo ""

if [ "${code}" = "401" ]; then
  echo "Cron auth failed on ${BASE_URL}."
  echo "Ensure GitHub secret CRON_SECRET matches Vercel production CRON_SECRET, then re-run."
  exit 1
fi

test "${code}" -ge 200 && test "${code}" -lt 300
