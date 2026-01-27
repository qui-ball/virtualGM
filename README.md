# virtualGM

A virtual Game Master (GM) application for tabletop RPGs, built with React, TypeScript, and Python.

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd virtualGM
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and fill in your values (see Environment Variables section below)
   ```

3. **Start services with Docker**
   ```bash
   ./launch.sh up
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000 (when implemented)

## Environment Variables

### Setup

Environment variables are managed through several files:

- **`.env.example`** - Template file with all available variables (committed to git)
- **`.env`** - Your local environment variables (not committed, create from `.env.example`)
- **`.env.docker`** - Docker-specific overrides (optional, not committed)
- **`frontend/.env`** - Frontend-specific variables (optional, not committed)
- **`frontend/.env.local`** - Frontend local overrides (optional, not committed)

### Required Variables

#### Backend

- **`OPENROUTER_API_KEY`** (Required)
  - Your OpenRouter API key for LLM functionality
  - Get it from: https://openrouter.ai
  - Used by the game master agent to generate responses

### Optional Variables

#### Backend

- **`LOGFIRE_TOKEN`** (Optional)
  - Token for Logfire observability and monitoring
  - Get it from: https://logfire.pydantic.dev
  - If not set, Logfire will be disabled

- **`LOGFIRE_ENVIRONMENT`** (Optional, default: `development`)
  - Environment name for Logfire logging
  - Examples: `development`, `staging`, `production`

- **`LOGURU_LEVEL`** (Optional, default: `INFO`)
  - Logging level for the application
  - Options: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

#### Frontend

- **`VITE_API_URL`** (Required for API calls)
  - Backend API URL
  - Development: `http://localhost:8000`
  - Production: `https://api.virtualgm.com`
  - Mobile dev: Use your local IP (e.g., `http://192.168.1.100:8000`)

- **`VITE_CAPACITOR_DEV_SERVER_URL`** (Optional, for mobile development)
  - Development server URL for Capacitor live reload
  - Set to your local IP when testing on physical devices
  - Example: `http://192.168.1.100:5173`
  - Leave empty for production builds

- **`VITE_CAPACITOR_CLEARTEXT`** (Optional, default: `false`)
  - Enable HTTP (cleartext) for Android development
  - Set to `true` if using HTTP (not HTTPS) for development
  - Required for Android to allow HTTP connections

- **`VITE_APP_ENV`** (Optional, default: `development`)
  - Application environment
  - Options: `development`, `staging`, `production`

- **`VITE_APP_NAME`** (Optional, default: `Virtual GM`)
  - Application name displayed in UI and Capacitor config

- **`VITE_HOST`** (Optional, default: `0.0.0.0`)
  - Host address for Vite dev server
  - Set to `0.0.0.0` to allow access from network (needed for mobile devices)

- **`VITE_PORT`** (Optional, default: `5173`)
  - Port for Vite dev server

- **`NODE_ENV`** (Optional, default: `development`)
  - Node.js environment
  - Options: `development`, `production`, `test`

### Docker-Specific Configuration

When running with Docker (via `./launch.sh`), environment variables are loaded in this order:

1. Values from `docker-compose.yml` (hardcoded defaults)
2. Values from `.env.docker` (if exists)
3. Values from `frontend/.env` (if exists)
4. Values from `frontend/.env.local` (if exists)

Later files override earlier ones. This allows you to:
- Keep Docker-specific settings in `.env.docker`
- Keep local development settings in `.env` or `frontend/.env.local`
- Avoid conflicts between Docker and local development

### Capacitor-Specific Configuration

For mobile app development with Capacitor, environment variables work differently:

1. **Vite Environment Variables** (`VITE_*` prefix)
   - Embedded at build time into the JavaScript bundle
   - Available via `import.meta.env.VITE_*` in your code
   - Same values for iOS, Android, and web (no platform-specific files needed)

2. **Environment Files**
   - `frontend/.env.development` - Used for `npm run dev` or `npm run build -- --mode development`
   - `frontend/.env.production` - Used for `npm run build` (production builds)
   - `frontend/.env.example` - Template file

3. **Capacitor Config**
   - `capacitor.config.ts` automatically uses `VITE_CAPACITOR_DEV_SERVER_URL` for live reload
   - No separate iOS/Android config files needed - Capacitor handles platform differences

4. **Building for Mobile**
   ```bash
   # Development build (uses .env.development)
   npm run build -- --mode development
   npx cap sync

   # Production build (uses .env.production)
   npm run build
   npx cap sync
   ```

### Testing Environment Variables

To verify environment variables are loaded correctly:

**In Docker containers:**
```bash
# Check frontend environment variables
docker exec virtualgm-frontend env | grep VITE

# Check backend environment variables (when backend is implemented)
docker exec virtualgm-backend env | grep -E "LOGFIRE|LOGURU|OPENROUTER"

# Check all environment variables for a container
docker exec virtualgm-frontend env
```

**In Capacitor builds:**
```bash
# After building, check the built files
grep -r "VITE_" frontend/dist/

# Or verify setup
cd frontend && ./verify-capacitor-env.sh
```

## Development

### Prerequisites

- Docker and Docker Compose
- Node.js 24.13.0+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Using the Launch Script

The `./launch.sh` script provides convenient commands for managing services:

```bash
./launch.sh up              # Start all services
./launch.sh up frontend     # Start only frontend
./launch.sh down            # Stop all services
./launch.sh restart         # Restart all services
./launch.sh logs            # View logs for all services
./launch.sh logs frontend   # View logs for frontend only
./launch.sh status          # Show service status and URLs
```

See `./launch.sh help` for more options.

### Local Development (Without Docker)

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
# Set up Python environment (using uv recommended)
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .

# Run the application
python main.py
```

## Project Structure

```
virtualGM/
├── frontend/          # React + TypeScript frontend
├── backend/           # Python backend (FastAPI/Pydantic AI)
├── docker-compose.yml # Docker Compose configuration
├── launch.sh          # Development launch script
├── .env.example       # Environment variables template
└── README.md          # This file
```

## Contributing

1. Create a branch for your feature
2. Make your changes
3. Ensure environment variables are documented in `.env.example`
4. Test with Docker using `./launch.sh`
5. Submit a pull request

## License

[Add your license here]
