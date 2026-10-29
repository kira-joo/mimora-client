#!/usr/bin/env bash
#
# The configuration proof (Phase 7 §1, CLAUDE.md "Verification"): seed one fixture merchant into a
# fresh backend, build THIS storefront against it, and run the funnel, accessibility and viewport
# gates. CI runs it once per fixture; it runs the same way on a laptop, which is the point — a gate
# that only exists in YAML cannot be reproduced when it fails.
#
#   scripts/ci/configuration-proof.sh store-a|store-b
#
# Env:
#   BACKEND_DIR      a checkout of store-platform-staff (default ../store-platform-staff)
#   STOREFRONT_DIR   this repository (default: the script's repo)
#   BACKEND_PORT / STOREFRONT_PORT   defaults 3140 / 3130 — NOT the dev ports, so it never collides
#   SKIP_BUILD=1     reuse existing production builds in both directories
#   GATES            default "funnel a11y viewports"
#
# Both apps are built and served in PRODUCTION mode. Locally, point BACKEND_DIR and STOREFRONT_DIR
# at clones (`cp -c -R`), because `next build` replaces .next under any dev server running there.
#
# STORE_ID is the fixture's name (store-a | store-b): it is adopted into the fresh database before the backend starts and
# exported to the backend and the storefront alike, so the storefront's identity check passes only against its own store.
#
# Secrets are generated per run and never printed. The fixture database is dropped first, so every
# run starts from the same state; the seeder refuses any database not named store-fixture-*.
set -euo pipefail

STORE="${1:?usage: configuration-proof.sh store-a|store-b}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STOREFRONT_DIR="${STOREFRONT_DIR:-$(cd "$HERE/../.." && pwd)}"
BACKEND_DIR="${BACKEND_DIR:-$(cd "$STOREFRONT_DIR/../store-platform-staff" && pwd)}"
BACKEND_PORT="${BACKEND_PORT:-3140}"
STOREFRONT_PORT="${STOREFRONT_PORT:-3130}"
GATES="${GATES:-funnel a11y viewports}"
WORK="$(mktemp -d)"
DB="store-fixture-${STORE#store-}"

step() { printf '\n── %s\n' "$*"; }
pids=()
cleanup() {
  # Logs leave with the run even when it stopped early — that is when they are needed.
  if [ -n "${ARTIFACT_DIR:-}" ]; then mkdir -p "$ARTIFACT_DIR" && cp "$WORK"/*.log "$WORK"/*.json "$ARTIFACT_DIR"/ 2>/dev/null || true; fi
  for pid in "${pids[@]:-}"; do [ -n "$pid" ] && kill -TERM -- "-$pid" 2>/dev/null || true; done
  rm -rf "$WORK"
}
trap cleanup EXIT

# Refuse ports that are already served: a stale server answering here is exactly how this
# workspace once measured the wrong build (docs/tasks/ws).
for port in "$BACKEND_PORT" "$STOREFRONT_PORT"; do
  if lsof -ti:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $port is already served — refusing to test whatever is there" >&2; exit 1; fi
done

secret() { openssl rand -base64 48 | tr -d '\n'; }
export STAFF_JWT_SECRET="${STAFF_JWT_SECRET:-$(secret)}"
export CUSTOMER_JWT_SECRET="${CUSTOMER_JWT_SECRET:-$(secret)}"
export REVALIDATE_SECRET="${REVALIDATE_SECRET:-$(secret)}"
export OWNER_EMAIL="owner@${DB}.local"
export OWNER_PASSWORD="${OWNER_PASSWORD:-$(openssl rand -base64 24 | tr -d '\n')}"
# The fixture merchants' countries: Hirfa trades in Egypt, Qahwa & Co in Saudi Arabia.
case "$STORE" in
  store-b) export STORE_TIMEZONE="${STORE_TIMEZONE:-Asia/Riyadh}" STORE_PHONE_COUNTRY_CODE="${STORE_PHONE_COUNTRY_CODE:-966}" ;;
  *)       export STORE_TIMEZONE="${STORE_TIMEZONE:-Africa/Cairo}" STORE_PHONE_COUNTRY_CODE="${STORE_PHONE_COUNTRY_CODE:-20}" ;;
esac
export MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27020/?replicaSet=rs0&directConnection=true}"
export MONGODB_DB="$DB"
# The store's identity: the backend refuses to start against a database that is not marked as this store, and the
# storefront refuses a backend that answers as another. Both processes get the same value (store-a | store-b).
export STORE_ID="$STORE"

step "database: replica set up, $DB dropped"
# The project name is pinned: a clone in another directory would otherwise derive a different
# project and collide with the existing container's fixed name.
dc() { docker compose -p store-platform-staff -f "$BACKEND_DIR/docker-compose.yml" "$@"; }
dc up -d --wait mongodb >/dev/null
dc up mongodb-init >/dev/null 2>&1 || true   # rs.initiate fails harmlessly once initiated
primary=0
for _ in $(seq 1 60); do
  if dc exec -T mongodb mongosh --quiet --eval 'rs.status().myState' 2>/dev/null | grep -q '^1$'; then primary=1; break; fi
  sleep 2
done
[ "$primary" = 1 ] || { echo "the replica set never elected a primary" >&2; exit 1; }
dc exec -T mongodb mongosh --quiet "$DB" --eval 'db.dropDatabase()' >/dev/null

step "identity: adopt $STORE as the identity of $DB"
# A fresh database carries no identity marker, and the backend will not boot without one. Adoption is the one explicit,
# out-of-band act that writes it (MONGODB_URI and MONGODB_DB are exported above); it must precede the backend's start.
( cd "$BACKEND_DIR" && node scripts/admin/adopt-store-identity.mjs --store-id "$STORE" --confirm-db "$DB" ) \
  || { echo "adopting the store identity failed" >&2; exit 1; }

wait_for() { # url, log, label
  for _ in $(seq 1 120); do curl -s -o /dev/null -m 30 "$1" && return 0; sleep 1; done
  echo "$3 did not come up; last log lines:" >&2; tail -30 "$2" >&2; exit 1
}
serve() { # dir, port, log — production server in its own session, so cleanup can stop the group
  # `cd` is NOT chained with `&&`: `a && b &` backgrounds the whole list, so `$!` would be an
  # intermediate subshell, not the session leader, and the group kill would miss the server
  # (measured 2026-10-21: both servers outlived the run and the next fixture refused their ports).
  ( cd "$1" || exit 1; nohup python3 -c 'import os,sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])' npx next start --port "$2" > "$3" 2>&1 & echo $! > "$WORK/pid" )
  pids+=("$(cat "$WORK/pid")")
}

step "backend: production build and start on :$BACKEND_PORT"
export STOREFRONT_REVALIDATE_URL="http://localhost:$STOREFRONT_PORT/api/revalidate"
[ "${SKIP_BUILD:-}" = 1 ] || ( cd "$BACKEND_DIR" && rm -rf .next && npm run build > "$WORK/backend-build.log" 2>&1 ) || { tail -40 "$WORK/backend-build.log"; exit 1; }
serve "$BACKEND_DIR" "$BACKEND_PORT" "$WORK/backend.log"
wait_for "http://localhost:$BACKEND_PORT/api/storefront/store-profile" "$WORK/backend.log" backend

step "fixture: seed $STORE"
( cd "$BACKEND_DIR" && BACKEND_URL="http://localhost:$BACKEND_PORT" FIXTURE_MANIFEST_OUT="$WORK/manifest.json" node scripts/fixtures/seed-store.mjs --store "$STORE" > "$WORK/seed.log" 2>&1 ) \
  || { tail -30 "$WORK/seed.log"; exit 1; }
grep -E '^FIXTURE_MANIFEST' "$WORK/seed.log" | cut -c1-200

step "storefront: production build against $STORE, start on :$STOREFRONT_PORT"
export STAFF_API_URL="http://localhost:$BACKEND_PORT" SITE_URL="http://localhost:$STOREFRONT_PORT"
# A clean .next, always: Next's fetch cache (.next/cache) is keyed by URL, and every fixture's backend
# answers on the same URL — a build reusing it served the PREVIOUS store's settings (measured
# 2026-10-22: store-a's checkout offered store-b's bank transfer and hid its guest checkout).
[ "${SKIP_BUILD:-}" = 1 ] || ( cd "$STOREFRONT_DIR" && rm -rf .next && npm run build > "$WORK/storefront-build.log" 2>&1 ) || { tail -40 "$WORK/storefront-build.log"; exit 1; }
serve "$STOREFRONT_DIR" "$STOREFRONT_PORT" "$WORK/storefront.log"
wait_for "http://localhost:$STOREFRONT_PORT/ar" "$WORK/storefront.log" storefront
if grep -q '\[config\]' "$WORK/storefront.log"; then echo "storefront announced a configuration gap:" >&2; grep '\[config\]' "$WORK/storefront.log" >&2; exit 1; fi

failed=0
for gate in $GATES; do
  step "gate: $gate ($STORE)"
  ( cd "$STOREFRONT_DIR" && BACKEND_URL="http://localhost:$BACKEND_PORT" FIXTURE_MANIFEST="$WORK/manifest.json" \
      node "scripts/qa/$gate.mjs" "http://localhost:$STOREFRONT_PORT" ) || failed=1
done

step "configuration proof for $STORE: $([ $failed = 0 ] && echo PASSED || echo FAILED)"
exit $failed
