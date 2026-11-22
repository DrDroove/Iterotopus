# Iterotopus

Python backend powered by FastAPI, SQLModel, PostgreSQL and uv.

## Prerequisites

Install the following tools:

- [Git](https://git-scm.com/)
- [Python 3.13+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Task](https://taskfile.dev/installation/)

## Getting started

### 1. Clone the repository

```bash
git clone <repository-url>
cd iterotopus
```

### 2. Configure environment variables

Copy the example environment file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

Adjust values if necessary.

### 3. Start the development server

```bash
task dev
```

API documentation: http://localhost:8000/docs

Health check: http://localhost:8000/health

## Docker

Start the entire application:

```bash
task docker-up
```

Stop containers:

```bash
task docker-down
```

## Development commands

| Command | Description |
|---|---|
| `task dev` | Start FastAPI |
| `task test` | Run tests |
| `task lint` | Run Ruff |
| `task format` | Format code |
| `task check` | Run quality checks |
| `task migrate` | Apply database migrations |
| `task docker-up` | Start Docker services |
| `task docker-down` | Stop Docker services |

## Database migrations

Generate a migration:

```bash
task migration-create -- "describe your change"
```

Apply migrations:

```bash
task migrate
```

## Tech stack

- Python
- FastAPI
- uv
- SQLModel
- PostgreSQL
- Alembic
- Docker Compose
- Pytest
- Ruff
- Task