#!/usr/bin/env bash
#
# Test environment variable loading for Virtual GM Docker setup.
# Usage: ./test-env-loading.sh [--in-container]
#
# Without --in-container: checks that .env.example and .env.docker exist and
# runs 'docker compose config' to validate Compose and env_file resolution.
# With --in-container: also runs backend container and prints selected env vars
# (requires services to be up: ./launch.sh up backend).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
err()  { echo -e "${RED}[error]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }

IN_CONTAINER=false
for arg in "$@"; do
  case "$arg" in
    --in-container) IN_CONTAINER=true ;;
    *) err "Unknown option: $arg"; exit 1 ;;
  esac
done

# 1. Required template exists
if [[ ! -f .env.example ]]; then
  err ".env.example not found. Create it from the Task 3.3 checklist."
  exit 1
fi
ok ".env.example exists"

# 2. Docker env file exists (Compose references it)
if [[ ! -f .env.docker ]]; then
  err ".env.docker not found. docker-compose.yml references it via env_file."
  exit 1
fi
ok ".env.docker exists"

# 3. Docker Compose available and config valid
COMPOSE_CMD=""
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
fi
if [[ -z "$COMPOSE_CMD" ]]; then
  warn "Docker Compose not found; skipping config validation."
else
  if $COMPOSE_CMD config -q 2>/dev/null; then
    ok "docker compose config is valid (env_file and variables resolved)"
  else
    err "docker compose config failed. Check docker-compose.yml and .env.docker."
    $COMPOSE_CMD config 2>&1 || true
    exit 1
  fi
fi

# 4. Optional: verify vars inside backend container
if [[ "$IN_CONTAINER" == true ]]; then
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q virtualgm-backend; then
    warn "Backend container not running. Start with: ./launch.sh up backend"
    exit 0
  fi
  echo ""
  echo "Environment variables in backend container (selected):"
  docker exec virtualgm-backend env 2>/dev/null | grep -E '^ENV=|^LOGURU_LEVEL=' || true
  ok "Container env check done (set OPENROUTER_API_KEY etc. in .env.docker or .env to see them in container)"
fi

echo ""
ok "Environment file loading check passed."
