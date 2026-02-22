#!/usr/bin/env bash
#
# Virtual GM – development launch script
# Usage: ./launch.sh [up|down|restart|logs|status] [service...]
# Example: ./launch.sh up backend
#
# Hot reload: backend code is mounted from ./backend; when you run an API with
# --reload (e.g. uvicorn --reload), uncomment the command in docker-compose.yml.
#
set -euo pipefail

# ---------- Configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# ---------- Colors (no-op if not a TTY) ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${BLUE}[info]${NC} $*"; }
ok()    { echo -e "${GREEN}[ok]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*"; }
bold()  { echo -e "${BOLD}$*${NC}"; }

# ---------- Docker / Compose detection ----------
detect_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return 0
  fi
  return 1
}

check_prereqs() {
  if ! command -v docker >/dev/null 2>&1; then
    err "Docker is not installed or not in PATH. Install Docker and try again."
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    err "Docker daemon is not running. Start Docker and try again."
    exit 1
  fi
  COMPOSE_CMD=$(detect_compose) || {
    err "Docker Compose not found. Install 'docker compose' (v2) or 'docker-compose' (v1)."
    exit 1
  }
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    err "docker-compose.yml not found at: $COMPOSE_FILE"
    exit 1
  fi
}

# ---------- Port conflict check ----------
check_port() {
  local port=$1
  local name=$2
  if command -v ss >/dev/null 2>&1; then
    if ss -tuln 2>/dev/null | grep -q ":$port "; then
      warn "Port $port may already be in use ($name). Start may fail or conflict."
      return 1
    fi
  elif command -v netstat >/dev/null 2>&1; then
    if netstat -tuln 2>/dev/null | grep -q "\.$port "; then
      warn "Port $port may already be in use ($name). Start may fail or conflict."
      return 1
    fi
  fi
  return 0
}

# ---------- Network (LAN) IP for “same network” devices ----------
get_lan_ip() {
  local ip
  # Linux: ip route or hostname -I
  if command -v ip >/dev/null 2>&1; then
    ip=$(ip -4 route get 1 2>/dev/null | grep -oP 'src \K[^ ]+' 2>/dev/null | head -1)
  fi
  if [[ -z "${ip:-}" ]] && command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi
  # macOS: primary interface (en0 = Wi‑Fi, en1 = Ethernet often)
  if [[ -z "${ip:-}" ]] && [[ "$(uname -s)" = Darwin ]] && command -v ipconfig >/dev/null 2>&1; then
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
  fi
  if [[ -z "${ip:-}" ]] && [[ -f /etc/hostname ]]; then
    ip=$(getent ahostsv4 "$(hostname)" 2>/dev/null | head -1 | awk '{print $1}')
  fi
  echo "$ip"
}

# ---------- Migration runner (placeholder for DB migrations) ----------
# Run after dependent services (e.g. database) are ready.
# When you add migrations (Alembic, Django, Supabase, scripts/migrate.sh), wire them here.
run_migrations() {
  local compose_cmd=$1
  bold "Database migrations (placeholder)"
  # ---- PLACEHOLDER: run migration files when present ----
  # Add checks for your migration setup and run the appropriate command.
  # Examples:
  #   - Alembic:        $compose_cmd exec -T backend alembic upgrade head
  #   - Django:         $compose_cmd exec -T backend python manage.py migrate
  #   - scripts:        ./scripts/migrate.sh
  #   - Supabase (CLI): supabase db push (or run from host after DB is up)
  #
  if [[ -f "${SCRIPT_DIR}/scripts/migrate.sh" ]]; then
    info "Running scripts/migrate.sh ..."
    if ! "${SCRIPT_DIR}/scripts/migrate.sh"; then
      err "Migration script failed. Fix the issue and run migrations manually if needed."
      warn "Example: $compose_cmd exec backend <your-migrate-command>"
      return 1
    fi
    ok "Migrations completed successfully."
    return 0
  fi
  if [[ -f "${SCRIPT_DIR}/backend/alembic.ini" ]]; then
    info "Running Alembic migrations (backend) ..."
    if ! $compose_cmd exec -T backend alembic upgrade head 2>/dev/null; then
      err "Alembic migration failed. Fix the issue and run: $compose_cmd exec backend alembic upgrade head"
      return 1
    fi
    ok "Migrations completed successfully."
    return 0
  fi
  # No migration setup detected – skip silently so colleagues aren’t confused
  info "No migration files or scripts found (scripts/migrate.sh, backend/alembic.ini, etc.). Skipping."
  return 0
}

# ---------- Status and URL display ----------
show_status_and_urls() {
  local compose_cmd=$1
  local lan_ip
  lan_ip=$(get_lan_ip)

  bold "Service status and URLs"
  echo ""
  echo -e "  ${CYAN}Local (this machine):${NC}"
  echo "    Backend (API):  http://localhost:${BACKEND_PORT}"
  echo "    Frontend (dev): http://localhost:${FRONTEND_PORT}  (run: cd frontend && npm run dev)"
  echo ""
  if [[ -n "$lan_ip" ]]; then
    echo -e "  ${CYAN}On your local network (other devices, same Wi‑Fi/LAN):${NC}"
    echo "    Backend:  http://${lan_ip}:${BACKEND_PORT}"
    echo "    Frontend: http://${lan_ip}:${FRONTEND_PORT}"
    echo ""
    echo "  Use the above URLs from phones/tablets or other PCs on the same network."
  else
    echo -e "  ${YELLOW}Network URL: Could not detect LAN IP.${NC}"
    echo "  On other devices use: http://<this-machine-IP>:${BACKEND_PORT} and :${FRONTEND_PORT}"
    echo "  Find IP: ip addr (Linux) or ipconfig (Windows/macOS)."
    echo ""
  fi
  echo -e "  ${CYAN}Logs:${NC} $0 logs [service]"
  echo ""
  if $compose_cmd ps 2>/dev/null | grep -q Up; then
    $compose_cmd ps
  fi
}

# ---------- Commands ----------
cmd_up() {
  local services=("$@")
  check_prereqs
  check_port $BACKEND_PORT "backend"
  check_port $FRONTEND_PORT "frontend"
  local compose_cmd=$COMPOSE_CMD
  if [[ ${#services[@]} -eq 0 ]]; then
    info "Building and starting all services..."
    $compose_cmd -f "$COMPOSE_FILE" up -d --build
  else
    info "Building and starting: ${services[*]}"
    $compose_cmd -f "$COMPOSE_FILE" up -d --build "${services[@]}"
  fi
  info "Waiting for containers to be ready..."
  # When docker-compose healthcheck is defined, consider polling until healthy (e.g. docker compose ps --format json).
  sleep 3
  # Run migrations when present (placeholder section)
  if ! run_migrations "$compose_cmd"; then
    warn "Migrations did not run successfully. See above. Continuing."
  fi
  echo ""
  show_status_and_urls "$compose_cmd"
}

cmd_down() {
  check_prereqs
  local services=("$@")
  if [[ ${#services[@]} -eq 0 ]]; then
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    ok "All services stopped."
  else
    $COMPOSE_CMD -f "$COMPOSE_FILE" stop "${services[@]}"
    ok "Stopped: ${services[*]}"
  fi
}

cmd_restart() {
  local services=("$@")
  [[ ${#services[@]} -eq 0 ]] && services=(backend)
  cmd_down "${services[@]}"
  cmd_up "${services[@]}"
}

cmd_logs() {
  check_prereqs
  if [[ $# -gt 0 ]]; then
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f "$@"
  else
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f
  fi
}

cmd_status() {
  check_prereqs
  show_status_and_urls "$COMPOSE_CMD"
  echo ""
  $COMPOSE_CMD -f "$COMPOSE_FILE" ps
}

# ---------- Main ----------
main() {
  local cmd="${1:-up}"
  shift || true
  case "$cmd" in
    up)     cmd_up "$@" ;;
    down)   cmd_down "$@" ;;
    restart) cmd_restart "$@" ;;
    logs)   cmd_logs "$@" ;;
    status) cmd_status "$@" ;;
    *)
      err "Unknown command: $cmd"
      echo "Usage: $0 {up|down|restart|logs|status} [service...]"
      echo "  up       Start services (build if needed). Optional: service names."
      echo "  down     Stop services."
      echo "  restart  Restart services (default: backend)."
      echo "  logs     Stream logs (all or specified service)."
      echo "  status   Show status and URLs (local + network)."
      exit 1
      ;;
  esac
}

main "$@"
