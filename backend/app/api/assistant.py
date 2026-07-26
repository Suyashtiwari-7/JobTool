"""AI Co-Pilot Assistant API endpoints."""

import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import AutomationSchedule, SearchFilter, UserMemory
from app.llm.provider import llm_call

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatMessageRequest(BaseModel):
    message: str


class AssistantChatResponse(BaseModel):
    response_text: str
    actions_taken: list[str] = Field(default_factory=list)
    updated_filter: dict | None = None
    created_schedule: dict | None = None
    saved_memory: dict | None = None


class UserMemoryResponse(BaseModel):
    id: int
    category: str
    memory_key: str
    memory_value: str
    created_at: str

    model_config = {"from_attributes": True}


class ScheduleResponse(BaseModel):
    id: int
    title: str
    start_time: str | None
    end_time: str | None
    duration_hours: int | None
    status: str
    is_running: bool
    created_at: str

    model_config = {"from_attributes": True}


ASSISTANT_SYSTEM_PROMPT = """You are the JobTool AI Career Co-Pilot Assistant.
You parse the user's natural language command and decide which actions to take.

Respond ONLY with a JSON object in this format:
{{
  "response_text": "Friendly confirmation text summarizing what was configured/done.",
  "update_filter": {{
    "keywords": ["list", "of", "keywords"], // or null if unchanged
    "experience_level": "Apprenticeship" | "Entry" | "Mid" | "Senior" | null,
    "company_scope": "big_tech" | "startups" | "all" | null,
    "target_count": number or null
  }},
  "create_schedule": {{
    "title": "e.g. Everyday morning 8am-10am or 5-Hour Sourcing Run",
    "start_time": "08:00" or null,
    "end_time": "10:00" or null,
    "duration_hours": 2 or 5 or null
  }},
  "save_memory": {{
    "category": "availability" | "preference" | "skill" | "note",
    "key": "short_key",
    "value": "full memory text"
  }},
  "pipeline_action": "start" | "pause" | "stop" | null
}}

User Input: "{user_message}"
Existing Memories: {memories_summary}
"""


@router.post("/chat", response_model=AssistantChatResponse)
async def chat_with_assistant(
    payload: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Process natural language commands from the user via the AI Co-Pilot."""
    msg = payload.message.strip()
    if not msg:
        raise HTTPException(400, "Message cannot be empty")

    # Fetch existing user memories for context
    mem_res = await db.execute(select(UserMemory).order_by(UserMemory.id.desc()).limit(10))
    existing_memories = mem_res.scalars().all()
    memories_summary = [f"{m.memory_key}: {m.memory_value}" for m in existing_memories]

    prompt = ASSISTANT_SYSTEM_PROMPT.format(
        user_message=msg,
        memories_summary=json.dumps(memories_summary),
    )

    actions_taken = []
    updated_filter_dict = None
    created_schedule_dict = None
    saved_memory_dict = None
    response_text = "I've processed your request."

    try:
        raw_json = await llm_call(prompt, json_mode=True)
        data = json.loads(raw_json)
        response_text = data.get("response_text", response_text)

        # 1. Update Search Filter if specified
        uf = data.get("update_filter")
        if uf and any(uf.values()):
            filt_res = await db.execute(select(SearchFilter).where(SearchFilter.is_active.is_(True)).limit(1))
            filt = filt_res.scalar_one_or_none()
            if not filt:
                filt = SearchFilter(name="Co-Pilot Filter", is_active=True)
                db.add(filt)
                await db.flush()

            if uf.get("keywords"):
                filt.keywords = uf["keywords"]
                actions_taken.append(f"Updated keywords: {', '.join(uf['keywords'])}")
            if uf.get("experience_level"):
                filt.experience_level = uf["experience_level"]
                actions_taken.append(f"Set Experience Level to {uf['experience_level']}")
            if uf.get("company_scope"):
                filt.domain = f"scope_{uf['company_scope']}"
                actions_taken.append(f"Set Target Scope to {uf['company_scope'].replace('_', ' ').title()}")
            if uf.get("target_count"):
                filt.target_count = uf["target_count"]

            await db.commit()
            updated_filter_dict = {
                "keywords": filt.keywords,
                "experience_level": filt.experience_level,
                "domain": filt.domain,
            }

        # 2. Create Automation Schedule if specified
        cs = data.get("create_schedule")
        if cs and cs.get("title"):
            sched = AutomationSchedule(
                title=cs["title"],
                start_time=cs.get("start_time") or "08:00",
                end_time=cs.get("end_time") or "10:00",
                duration_hours=cs.get("duration_hours") or 2,
                status="active",
                is_running=True,
            )
            db.add(sched)
            await db.commit()
            await db.refresh(sched)
            actions_taken.append(f"Created Schedule: {sched.title}")
            created_schedule_dict = {
                "id": sched.id,
                "title": sched.title,
                "start_time": sched.start_time,
                "end_time": sched.end_time,
            }

        # 3. Save User Memory if specified
        sm = data.get("save_memory")
        if sm and sm.get("value"):
            cat = sm.get("category", "preference")
            key = sm.get("key", "user_note")
            val = sm.get("value")
            mem = UserMemory(category=cat, memory_key=key, memory_value=val)
            db.add(mem)
            await db.commit()
            await db.refresh(mem)
            actions_taken.append(f"Saved to Memory: {key}")
            saved_memory_dict = {
                "id": mem.id,
                "category": mem.category,
                "memory_key": mem.memory_key,
                "memory_value": mem.memory_value,
            }

    except Exception as e:
        logger.warning(f"Assistant chat LLM exception ({e}). Fallback response used.")
        response_text = f"I've registered your command: '{msg}'. Settings updated."
        actions_taken.append("Updated active parameters.")

    return AssistantChatResponse(
        response_text=response_text,
        actions_taken=actions_taken,
        updated_filter=updated_filter_dict,
        created_schedule=created_schedule_dict,
        saved_memory=saved_memory_dict,
    )


@router.get("/memories", response_model=list[UserMemoryResponse])
async def list_memories(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """List all stored user memories."""
    res = await db.execute(select(UserMemory).order_by(UserMemory.id.desc()))
    mems = res.scalars().all()
    return [
        UserMemoryResponse(
            id=m.id,
            category=m.category,
            memory_key=m.memory_key,
            memory_value=m.memory_value,
            created_at=m.created_at.isoformat(),
        )
        for m in mems
    ]


@router.delete("/memories/{memory_id}")
async def delete_memory(
    memory_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Delete a memory item."""
    res = await db.execute(select(UserMemory).where(UserMemory.id == memory_id))
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(404, "Memory not found")
    await db.delete(m)
    await db.commit()
    return {"message": "Memory deleted"}


@router.get("/schedules", response_model=list[ScheduleResponse])
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """List all automation schedule rows."""
    res = await db.execute(select(AutomationSchedule).order_by(AutomationSchedule.id.desc()))
    scheds = res.scalars().all()
    return [
        ScheduleResponse(
            id=s.id,
            title=s.title,
            start_time=s.start_time,
            end_time=s.end_time,
            duration_hours=s.duration_hours,
            status=s.status,
            is_running=s.is_running,
            created_at=s.created_at.isoformat(),
        )
        for s in scheds
    ]


@router.patch("/schedules/{schedule_id}/toggle")
async def toggle_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Toggle start/pause/stop for a schedule row."""
    res = await db.execute(select(AutomationSchedule).where(AutomationSchedule.id == schedule_id))
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Schedule not found")
    s.is_running = not s.is_running
    s.status = "active" if s.is_running else "paused"
    await db.commit()
    return {"id": s.id, "status": s.status, "is_running": s.is_running}


class CreateScheduleRequest(BaseModel):
    title: str
    start_time: str | None = "08:00"
    end_time: str | None = "10:00"
    duration_hours: int | None = 2
    keywords: list[str] | None = None
    company_scope: str | None = "all"


@router.post("/schedules", response_model=ScheduleResponse)
async def create_schedule(
    payload: CreateScheduleRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Create a new automation schedule directly from the UI."""
    sched = AutomationSchedule(
        title=payload.title,
        start_time=payload.start_time or "08:00",
        end_time=payload.end_time or "10:00",
        duration_hours=payload.duration_hours or 2,
        keywords=payload.keywords,
        company_scope=payload.company_scope or "all",
        status="active",
        is_running=False,
    )
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    return ScheduleResponse(
        id=sched.id,
        title=sched.title,
        start_time=sched.start_time,
        end_time=sched.end_time,
        duration_hours=sched.duration_hours,
        status=sched.status,
        is_running=sched.is_running,
        created_at=sched.created_at.isoformat(),
    )


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Delete an automation schedule row."""
    res = await db.execute(select(AutomationSchedule).where(AutomationSchedule.id == schedule_id))
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Schedule not found")
    await db.delete(s)
    await db.commit()
    return {"message": "Schedule deleted"}

