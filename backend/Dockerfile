# Backend service (Python). When you add an HTTP API (e.g. FastAPI), change CMD to run uvicorn.
FROM python:3.12-slim-bookworm

WORKDIR /app

# Install uv for fast, reproducible dependency installs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency manifests first for better layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies into the system Python (no venv in container)
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY . .

# Default: keep container running so you can exec in or attach.
# Hot reload: the compose volume (./backend:/app) mounts your code; use --reload in dev.
# When you add an API (e.g. FastAPI), use for local development:
#   CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
EXPOSE 8000
CMD ["sleep", "infinity"]
