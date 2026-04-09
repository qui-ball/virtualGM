# virtualGM

## Prerequisites

- **Docker** (daemon running)
- **Node.js** + **npm** (for the frontend dev server)
- **Supabase CLI** — only if you use local Supabase (`supabase/config.toml` in repo). [Install](https://supabase.com/docs/guides/cli/getting-started), then `supabase --version`.

## Setup

1. Clone the repo and go to the project root.

2. **Environment** — copy examples and add secrets (nothing real should be committed):
   - Root: `.env.example` → `.env` and/or `.env.development`; optional `.env.docker` tweaks for Compose.
   - Frontend: `frontend/.env.example` → `frontend/.env.development` (Vite reads that on `npm run dev`).
   - Set at least one LLM key in root env if you use the chat backend (`OPENROUTER_API_KEY` or `DEEPSEEK_API_KEY` — see `.env.example`).

3. **Supabase (local)** — after first `./launch.sh up` or `supabase start`, run `supabase status` (or `./launch.sh status`). Put the API URL and **anon/publishable** key in `frontend/.env.development` (`VITE_SUPABASE_*`). Put the **secret/service_role** key only in root `.env.development` or `.env.docker` (`SUPABASE_*`) if the backend needs it — never in the frontend.

4. **Supabase (hosted)** — skip `supabase start`; set `VITE_SUPABASE_*` and optional `SUPABASE_*` from the Supabase dashboard (see `.env.example` files).

## Run

```bash
./launch.sh up        # Local Supabase + `supabase migration up` (applies supabase/migrations/*.sql) + backend + frontend
./launch.sh status    # URLs and local network hints
./launch.sh down      # stop everything including local Supabase
```

**Backend only:** `./launch.sh up backend` — then `cd frontend && npm run dev` if you need the UI.

More detail on env layout: [docs/ENV_ANALYSIS.md](docs/ENV_ANALYSIS.md).
