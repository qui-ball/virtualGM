# virtualGM

## Development

- **Backend (Docker):** `./launch.sh up backend` — backend runs in Docker on port 8000.
- **Frontend (local):** `cd frontend && npm run dev` — Vite dev server on port 5173 (best HMR).

See `./launch.sh status` for URLs and `./launch.sh` for usage.

## Environment variables

Environment files are used for local and Docker configuration. **Do not commit secrets**; only `.env.example` and `.env.docker` (with safe defaults) are intended for version control.

| File | Purpose |
|------|--------|
| `.env.example` | Template listing all supported variables. Copy to `.env` and fill in values for local development. |
| `.env` | Local overrides and secrets (git-ignored). Create from `.env.example`. |
| `.env.docker` | Loaded by Docker Compose for the backend service. Committed with safe defaults; add Docker-specific overrides or secrets here (or keep defaults). |

### Variable reference

- **ENV** — Runtime: `development` or `production`. Default: `development`.
- **LOGURU_LEVEL** — Backend log level: `DEBUG`, `INFO`, `WARNING`, `ERROR`. Default: `INFO`.
- **LOGFIRE_TOKEN** — (Optional) Logfire token for observability. Leave unset to disable.
- **LOGFIRE_ENVIRONMENT** — Logfire environment name. Default: `development`.
- **OPENROUTER_API_KEY** — (Optional) API key for OpenRouter when using that LLM provider.
- **DEEPSEEK_API_KEY** — (Optional) API key for DeepSeek when using that provider.
- **VITE_API_URL** — (Frontend) Backend API base URL. Default for local dev: `http://localhost:8000`. For browser-on-device testing, set to your host IP (e.g. `http://192.168.1.10:8000`).

### Testing environment loading

Run the test script from the project root:

```bash
./test-env-loading.sh
```

To also check that variables are present inside the running backend container:

```bash
./launch.sh up backend
./test-env-loading.sh --in-container
```

## Responsive & browser testing

### Mobile viewports (browser dev tools)

Use your browser’s device toolbar to emulate mobile and tablet viewports:

1. Open the app (e.g. http://localhost:5173).
2. Open DevTools (F12 or right‑click → Inspect).
3. Toggle **device toolbar** (Ctrl+Shift+M / Cmd+Shift+M) or the device icon in DevTools.
4. Pick a device or set a custom width (e.g. 375px, 768px, 1024px).
5. Refresh if needed and check layout, touch targets, and navigation (e.g. the responsive test page under “Responsive test”).

Breakpoints: mobile &lt; 768px, tablet 768–1024px, desktop &gt; 1024px (see `frontend/src/styles/index.css` and Tailwind `md:` / `lg:`).

### Browser on a physical device (phone/tablet)

To run the app in the browser on your phone or tablet while the dev server runs on your machine:

1. **Start backend and frontend** on your host:
   - `./launch.sh up backend`
   - `cd frontend && npm run dev`
2. **Find your host’s LAN IP** (e.g. 192.168.1.10). On Linux: `ip addr` or `hostname -I`; on macOS: System Settings → Network; or run `./launch.sh status` and use the “On your local network” URL.
3. **On the device**, open the frontend at `http://<host-ip>:5173` (Vite is started with `host: true` so it listens on all interfaces).
4. **Backend from the device:** the app calls the backend at `VITE_API_URL`. From a phone, `localhost` is the phone itself, so set the API URL to your host machine:
   - In `frontend/.env`: `VITE_API_URL=http://<host-ip>:8000`
   - Restart the Vite dev server after changing `.env`.
5. Ensure your firewall allows incoming connections on 5173 and 8000 from the LAN.

### Windows + WSL2

When developing in WSL2, the IP shown as “WSL” (e.g. 172.18.x.x) is **not** reachable from your phone. Use the **Windows host IP** instead (the script shows it under “On your local network — use Windows host IP” when it detects WSL2; it comes from `/etc/resolv.conf`).

For the page to load on your phone:

1. **Port forwarding (PowerShell as Administrator):**  
   Get the WSL IP: `wsl hostname -I` (use the first number). Then:
   ```powershell
   netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=WSL_IP
   netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=WSL_IP
   ```
2. **Windows Firewall:** Allow inbound TCP on ports 5173 and 8000 (e.g. Windows Defender Firewall → Advanced → Inbound Rules → New Rule → Port → TCP 5173, 8000).

Then on your phone open `http://<Windows-LAN-IP>:5173` (and set `VITE_API_URL=http://<Windows-LAN-IP>:8000` in `frontend/.env` if the app calls the API).
