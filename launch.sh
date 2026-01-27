#!/bin/bash

# virtualGM Launch Script
# Handles Docker container management and local setup

# Note: We don't use 'set -e' globally because some functions return non-zero
# for expected conditions (e.g., wait_for_health). Errors are handled explicitly.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Service definitions (extensible for future services)
SERVICES=("frontend" "backend" "supabase")
FRONTEND_PORT=5173
BACKEND_PORT=8000  # Placeholder for future backend
SUPABASE_PORT=54321  # Placeholder for future Supabase

# Service to container name mapping
declare -A SERVICE_CONTAINERS=(
    ["frontend"]="virtualgm-frontend"
    ["backend"]="virtualgm-backend"
    ["supabase"]="virtualgm-supabase"
)

# Service to port mapping
declare -A SERVICE_PORTS=(
    ["frontend"]=$FRONTEND_PORT
    ["backend"]=$BACKEND_PORT
    ["supabase"]=$SUPABASE_PORT
)

# Print colored output
print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker Compose is available"
}

# Check if docker-compose.yml exists
check_compose_file() {
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found in current directory"
        print_info "Please run this script from the project root directory"
        exit 1
    fi
}

# Get Docker Compose command (handles both docker-compose and docker compose)
get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# Validate service name
validate_service() {
    local service=$1
    if [[ ! " ${SERVICES[@]} " =~ " ${service} " ]]; then
        print_error "Invalid service: $service"
        echo "Available services: ${SERVICES[*]}"
        exit 1
    fi
}

# Check if port is available
check_port() {
    local port=$1
    local service=$2
    
    # Check if port is already in use
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            # Check if it's our own container using the port
            local container_name=${SERVICE_CONTAINERS[$service]}
            if [ -n "$container_name" ]; then
                if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"; then
                    # Port is used by our container, that's okay
                    return 0
                fi
            fi
            print_error "Port $port is already in use by another process"
            print_info "To find what's using the port: ${CYAN}lsof -i :$port${NC}"
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            print_error "Port $port is already in use"
            return 1
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            print_error "Port $port is already in use"
            return 1
        fi
    fi
    return 0
}

# Check ports for services before starting
check_ports() {
    local services_to_check=("$@")
    
    if [ ${#services_to_check[@]} -eq 0 ]; then
        # Check all services
        services_to_check=("${SERVICES[@]}")
    fi
    
    for service in "${services_to_check[@]}"; do
        local port=${SERVICE_PORTS[$service]}
        if [ -n "$port" ]; then
            if ! check_port "$port" "$service"; then
                exit 1
            fi
        fi
    done
}

# Wait for service health check to pass
wait_for_health() {
    local service=$1
    local container_name=${SERVICE_CONTAINERS[$service]}
    local max_attempts=60  # 2 minutes max (60 * 2 seconds)
    local attempt=0
    
    if [ -z "$container_name" ]; then
        print_warning "No container name mapping for $service, skipping health check"
        return 0
    fi
    
    print_info "Waiting for $service to be healthy..."
    
    while [ $attempt -lt $max_attempts ]; do
        # Check if container exists
        if ! docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"; then
            sleep 2
            attempt=$((attempt + 1))
            continue
        fi
        
        # Check health status
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
        
        case "$health_status" in
            "healthy")
                print_success "$service is healthy"
                return 0
                ;;
            "unhealthy")
                if [ $attempt -ge 10 ]; then
                    print_error "$service health check failed"
                    print_info "Check logs with: ${CYAN}./launch.sh logs $service${NC}"
                    return 1
                fi
                ;;
            "starting"|"none")
                # Still starting or no health check defined, check if container is running
                local container_status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "none")
                if [ "$container_status" = "running" ]; then
                    # For services without health checks, consider running as ready after a short wait
                    if [ "$health_status" = "none" ] && [ $attempt -ge 5 ]; then
                        print_success "$service is running (no health check configured)"
                        return 0
                    fi
                fi
                ;;
        esac
        
        sleep 2
        attempt=$((attempt + 1))
        
        # Show progress every 10 attempts
        if [ $((attempt % 10)) -eq 0 ]; then
            echo -n "."
        fi
    done
    
    echo ""
    print_warning "$service did not become healthy within timeout"
    print_info "Container may still be starting. Check status with: ${CYAN}./launch.sh status${NC}"
    return 1
}

# Wait for all started services to be healthy
wait_for_services_health() {
    local services_to_wait=("$@")
    local failed_services=()
    
    if [ ${#services_to_wait[@]} -eq 0 ]; then
        # Wait for all services that are defined
        services_to_wait=("${SERVICES[@]}")
    fi
    
    for service in "${services_to_wait[@]}"; do
        # Check if service is actually defined in docker-compose
        local compose_cmd=$(get_compose_cmd)
        if ! $compose_cmd ps --services 2>/dev/null | grep -q "^${service}$"; then
            # Service not in docker-compose, skip health check
            continue
        fi
        
        if ! wait_for_health "$service"; then
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        print_warning "Some services did not become healthy: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Run database migrations (when implemented)
run_migrations() {
    local compose_cmd=$(get_compose_cmd)
    local backend_container=${SERVICE_CONTAINERS[backend]}
    
    # Check if backend service exists and is running
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${backend_container}$"; then
        print_info "Backend not running, skipping migrations"
        return 0
    fi
    
    # Wait for backend to be healthy before running migrations
    if ! wait_for_health "backend"; then
        print_warning "Backend not healthy, skipping migrations"
        return 1
    fi
    
    # Check for different migration tools and run appropriate command
    local migration_ran=false
    
    # Check for Alembic (common in FastAPI/SQLAlchemy projects)
    if docker exec "$backend_container" sh -c "command -v alembic >/dev/null 2>&1" 2>/dev/null; then
        print_info "Running Alembic migrations..."
        if docker exec "$backend_container" alembic upgrade head 2>&1; then
            print_success "Alembic migrations completed"
            migration_ran=true
        else
            print_error "Alembic migrations failed"
            return 1
        fi
    # Check for Django migrations
    elif docker exec "$backend_container" sh -c "python manage.py --help >/dev/null 2>&1" 2>/dev/null; then
        print_info "Running Django migrations..."
        if docker exec "$backend_container" python manage.py migrate 2>&1; then
            print_success "Django migrations completed"
            migration_ran=true
        else
            print_error "Django migrations failed"
            return 1
        fi
    # Check for custom migration script
    elif [ -f "backend/migrate.sh" ]; then
        print_info "Running custom migration script..."
        if docker exec "$backend_container" /bin/sh /app/migrate.sh 2>&1; then
            print_success "Custom migrations completed"
            migration_ran=true
        else
            print_error "Custom migrations failed"
            return 1
        fi
    # Check for migrations directory with SQL files (manual migration)
    elif [ -d "backend/migrations" ] && [ "$(ls -A backend/migrations/*.sql 2>/dev/null)" ]; then
        print_warning "SQL migration files found but no migration tool detected"
        print_info "Please configure Alembic, Django, or a custom migration script"
        return 0
    fi
    
    if [ "$migration_ran" = false ]; then
        print_info "No migrations to run (no migration tool or migrations directory found)"
    fi
    
    return 0
}

# Start services
start_services() {
    local services_to_start=("$@")
    local compose_cmd=$(get_compose_cmd)
    
    # Check for port conflicts before starting
    check_ports "${services_to_start[@]}"
    
    if [ ${#services_to_start[@]} -eq 0 ]; then
        # Start all services
        print_info "Starting all services..."
        $compose_cmd up -d --build
        services_to_start=("${SERVICES[@]}")
    else
        # Start specific services
        for service in "${services_to_start[@]}"; do
            validate_service "$service"
        done
        
        for service in "${services_to_start[@]}"; do
            print_info "Starting $service service..."
            $compose_cmd up -d --build "$service"
        done
    fi
    
    # Wait for services to be healthy
    wait_for_services_health "${services_to_start[@]}"
    
    # Run migrations after backend is up and healthy
    if [[ " ${services_to_start[@]} " =~ " backend " ]] || [ ${#services_to_start[@]} -eq 0 ]; then
        run_migrations
    fi
}

# Stop services
stop_services() {
    local services_to_stop=("$@")
    local compose_cmd=$(get_compose_cmd)
    
    if [ ${#services_to_stop[@]} -eq 0 ]; then
        # Stop all services
        print_info "Stopping all services..."
        $compose_cmd down
    else
        # Stop specific services
        for service in "${services_to_stop[@]}"; do
            validate_service "$service"
            print_info "Stopping $service service..."
            $compose_cmd stop "$service"
        done
    fi
    
    print_success "Services stopped"
}

# Show service status and URLs
show_status() {
    local compose_cmd=$(get_compose_cmd)
    
    print_header "Service Status"
    
    # Check if services are running using docker-compose ps
    local running_services=$($compose_cmd ps --services --filter "status=running" 2>/dev/null || echo "")
    
    if [ -z "$running_services" ]; then
        print_warning "No services are currently running"
        return
    fi
    
    echo ""
    
    # Frontend
    local frontend_container=${SERVICE_CONTAINERS[frontend]}
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${frontend_container}$"; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$frontend_container" 2>/dev/null || echo "none")
        if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
            print_success "Frontend: Running"
            echo "   URL: ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
            echo "   Network: ${CYAN}http://0.0.0.0:${FRONTEND_PORT}${NC}"
        else
            print_warning "Frontend: Running (unhealthy)"
        fi
    else
        print_warning "Frontend: Not running"
    fi
    
    # Backend (when implemented)
    local backend_container=${SERVICE_CONTAINERS[backend]}
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${backend_container}$"; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$backend_container" 2>/dev/null || echo "none")
        if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
            print_success "Backend: Running"
            echo "   API: ${CYAN}http://localhost:${BACKEND_PORT}${NC}"
            echo "   Docs: ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC}"
        else
            print_warning "Backend: Running (unhealthy)"
        fi
    else
        print_info "Backend: Not configured"
    fi
    
    # Supabase (when implemented)
    local supabase_container=${SERVICE_CONTAINERS[supabase]}
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${supabase_container}$"; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$supabase_container" 2>/dev/null || echo "none")
        if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
            print_success "Supabase: Running"
            echo "   Studio: ${CYAN}http://localhost:${SUPABASE_PORT}${NC}"
            echo "   API: ${CYAN}http://localhost:${SUPABASE_PORT}/rest/v1${NC}"
        else
            print_warning "Supabase: Running (unhealthy)"
        fi
    else
        print_info "Supabase: Not configured"
    fi
    
    echo ""
    print_info "View logs: ${CYAN}./launch.sh logs [service]${NC}"
    print_info "Stop all: ${CYAN}./launch.sh down${NC}"
}

# Show logs for services
show_logs() {
    local services_to_log=("$@")
    local compose_cmd=$(get_compose_cmd)
    
    if [ ${#services_to_log[@]} -eq 0 ]; then
        # Show logs for all services
        print_info "Showing logs for all services (Ctrl+C to exit)..."
        $compose_cmd logs -f
    else
        # Show logs for specific services
        for service in "${services_to_log[@]}"; do
            validate_service "$service"
        done
        
        print_info "Showing logs for: ${services_to_log[*]} (Ctrl+C to exit)..."
        $compose_cmd logs -f "${services_to_log[@]}"
    fi
}

# Restart services
restart_services() {
    local services_to_restart=("$@")
    local compose_cmd=$(get_compose_cmd)
    
    if [ ${#services_to_restart[@]} -eq 0 ]; then
        # Restart all services
        print_info "Restarting all services..."
        $compose_cmd restart
        wait_for_services_health "${SERVICES[@]}"
    else
        # Restart specific services
        for service in "${services_to_restart[@]}"; do
            validate_service "$service"
        done
        
        for service in "${services_to_restart[@]}"; do
            print_info "Restarting $service service..."
            $compose_cmd restart "$service"
        done
        
        wait_for_services_health "${services_to_restart[@]}"
    fi
    
    print_success "Services restarted"
}

# Show usage
show_usage() {
    echo "Usage: ./launch.sh [command] [services...]"
    echo ""
    echo "Commands:"
    echo "  up [services...]    Start services (all if none specified)"
    echo "  down [services...]  Stop services (all if none specified)"
    echo "  restart [services] Restart services (all if none specified)"
    echo "  status              Show service status and URLs"
    echo "  logs [services...]  Show service logs (all if none specified)"
    echo "  help                Show this help message"
    echo ""
    echo "Services:"
    for service in "${SERVICES[@]}"; do
        echo "  - $service"
    done
    echo ""
    echo "Examples:"
    echo "  ./launch.sh up                    # Start all services"
    echo "  ./launch.sh up frontend           # Start only frontend"
    echo "  ./launch.sh up frontend backend   # Start frontend and backend"
    echo "  ./launch.sh down                  # Stop all services"
    echo "  ./launch.sh down frontend         # Stop only frontend"
    echo "  ./launch.sh restart frontend      # Restart frontend"
    echo "  ./launch.sh logs                  # Show all logs"
    echo "  ./launch.sh logs frontend         # Show frontend logs"
    echo "  ./launch.sh status                # Show service status"
}

# Main script logic
main() {
    # Check prerequisites
    check_docker
    check_docker_compose
    check_compose_file
    
    # Parse command
    local command=${1:-"up"}
    shift || true
    
    case "$command" in
        up)
            start_services "$@"
            show_status
            ;;
        down)
            stop_services "$@"
            ;;
        restart)
            restart_services "$@"
            show_status
            ;;
        logs)
            show_logs "$@"
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
