"""Async SQLAlchemy database engine and session factory."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Sanitize database URL for asyncpg (asyncpg does not accept ?sslmode= parameter)
db_url = settings.database_url
if "?sslmode=" in db_url:
    db_url = db_url.split("?sslmode=")[0]
elif "&sslmode=" in db_url:
    db_url = db_url.split("&sslmode=")[0]

connect_args = {}
if "localhost" not in db_url and "127.0.0.1" not in db_url:
    connect_args["ssl"] = "require"

# Create async engine — pool settings tuned for free-tier Neon PG
engine = create_async_engine(
    db_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Detect stale connections (important for serverless PG)
    connect_args=connect_args,
)

# Session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables and perform safe schema migrations."""
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe migrations for columns added after initial deployment
        try:
            await conn.execute(
                text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS role_label VARCHAR(100) DEFAULT 'General';")
            )
        except Exception:
            pass
        try:
            await conn.execute(
                text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_data BYTEA;")
            )
        except Exception:
            pass
        try:
            await conn.execute(
                text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;")
            )
        except Exception:
            pass

        # v2.0 migrations: automation_schedules new columns
        for col_sql in [
            "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS days_of_week VARCHAR[] DEFAULT '{}'",
            "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS repeat_type VARCHAR(20) DEFAULT 'daily'",
            "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 10",
            "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ",
            "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ",
            "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS total_runs INTEGER DEFAULT 0",
        ]:
            try:
                await conn.execute(text(col_sql))
            except Exception:
                pass

        # v2.0: performance indexes
        for idx_sql in [
            "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(category)",
            "CREATE INDEX IF NOT EXISTS idx_user_memories_key ON user_memories(memory_key)",
            "CREATE INDEX IF NOT EXISTS idx_user_integrations_service ON user_integrations(service_name)",
        ]:
            try:
                await conn.execute(text(idx_sql))
            except Exception:
                pass
