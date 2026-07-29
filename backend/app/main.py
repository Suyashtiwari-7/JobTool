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
    import logging
    logger = logging.getLogger(__name__)

    # Create upload + PDF output directories
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.pdf_output_dir, exist_ok=True)

    # Try to create tables, but don't crash if DB is temporarily unreachable
    # (Neon free tier has cold starts too)
    try:
        await init_db()
        logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.warning(f"Database init skipped (will retry on first request): {e}")

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
from app.api import (  # noqa: E402
    auth, filters, resume, applications, pipeline, settings_api, assistant, 
    integrations_api, agent_api, audit_api, review_api, guardrails_api
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(filters.router, prefix="/api/filters", tags=["Filters"])
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["Settings"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["Assistant"])
app.include_router(integrations_api.router, prefix="/api/integrations", tags=["Integrations"])
app.include_router(agent_api.router, prefix="/api/agent", tags=["Agent"])
app.include_router(audit_api.router, prefix="/api/audit-log", tags=["Audit Log"])
app.include_router(review_api.router, prefix="/api/review-queue", tags=["Review Queue"])
app.include_router(guardrails_api.router, prefix="/api/guardrails", tags=["Guardrails"])



@app.get("/api/health")
async def health_check():
    """Health check endpoint for uptime monitoring and cron pings."""
    return {"status": "ok", "service": "jobtool-api", "version": "2.0.0-chat-brain"}


# ── Mount Frontend Neumorphic UI Static Bundle ─────────────────
possible_ui_dirs = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend_out")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "out")),
]
ui_dir = next((d for d in possible_ui_dirs if os.path.exists(d)), None)

if ui_dir:
    app.mount("/", StaticFiles(directory=ui_dir, html=True), name="frontend_ui")
else:
    @app.get("/")
    async def root_fallback():
        from fastapi.responses import HTMLResponse
        return HTMLResponse("""
        <html>
            <head><title>JobTool Backend</title></head>
            <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
                <h1>🚀 JobTool Cloud API Live</h1>
                <p>Backend Engine & DB is active.</p>
                <div style="margin-top: 20px;">
                    <a href="/docs" style="color: #3b82f6; font-weight: bold; margin-right: 20px;">Open Swagger API Docs</a>
                    <a href="http://localhost:3000" style="color: #10b981; font-weight: bold;">Open Local Dashboard UI</a>
                </div>
            </body>
        </html>
        """)
