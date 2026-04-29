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
   - **Local vs hosted Supabase:** for local CLI Supabase, frontend can use `http://127.0.0.1:54321`, but Dockerized backend must use `http://host.docker.internal:54321` for `SUPABASE_URL` (container loopback cannot reach host services). Use dashboard URL + keys only for hosted dev if you skip local Supabase.
   - **Production / CI:** templates are `.env.production.example` (root and `frontend/`). Copy to gitignored `.env.production` or set the same variables as pipeline secrets before `vite build` / container deploy so production traffic never shares credentials with local `.env.development`.
   - Set at least one LLM key in root env if you use the chat backend (`OPENROUTER_API_KEY` or `DEEPSEEK_API_KEY` — see `.env.example`).

3. **Supabase (local)** — after first `./launch.sh up` or `supabase start`, run `supabase status` (or `./launch.sh status`). Put the API URL and **anon/publishable** key in `frontend/.env.development` (`VITE_SUPABASE_*`). Put the **secret/service_role** key only in root `.env.development` or `.env.docker` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`) if the backend needs it — never in the frontend.

   **Backend client:** use `get_supabase_service_client()` from [`backend/supabase_client.py`](backend/supabase_client.py) for server-only calls (this key **bypasses RLS**). Use it only when an operation cannot be done safely with the user’s JWT via the frontend.

4. **Supabase (hosted)** — skip `supabase start`; set `VITE_SUPABASE_*` and optional `SUPABASE_*` from the Supabase dashboard (see `.env.example` files).

5. **UI themes (spec)** — preset theme ids and `users.theme_preference` default **`dark-fantasy`** are defined in [local/feature/03-ui-design-system/](local/feature/03-ui-design-system/) and [local/steering/04-data-models-schemas.md](local/steering/04-data-models-schemas.md). Implementation is tracked there.

## Seeded Campaigns (Local Dev)

To make the campaign dropdown show the two expected test campaigns, reseed local Supabase after pulling latest changes:

```bash
supabase db reset
docker compose up -d backend
```

Expected seeded campaign names:

- `Lost Mine of Phandelver`
- `Touch of the Necromancer`

Notes:

- Seed data is defined in `supabase/seed.sql` (`campaign_templates` + `active_campaigns`).
- Backend campaign context comes from `active_campaigns.campaign_state.campaign_dir_relative`.
- If the dropdown is stale, hard refresh the frontend after reseeding/restarting backend.

## Run

```bash
./launch.sh up        # Local Supabase + `supabase migration up` (applies supabase/migrations/*.sql) + backend + frontend
./launch.sh status    # URLs and local network hints
./launch.sh down      # stop everything including local Supabase
```

**Backend only:** `./launch.sh up backend` — then `cd frontend && npm run dev` if you need the UI.

More detail on env layout: [docs/ENV_ANALYSIS.md](docs/ENV_ANALYSIS.md).
