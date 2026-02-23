#!/usr/bin/env bash
#
# Virtual GM – development launch script
# Usage: ./launch.sh [--wsl] [up|down|restart|logs|status] [service...]
#
#   ./launch.sh up          Start everything: backend (Docker) + frontend (npm run dev)
#   ./launch.sh up backend  Start only backend (Docker)
#   ./launch.sh down        Stop backend and frontend (if started by this script)
#   ./launch.sh --wsl up    Same as up, plus run PowerShell to allow mobile devices (WSL2 port forwarding + firewall)
#   ./launch.sh restart     Restart backend (and optionally frontend)
#   ./launch.sh logs        Docker logs
#   ./launch.sh status      Show URLs and status
#
# Hot reload: backend code is mounted from ./backend; frontend runs locally for HMR.
#
set -euo pipefail

# ---------- Configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
FRONTEND_PID_FILE="${SCRIPT_DIR}/.launch-frontend.pid"
WSL_NETWORK_SCRIPT="${SCRIPT_DIR}/scripts/wsl-network-access.ps1"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Set to 1 when --wsl is passed; then we run PowerShell for port forwarding + firewall (mobile access)
LAUNCH_WSL=0

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
# Returns 0 if port is in use, 1 if free
port_is_in_use() {
  local port=$1
  if command -v ss >/dev/null 2>&1; then
    ss -tuln 2>/dev/null | grep -q ":$port " && return 0
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tuln 2>/dev/null | grep -q "\.$port " && return 0
  fi
  return 1
}

# Wait until port is free or timeout (sec). Print when fully stopped. Return 0 when free, 1 on timeout.
wait_until_port_free() {
  local port=$1
  local name=$2
  local max_sec=${3:-15}
  local waited=0
  while port_is_in_use "$port"; do
    [[ $waited -ge $max_sec ]] && break
    sleep 1
    waited=$((waited + 1))
  done
  if ! port_is_in_use "$port"; then
    ok "$name fully stopped (port $port free)."
    return 0
  fi
  warn "$name: port $port still in use after ${max_sec}s. You may need to free it manually."
  return 1
}

# Optional third arg: PID to ignore (e.g. our managed frontend). If port is in use only by this PID, do not warn.
check_port() {
  local port=$1
  local name=$2
  local ignore_pid="${3:-}"
  if ! port_is_in_use "$port"; then
    return 0
  fi
  # Port is in use: suppress warning if it's our managed process
  if [[ -n "$ignore_pid" ]] && [[ "$ignore_pid" =~ ^[0-9]+$ ]]; then
    local pids_on_port
    if command -v fuser >/dev/null 2>&1; then
      pids_on_port=$(fuser "$port/tcp" 2>/dev/null | tr -cd '0-9 \n' | xargs)
    elif command -v lsof >/dev/null 2>&1; then
      pids_on_port=$(lsof -ti ":$port" 2>/dev/null | xargs)
    fi
    if [[ -n "$pids_on_port" ]] && echo " $pids_on_port " | grep -q " $ignore_pid "; then
      return 0
    fi
  fi
  warn "Port $port may already be in use ($name). Run ./launch.sh down to stop existing services, or free the port."
  return 1
}

# ---------- Network (LAN) IP for “same network” devices ----------
# Detect WSL2: from a phone/tablet you must use the Windows host IP, not WSL’s 172.x.
is_wsl2() {
  [[ -r /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null
}

# In WSL2, get the real Windows LAN IP (Wi‑Fi/Ethernet) so phones/tablets can reach the dev servers.
# Same approach as babelfish/rekindle. Do not use 172.17–31.x (WSL) or 10.255.x.
# 1) ipconfig.exe: extract IPv4 only (handles "192.168.1.5(Preferred)" etc.), one per line, then prioritize
# 2) PowerShell Get-NetIPAddress (more reliable on some setups)
# 3) resolv.conf nameserver only if it looks like a LAN IP (rekindle fallback)
get_windows_host_ip() {
  local ip=""
  # Method 1: ipconfig.exe — extract only the four-octet IP so "(Preferred)" etc. don't break parsing.
  # Use tr '\n' ' ' so multiple IPs stay space-separated (tr -d '\r\n' would concatenate "1.5"+"10.0").
  if command -v ipconfig.exe &>/dev/null; then
    local all_ips
    all_ips=$(ipconfig.exe 2>/dev/null | grep -i "IPv4" | sed 's/.*: *//' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | tr '\n' ' ' | xargs)
    ip=$(echo "$all_ips" | tr ' ' '\n' | grep -E "^192\.168\." | head -1)
    if [[ -z "$ip" ]]; then
      ip=$(echo "$all_ips" | tr ' ' '\n' | grep -E "^10\." | grep -v "^10\.255\." | head -1)
    fi
    if [[ -z "$ip" ]]; then
      ip=$(echo "$all_ips" | tr ' ' '\n' | grep -v "^127\." | grep -vE '^172\.(1[7-9]|2[0-9]|3[0-1])\.' | head -1)
    fi
    if [[ -n "$ip" ]] && [[ "$ip" != "127.0.0.1" ]] && [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "$ip"
      return
    fi
  fi
  # Method 2: PowerShell (same as babelfish/rekindle — more reliable on some Windows/WSL setups)
  if command -v powershell.exe &>/dev/null; then
    ip=$(powershell.exe -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { (\$_.InterfaceAlias -match 'Wi-Fi|Ethernet') -and (\$_.IPAddress -notmatch '^169\.') -and (\$_.IPAddress -notmatch '^172\.(1[7-9]|2[0-9]|3[0-1])\.') } | Select-Object -First 1).IPAddress" 2>/dev/null | tr -d '\r\n')
    if [[ -n "$ip" ]] && [[ "$ip" != "127.0.0.1" ]] && [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "$ip"
      return
    fi
  fi
  # Method 3: resolv.conf nameserver (rekindle fallback) — only if it looks like a LAN IP
  if [[ -r /etc/resolv.conf ]]; then
    ip=$(grep -m1 '^nameserver' /etc/resolv.conf 2>/dev/null | awk '{print $2}' | tr -d '\r\n')
    if [[ -n "$ip" ]] && [[ "$ip" != "127.0.0.1" ]] && [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ ! "$ip" =~ ^10\.255\. ]] && [[ ! "$ip" =~ ^172\.(1[7-9]|2[0-9]|3[0-1])\. ]]; then
      echo "$ip"
      return
    fi
  fi
  echo ""
}

get_lan_ip() {
  local ip
  # WSL2: use only Windows host IP for mobile; never use 172.x (WSL internal) - phone cannot reach it
  if is_wsl2; then
    ip=$(get_windows_host_ip)
    # Do not fall back to hostname -I or ip route in WSL2 - they give 172.x which is useless for the phone
    echo "$ip"
    return
  fi
  # Linux (native): ip route or hostname -I
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

# ---------- Frontend (local dev server) ----------
start_frontend() {
  if [[ ! -d "$FRONTEND_DIR" ]]; then
    warn "Frontend directory not found: $FRONTEND_DIR. Skipping frontend."
    return 0
  fi
  if ! command -v npm >/dev/null 2>&1; then
    warn "npm not found. Install Node.js/npm to run the frontend, or start it manually: cd frontend && npm run dev"
    return 0
  fi
  if [[ -f "$FRONTEND_PID_FILE" ]]; then
    local pid
    pid=$(cat "$FRONTEND_PID_FILE" 2>/dev/null)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      info "Frontend already running (PID $pid)."
      return 0
    fi
    rm -f "$FRONTEND_PID_FILE"
  fi
  info "Starting frontend dev server (port ${FRONTEND_PORT})..."
  (
    cd "$FRONTEND_DIR" && exec npm run dev
  ) > "${SCRIPT_DIR}/.launch-frontend.log" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  # Give Vite a moment to bind the port
  sleep 2
  if kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
    ok "Frontend started (PID $(cat "$FRONTEND_PID_FILE")). Logs: .launch-frontend.log"
  else
    err "Frontend may have failed to start. Check .launch-frontend.log"
    rm -f "$FRONTEND_PID_FILE"
    return 1
  fi
}

stop_frontend() {
  local reported=0
  if [[ -f "$FRONTEND_PID_FILE" ]]; then
    local pid
    pid=$(cat "$FRONTEND_PID_FILE" 2>/dev/null) || pid=""
    rm -f "$FRONTEND_PID_FILE"
    if [[ -n "$pid" ]] && [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
      # Kill process group so npm's child (node/vite) also exits; fallback to single process
      kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
      sleep 1
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
      fi
      ok "Frontend stopped (was PID $pid)."
      reported=1
    fi
  fi
  # Always free port 5173: the child (node/vite) may survive if it's in a different process group
  local pids=""
  if command -v fuser >/dev/null 2>&1; then
    pids=$(fuser "$FRONTEND_PORT/tcp" 2>/dev/null | tr -cd '0-9 \n' | xargs) || true
  elif command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti ":$FRONTEND_PORT" 2>/dev/null | xargs) || true
  fi
  if [[ -n "$pids" ]]; then
    for pid in $pids; do
      [[ "$pid" =~ ^[0-9]+$ ]] || continue
      kill -TERM "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    done
    [[ $reported -eq 0 ]] && ok "Frontend stopped (freed port ${FRONTEND_PORT})."
  fi
}

is_frontend_managed() {
  [[ -f "$FRONTEND_PID_FILE" ]] && [[ -n "$(cat "$FRONTEND_PID_FILE" 2>/dev/null)" ]] && kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null
}

# ---------- WSL2 network access (--wsl only) ----------
# Run PowerShell as Admin to set portproxy + firewall so mobile devices can reach frontend/backend.
setup_wsl_network_access() {
  if [[ ! -f "$WSL_NETWORK_SCRIPT" ]]; then
    warn "WSL network script not found: $WSL_NETWORK_SCRIPT"
    return 1
  fi
  if ! command -v powershell.exe >/dev/null 2>&1; then
    warn "powershell.exe not found. Skip WSL network setup or run the script manually on Windows."
    return 1
  fi
  local win_path
  win_path=$(wslpath -w "$WSL_NETWORK_SCRIPT" 2>/dev/null)
  if [[ -z "$win_path" ]]; then
    win_path="\\\\wsl.localhost\\Ubuntu$(echo "$WSL_NETWORK_SCRIPT" | sed 's|^/||' | sed 's|/|\\|g')"
  fi
  # Try without RunAs first (no UAC if already elevated); then with RunAs if needed.
  # Suppress all output from the first attempt so we don't show repeated "elevation required" from netsh.
  info "Running WSL network setup (port forwarding + firewall)..."
  if powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w "$WSL_NETWORK_SCRIPT" 2>/dev/null)" >/dev/null 2>&1; then
    ok "WSL network access configured (port forwarding + firewall for ${FRONTEND_PORT}, ${BACKEND_PORT})."
  elif powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','$win_path' -Wait" 2>/dev/null; then
    ok "WSL network access configured (port forwarding + firewall for ${FRONTEND_PORT}, ${BACKEND_PORT})."
  else
    warn "Could not run WSL network setup. Run as Admin on Windows: powershell -ExecutionPolicy Bypass -File <path-to-wsl-network-access.ps1>"
    return 1
  fi
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
  if is_frontend_managed; then
    echo "    Frontend (dev): http://localhost:${FRONTEND_PORT}  (started by launch.sh)"
  else
    echo "    Frontend (dev): http://localhost:${FRONTEND_PORT}  (run: cd frontend && npm run dev, or use: $0 up)"
  fi
  echo ""
  if [[ -n "$lan_ip" ]]; then
    if is_wsl2; then
      echo -e "  ${CYAN}On your local network (phone/tablet) — use Windows host IP:${NC}"
      echo "    Backend:  http://${lan_ip}:${BACKEND_PORT}"
      echo "    Frontend: http://${lan_ip}:${FRONTEND_PORT}"
      echo ""
      echo "  Open these URLs on your phone. If the IP above does not work, run ipconfig in Windows and use the IPv4 address for Wi-Fi or Ethernet."
      echo -e "  ${YELLOW}WSL2: If the page does not load, forward ports from Windows to WSL:${NC}"
      echo "    1. In PowerShell (Admin), get WSL IP:  wsl hostname -I"
      echo "    2. Then (replace WSL_IP with that number):"
      echo "       netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=WSL_IP"
      echo "       netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=WSL_IP"
      echo "    3. Allow ports 5173 and 8000 in Windows Firewall (inbound), or see README."
    else
      echo -e "  ${CYAN}On your local network (other devices, same Wi‑Fi/LAN):${NC}"
      echo "    Backend:  http://${lan_ip}:${BACKEND_PORT}"
      echo "    Frontend: http://${lan_ip}:${FRONTEND_PORT}"
      echo ""
      echo "  Use the above URLs from phones/tablets or other PCs on the same network."
    fi
    echo ""
  else
    echo -e "  ${YELLOW}Network URL: Could not detect LAN IP.${NC}"
    echo "  On other devices use: http://<this-machine-IP>:${BACKEND_PORT} and :${FRONTEND_PORT}"
    if is_wsl2; then
      echo "  In WSL2: run ipconfig in Windows (Cmd or PowerShell) and use the IPv4 address for Wi-Fi or Ethernet."
      echo "  Do not use 172.x — that is WSL internal; your phone cannot reach it."
    else
      echo "  Find IP: ip addr (Linux) or ipconfig (Windows/macOS)."
    fi
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
  # If our managed frontend is already running on 5173, don't warn about port in use
  local frontend_ignore_pid=""
  if [[ -f "$FRONTEND_PID_FILE" ]]; then
    frontend_ignore_pid=$(cat "$FRONTEND_PID_FILE" 2>/dev/null)
    [[ -n "$frontend_ignore_pid" ]] && kill -0 "$frontend_ignore_pid" 2>/dev/null || frontend_ignore_pid=""
  fi
  check_port $FRONTEND_PORT "frontend" "$frontend_ignore_pid"
  local compose_cmd=$COMPOSE_CMD
  if [[ "$LAUNCH_WSL" -eq 1 ]]; then
    echo ""
    setup_wsl_network_access
    echo ""
  fi
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
  # When starting "all" (no service filter), also start the frontend dev server
  if [[ ${#services[@]} -eq 0 ]]; then
    echo ""
    start_frontend
  fi
  echo ""
  show_status_and_urls "$compose_cmd"
}

cmd_down() {
  local services=("$@")
  if [[ ${#services[@]} -eq 0 ]]; then
    info "Stopping frontend..."
    stop_frontend
    wait_until_port_free $FRONTEND_PORT "Frontend" 10 || true

    info "Stopping backend (Docker)..."
    if command -v docker >/dev/null 2>&1; then
      COMPOSE_CMD=$(detect_compose) 2>/dev/null || true
      if [[ -n "$COMPOSE_CMD" ]] && [[ -f "$COMPOSE_FILE" ]]; then
        $COMPOSE_CMD -f "$COMPOSE_FILE" down || true
      else
        info "Docker Compose not available; skipping backend container stop."
      fi
    else
      info "Docker not available; skipping backend container stop."
    fi
    wait_until_port_free $BACKEND_PORT "Backend" 15 || true

    ok "All services stopped. You can run ./launch.sh up again."
  else
    check_prereqs
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
# Parse global --wsl before the command
while [[ $# -gt 0 ]]; do
  case "$1" in
    --wsl)
      LAUNCH_WSL=1
      shift
      ;;
    *)
      break
      ;;
  esac
done

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
      echo "Usage: $0 [--wsl] {up|down|restart|logs|status} [service...]"
      echo "  --wsl    (WSL2 only) Run PowerShell to allow mobile devices (port forwarding + firewall). Use with: $0 --wsl up"
      echo "  up       Start backend + frontend (or only listed Docker services)."
      echo "  down     Stop backend and frontend (when no service names given)."
      echo "  restart  Restart services (default: backend)."
      echo "  logs     Stream logs (all or specified service)."
      echo "  status   Show status and URLs (local + network)."
      exit 1
      ;;
  esac
}

main "$@"
