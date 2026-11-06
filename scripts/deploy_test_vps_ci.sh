#!/usr/bin/env bash
# CI: sync Zorvia frontend → test VPS and rebuild frontend container.
# Never uploads API secrets. Compose lives under /opt/mealhq-test/api/deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE_ROOT="${FE_ROOT:-${ROOT}/frontend}"
VPS_HOST="${VPS_HOST:-178.92.120.191}"
VPS_USER="${VPS_USER:-root}"
VPS_BASE="${VPS_BASE:-/opt/mealhq-test}"
REMOTE="${VPS_USER}@${VPS_HOST}"

if [[ ! -d "${FE_ROOT}" ]]; then
  echo "Frontend root not found: ${FE_ROOT}" >&2
  exit 1
fi

if [[ -n "${SSH_AUTH_SOCK:-}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new)
  RSYNC_SSH="ssh ${SSH_OPTS[*]}"
elif [[ -n "${SSH_KEY:-}" && -f "${SSH_KEY}" ]]; then
  SSH_OPTS=(-i "${SSH_KEY}" -o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new)
  RSYNC_SSH="ssh -i ${SSH_KEY} -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
else
  echo "Set SSH_AUTH_SOCK (ssh-agent) or SSH_KEY" >&2
  exit 1
fi

ssh_cmd() {
  ssh "${SSH_OPTS[@]}" "${REMOTE}" "$@"
}

echo "Ensuring remote dirs ..."
ssh_cmd "mkdir -p '${VPS_BASE}/web' '${VPS_BASE}/api/deploy'"

# Build-time public env for Next (BACKEND + optional Firebase from CI env)
{
  echo "BACKEND_URL=https://api-test.mealhq.ca"
  echo "NEXT_PUBLIC_BACKEND_URL=https://api-test.mealhq.ca"
  [[ -n "${NEXT_PUBLIC_FIREBASE_API_KEY:-}" ]] && echo "NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}"
  [[ -n "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" ]] && echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}"
  [[ -n "${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}" ]] && echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}"
  [[ -n "${NEXT_PUBLIC_FIREBASE_APP_ID:-}" ]] && echo "NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}"
} >/tmp/mealhq-fe.env.production

echo "Syncing frontend → ${REMOTE}:${VPS_BASE}/web/ ..."
rsync -avz \
  -e "${RSYNC_SSH}" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'test_reports' \
  "${FE_ROOT}/" "${REMOTE}:${VPS_BASE}/web/"

scp "${SSH_OPTS[@]}" /tmp/mealhq-fe.env.production "${REMOTE}:${VPS_BASE}/web/.env.production"
rm -f /tmp/mealhq-fe.env.production

echo "Rebuild frontend on test VPS ..."
ssh_cmd bash -s <<EOF
set -euo pipefail
cd "${VPS_BASE}/api/deploy"
if [[ ! -f docker-compose.test.yml ]]; then
  echo "Missing docker-compose.test.yml — deploy API repo to test VPS first" >&2
  exit 1
fi
docker compose -f docker-compose.test.yml up -d --build frontend
echo "Waiting for frontend ..."
for i in \$(seq 1 60); do
  CODE=\$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3050/ || true)
  if [[ "\$CODE" == "200" || "\$CODE" == "307" || "\$CODE" == "308" ]]; then
    echo "Frontend OK HTTP \$CODE"
    docker compose -f docker-compose.test.yml ps
    exit 0
  fi
  sleep 5
done
echo "Frontend health failed" >&2
docker logs mealhq-test-frontend --tail 80 2>/dev/null || true
exit 1
EOF

echo "Test frontend deploy OK"
