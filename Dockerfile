
FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Configure uv
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"

# Install dependencies first for better build caching
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project

# Copy application source
COPY . /app

# Install the project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

EXPOSE 8000

CMD ["fastapi", "run", "src/iterotopus/main.py", "--host", "0.0.0.0", "--port", "8000"]
