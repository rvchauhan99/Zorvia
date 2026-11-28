#!/usr/bin/env bash
# CI: sync Zorvia frontend + admin → test VPS and rebuild those containers.
# Never uploads API secrets. Compose lives under /opt/mealhq-test/api/deploy.
# Target: 178.92.120.191:22 (TEST only — not production / Vercel main).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE_ROOT="${FE_ROOT:-${ROOT}/frontend}"
ADMIN_ROOT="${ADMIN_ROOT:-${ROOT}/admin-frontend}"
VPS_HOST="${VPS_HOST:-178.92.120.191}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
VPS_USER="${VPS_USER:-root}"
VPS_BASE="${VPS_BASE:-/opt/mealhq-test}"
REMOTE="${VPS_USER}@${VPS_HOST}"

if [[ ! -d "${FE_ROOT}" ]]; then
  echo "Frontend root not found: ${FE_ROOT}" >&2
  exit 1
fi
if [[ ! -d "${ADMIN_ROOT}" ]]; then
  echo "Admin root not found: ${ADMIN_ROOT}" >&2
  exit 1
fi

if [[ -n "${SSH_AUTH_SOCK:-}" ]]; then
  SSH_OPTS=(-p "${VPS_SSH_PORT}" -o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new)
  SCP_OPTS=(-P "${VPS_SSH_PORT}" -o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new)
  RSYNC_SSH="ssh -p ${VPS_SSH_PORT} -o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new"
elif [[ -n "${SSH_KEY:-}" && -f "${SSH_KEY}" ]]; then
  SSH_OPTS=(-p "${VPS_SSH_PORT}" -i "${SSH_KEY}" -o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new)
  SCP_OPTS=(-P "${VPS_SSH_PORT}" -i "${SSH_KEY}" -o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new)
  RSYNC_SSH="ssh -p ${VPS_SSH_PORT} -i ${SSH_KEY} -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
else
  echo "Set SSH_AUTH_SOCK (ssh-agent) or SSH_KEY" >&2
  exit 1
fi

ssh_cmd() {
  ssh "${SSH_OPTS[@]}" "${REMOTE}" "$@"
}

echo "Ensuring remote dirs ..."
ssh_cmd "mkdir -p '${VPS_BASE}/web' '${VPS_BASE}/admin' '${VPS_BASE}/api/deploy'"

# Browser uses same-origin /api on test.mealhq.ca (Next rewrite → api container).
{
  echo "BACKEND_URL=https://test.mealhq.ca"
  echo "NEXT_PUBLIC_BACKEND_URL=https://test.mealhq.ca"
  [[ -n "${NEXT_PUBLIC_FIREBASE_API_KEY:-}" ]] && echo "NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}"
  [[ -n "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" ]] && echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}"
  [[ -n "${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}" ]] && echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}"
  [[ -n "${NEXT_PUBLIC_FIREBASE_APP_ID:-}" ]] && echo "NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}"
} >/tmp/mealhq-fe.env.production

RSYNC_EXCLUDES=(
  --exclude '.git'
  --exclude 'node_modules'
  --exclude '.next'
  --exclude '.env'
  --exclude '.env.*'
  --exclude 'test_reports'
  --exclude 'coverage'
  --exclude '*.md'
  --exclude '.DS_Store'
)

echo "Syncing frontend → ${REMOTE}:${VPS_BASE}/web/ ..."
rsync -avz -e "${RSYNC_SSH}" "${RSYNC_EXCLUDES[@]}" "${FE_ROOT}/" "${REMOTE}:${VPS_BASE}/web/"
scp "${SCP_OPTS[@]}" /tmp/mealhq-fe.env.production "${REMOTE}:${VPS_BASE}/web/.env.production"
rm -f /tmp/mealhq-fe.env.production

echo "Syncing admin → ${REMOTE}:${VPS_BASE}/admin/ ..."
rsync -avz -e "${RSYNC_SSH}" "${RSYNC_EXCLUDES[@]}" "${ADMIN_ROOT}/" "${REMOTE}:${VPS_BASE}/admin/"

echo "Rebuild frontend + admin on test VPS ..."
ssh_cmd bash -s <<EOF
set -euo pipefail
cd "${VPS_BASE}/api/deploy"
if [[ ! -f docker-compose.test.yml ]]; then
  echo "Missing docker-compose.test.yml — deploy API repo to test VPS first" >&2
  exit 1
fi
docker compose -f docker-compose.test.yml up -d --build frontend admin
echo "Waiting for frontend + admin ..."
ok_fe=0
ok_admin=0
for i in \$(seq 1 120); do
  CODE_FE=\$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3050/ || true)
  CODE_AD=\$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3051/ || true)
  if [[ "\$CODE_FE" == "200" || "\$CODE_FE" == "307" || "\$CODE_FE" == "308" ]]; then ok_fe=1; fi
  if [[ "\$CODE_AD" == "200" || "\$CODE_AD" == "307" || "\$CODE_AD" == "308" ]]; then ok_admin=1; fi
  if [[ "\$ok_fe" == "1" && "\$ok_admin" == "1" ]]; then
    echo "Frontend OK HTTP \$CODE_FE · Admin OK HTTP \$CODE_AD"
    docker compose -f docker-compose.test.yml ps
    exit 0
  fi
  sleep 5
done
echo "UI health failed fe=\$CODE_FE admin=\$CODE_AD" >&2
docker logs mealhq-test-frontend --tail 80 2>/dev/null || true
docker logs mealhq-test-admin --tail 80 2>/dev/null || true
exit 1
EOF

echo "Test frontend + admin deploy OK"
