import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from iterotopus.api.routes import items, tasks
from iterotopus.config import get_settings
from iterotopus.orchestration.scheduler import Scheduler


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Initialize resources here if necessary.
    scheduler = Scheduler()

    scheduler_task = asyncio.create_task(scheduler.run())

    app.state.scheduler = scheduler
    app.state.scheduler_task = scheduler_task

    yield
    # Release resources here if necessary.

    scheduler.stop()
    await scheduler_task


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

WEB_DIR = Path(__file__).resolve().parent / "web"

app.mount(
    "/static",
    StaticFiles(directory=WEB_DIR),
    name="static",
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


app.include_router(items.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
def frontend():
    return FileResponse(WEB_DIR / "index.html")
