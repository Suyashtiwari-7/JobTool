"""JobTool backend configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings — all values come from env vars or .env file."""

    # ── Database ──
    database_url: str = Field(
        default="postgresql+asyncpg://localhost:5432/jobtool",
        description="Async PostgreSQL connection string",
    )

    # ── Auth ──
    secret_key: str = Field(default="change-me", description="JWT signing key")
    app_password: str = Field(default="admin", description="Single-user login password")
    cron_secret: str = Field(default="cron-secret", description="Webhook auth for cron triggers")
    access_token_expire_minutes: int = Field(default=1440, description="JWT expiry (24h default)")

    # ── Adzuna ──
    adzuna_app_id: str = Field(default="", description="Adzuna API app ID")
    adzuna_app_key: str = Field(default="", description="Adzuna API app key")

    # ── LLM Providers ──
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    groq_api_key: str = Field(default="", description="Groq API key")
    openrouter_api_key: str = Field(default="", description="OpenRouter API key")
    deepseek_api_key: str = Field(default="", description="DeepSeek API key")

    # ── Frontend ──
    frontend_url: str = Field(default="http://localhost:3000", description="Frontend URL for CORS")

    # ── File Storage ──
    upload_dir: str = Field(default="uploads", description="Directory for uploaded resumes")
    pdf_output_dir: str = Field(default="generated_pdfs", description="Directory for generated PDFs")

    # ── Pipeline Defaults ──
    match_score_threshold: int = Field(default=50, description="Minimum match score to tailor resume (0-100)")
    default_target_count: int = Field(default=20, description="Default number of jobs to target")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


# Singleton instance
settings = Settings()
