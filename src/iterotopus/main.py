from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse

from iterotopus.api.routes import items, tasks
from iterotopus.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Initialize resources here if necessary.
    yield
    # Release resources here if necessary.


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


app.include_router(items.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
def frontend():
    html_path = Path(__file__).resolve().parent / "web" / "index.html"
    return FileResponse(html_path)
