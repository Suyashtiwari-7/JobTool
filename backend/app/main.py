"""JobTool — FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.database import init_db


# Create upload + PDF output directories before mounting StaticFiles
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.pdf_output_dir, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — create tables and upload directories."""
    # Create upload + PDF output directories
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.pdf_output_dir, exist_ok=True)

    # Create tables if they don't exist (dev convenience; use alembic in prod)
    await init_db()

    yield  # App runs here

    # Shutdown — nothing to clean up for now


app = FastAPI(
    title="JobTool API",
    description="Cloud-hosted job application pipeline backend",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https://.*|http://localhost.*|http://127\.0\.0\.1.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving for generated PDFs ───────────────
app.mount(
    "/static/pdfs",
    StaticFiles(directory=settings.pdf_output_dir),
    name="generated_pdfs",
)

# ── Register API routers ─────────────────────────────────
from app.api import auth, filters, resume, applications, pipeline, settings_api  # noqa: E402

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(filters.router, prefix="/api/filters", tags=["Filters"])
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["Settings"])


@app.get("/")
@app.get("/api/health")
async def health_check():
    """Health check endpoint for uptime monitoring and cron pings."""
    return {"status": "ok", "service": "jobtool-api"}
