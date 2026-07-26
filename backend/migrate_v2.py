"""
Migration script for JobTool v2.0:
- Creates `chat_messages` table for conversational AI memory
- Adds new columns to `automation_schedules` for enhanced scheduling
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.database import engine


STATEMENTS = [
    # 1. Create chat_messages table
    """CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        metadata_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )""",

    # 2. Add new columns to automation_schedules
    "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS days_of_week VARCHAR[] DEFAULT '{}'",
    "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS repeat_type VARCHAR(20) DEFAULT 'daily'",
    "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 10",
    "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ",
    "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ",
    "ALTER TABLE automation_schedules ADD COLUMN IF NOT EXISTS total_runs INTEGER DEFAULT 0",

    # 3. Performance indexes
    "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(category)",
    "CREATE INDEX IF NOT EXISTS idx_user_memories_key ON user_memories(memory_key)",
]


async def run_migration():
    print("[*] Running JobTool v2.0 migration...")
    async with engine.begin() as conn:
        for i, stmt in enumerate(STATEMENTS, 1):
            try:
                await conn.execute(text(stmt))
                print(f"  [{i}/{len(STATEMENTS)}] OK")
            except Exception as e:
                print(f"  [{i}/{len(STATEMENTS)}] Skipped ({e})")
    print("[OK] Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_migration())
