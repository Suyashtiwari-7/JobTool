"""AI Co-Pilot Assistant API — Conversational Brain with Multi-Turn Memory.

The assistant acts as a full ChatGPT-level chatbot specialized for job hunting.
It remembers conversation history, auto-fills user profile from chat,
and asks questions one at a time naturally.
"""

import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import (
    AutomationSchedule, SearchFilter, UserMemory, ChatMessage
)
from app.llm.provider import llm_chat

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request/Response Models ──────────────────────────────

class ChatMessageRequest(BaseModel):
    message: str


class AssistantChatResponse(BaseModel):
    response_text: str
    actions_taken: list[str] = Field(default_factory=list)
    updated_filter: dict | None = None
    created_schedule: dict | None = None
    saved_memory: dict | None = None
    profile_updates: dict | None = None


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
    days_of_week: list[str] | None
    repeat_type: str | None
    target_count: int | None
    status: str
    is_running: bool
    total_runs: int
    created_at: str

    model_config = {"from_attributes": True}


class ProfileFieldUpdate(BaseModel):
    value: str


# ── System Prompt — The Core Brain ───────────────────────

SYSTEM_PROMPT = """You are JobTool AI — a brilliant, friendly career co-pilot and general-purpose AI assistant.

## Your Personality
- You are warm, direct, and genuinely helpful — like a smart friend who happens to be a career expert.
- You can answer ANY question (tech, career, general knowledge) like ChatGPT/Claude/Gemini.
- But your superpower is job hunting: finding roles, tailoring resumes, coaching interviews, and strategizing careers.

## How You Operate
1. **Ask questions ONE AT A TIME**, naturally. Never dump a list of 5 questions at once.
2. **Remember everything** the user tells you. Their profile builds progressively through conversation.
3. **Be proactive** — if you notice the user hasn't shared something important (like their location), gently ask.
4. **Always tailor** — when the user asks you to apply for jobs, you ALWAYS create ATS-friendly tailored resumes and cover letters. This is not optional.

## When User Gives a Job Command (e.g. "Apply for 50 AI roles")
Ask clarifying questions ONE AT A TIME in this order (skip if already known from memory):
1. "Are we targeting India or International? Remote, Hybrid, or On-site?"
2. "Any preference for company type — Startups, Mid-size, or Enterprise? Or open to anything?"
Then confirm and start. YOU analyze salary/market — never ask the user about salary expectations.
For role matching: if the user's profile matches 8/10 skills in a JD, that's a match (1-2 missing = acceptable upskilling).

## Profile Auto-Fill
When you learn personal info from conversation, include a "profile_updates" field in your JSON response.
Categories: "personal" (name, email, phone, location, citizenship), "links" (linkedin, github, portfolio), 
"career" (current_role, experience_years, skills), "boundaries" (disability, legal_charges, work_auth, sponsorship)

## Response Format
Respond ONLY with a JSON object:
{{
  "response_text": "Your natural conversational response to the user. Use markdown formatting.",
  "profile_updates": {{
    "category": "personal|links|career|boundaries",
    "updates": {{"field_key": "value", ...}}
  }} or null,
  "update_filter": {{
    "keywords": ["list", "of", "keywords"] or null,
    "experience_level": "Entry" | "Mid" | "Senior" or null,
    "company_scope": "big_tech" | "startups" | "all" or null,
    "target_count": number or null,
    "countries": ["in", "us", "gb"] or null
  }} or null,
  "create_schedule": {{
    "title": "Schedule title",
    "start_time": "08:00" or null,
    "end_time": "10:00" or null,
    "duration_hours": 2 or null,
    "days_of_week": ["Mon", "Tue", "Wed"] or null,
    "repeat_type": "daily" | "weekly" | "custom" | "once",
    "target_count": 10
  }} or null,
  "save_memory": {{
    "category": "preference" | "note" | "availability",
    "key": "short_key",
    "value": "full text"
  }} or null,
  "pipeline_action": "start" | "pause" | "stop" or null
}}

## Current User Profile
{user_profile}

## User Memories
{memories_summary}
"""


# ── Chat Endpoint ────────────────────────────────────────

@router.post("/chat", response_model=AssistantChatResponse)
async def chat_with_assistant(
    payload: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Process conversational messages with full multi-turn memory."""
    msg = payload.message.strip()
    if not msg:
        raise HTTPException(400, "Message cannot be empty")

    # 1. Save the user's message to chat history
    user_chat = ChatMessage(role="user", content=msg)
    db.add(user_chat)
    await db.flush()

    # 2. Load conversation history (last 30 messages for context window)
    history_res = await db.execute(
        select(ChatMessage).order_by(ChatMessage.id.desc()).limit(30)
    )
    history_rows = list(reversed(history_res.scalars().all()))

    # 3. Load user profile from memories
    profile_res = await db.execute(select(UserMemory).order_by(UserMemory.id.desc()))
    all_memories = profile_res.scalars().all()
    
    # Separate profile data from general memories
    profile_data = {}
    general_memories = []
    for m in all_memories:
        if m.category in ("personal", "links", "career", "boundaries"):
            profile_data[m.memory_key] = m.memory_value
        else:
            general_memories.append(f"{m.memory_key}: {m.memory_value}")

    profile_summary = json.dumps(profile_data, indent=2) if profile_data else "No profile data yet. Ask the user about themselves naturally."
    memories_summary = json.dumps(general_memories[:20]) if general_memories else "No memories yet."

    # 4. Build multi-turn messages array
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(
            user_profile=profile_summary,
            memories_summary=memories_summary,
        )}
    ]
    for row in history_rows:
        messages.append({"role": row.role, "content": row.content})

    # 5. Call LLM with full conversation context
    actions_taken = []
    updated_filter_dict = None
    created_schedule_dict = None
    saved_memory_dict = None
    profile_updates_dict = None
    response_text = "I've processed your request."

    try:
        raw_response = await llm_chat(messages, json_mode=True)
        data = json.loads(raw_response)
        response_text = data.get("response_text", response_text)

        # 6. Process profile auto-fill updates
        pu = data.get("profile_updates")
        if pu and pu.get("updates"):
            category = pu.get("category", "personal")
            for field_key, field_value in pu["updates"].items():
                # Upsert: update if exists, insert if not
                existing = await db.execute(
                    select(UserMemory).where(
                        UserMemory.category == category,
                        UserMemory.memory_key == field_key,
                    )
                )
                existing_mem = existing.scalar_one_or_none()
                if existing_mem:
                    existing_mem.memory_value = str(field_value)
                    existing_mem.updated_at = datetime.now(timezone.utc)
                else:
                    db.add(UserMemory(
                        category=category,
                        memory_key=field_key,
                        memory_value=str(field_value),
                    ))
                actions_taken.append(f"Profile updated: {field_key} = {field_value}")
            profile_updates_dict = pu
            await db.flush()

        # 7. Update Search Filter if specified
        uf = data.get("update_filter")
        if uf and any(v for v in uf.values() if v is not None):
            filt_res = await db.execute(
                select(SearchFilter).where(SearchFilter.is_active.is_(True)).limit(1)
            )
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
                actions_taken.append(f"Set experience to {uf['experience_level']}")
            if uf.get("company_scope"):
                filt.domain = f"scope_{uf['company_scope']}"
                actions_taken.append(f"Set scope to {uf['company_scope']}")
            if uf.get("target_count"):
                filt.target_count = uf["target_count"]
            if uf.get("countries"):
                filt.countries = uf["countries"]
                actions_taken.append(f"Set countries: {', '.join(uf['countries'])}")

            updated_filter_dict = {
                "keywords": filt.keywords,
                "experience_level": filt.experience_level,
                "domain": filt.domain,
            }

        # 8. Create Automation Schedule if specified
        cs = data.get("create_schedule")
        if cs and cs.get("title"):
            sched = AutomationSchedule(
                title=cs["title"],
                start_time=cs.get("start_time") or "08:00",
                end_time=cs.get("end_time") or "10:00",
                duration_hours=cs.get("duration_hours") or 2,
                days_of_week=cs.get("days_of_week"),
                repeat_type=cs.get("repeat_type") or "daily",
                target_count=cs.get("target_count") or 10,
                status="active",
                is_running=True,
            )
            db.add(sched)
            await db.flush()
            actions_taken.append(f"Created schedule: {cs['title']}")
            created_schedule_dict = {
                "id": sched.id,
                "title": sched.title,
                "status": sched.status,
            }

        # 9. Save general memory if specified
        sm = data.get("save_memory")
        if sm and sm.get("key"):
            db.add(UserMemory(
                category=sm.get("category", "preference"),
                memory_key=sm["key"],
                memory_value=sm["value"],
            ))
            actions_taken.append(f"Remembered: {sm['key']}")
            saved_memory_dict = sm

        # 10. Handle pipeline action
        pa = data.get("pipeline_action")
        if pa == "start":
            actions_taken.append("Pipeline started")
        elif pa == "pause":
            actions_taken.append("Pipeline paused")
        elif pa == "stop":
            actions_taken.append("Pipeline stopped")

    except json.JSONDecodeError:
        # If LLM returns plain text instead of JSON, use it as response
        response_text = raw_response if raw_response else response_text
    except Exception as e:
        logger.error(f"Assistant chat error: {e}", exc_info=True)
        response_text = f"I encountered an issue processing your request. Let me try again. Error: {str(e)}"

    # 11. Save the assistant's response to chat history
    assistant_chat = ChatMessage(
        role="assistant",
        content=response_text,
        metadata_json={"actions_taken": actions_taken} if actions_taken else None,
    )
    db.add(assistant_chat)
    await db.commit()

    return AssistantChatResponse(
        response_text=response_text,
        actions_taken=actions_taken,
        updated_filter=updated_filter_dict,
        created_schedule=created_schedule_dict,
        saved_memory=saved_memory_dict,
        profile_updates=profile_updates_dict,
    )


# ── Chat History Endpoints ───────────────────────────────

@router.get("/chat/history")
async def get_chat_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Return recent chat messages for the conversation UI."""
    res = await db.execute(
        select(ChatMessage).order_by(ChatMessage.id.desc()).limit(limit)
    )
    rows = list(reversed(res.scalars().all()))
    return [
        {
            "id": r.id,
            "role": r.role,
            "content": r.content,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.delete("/chat/history")
async def clear_chat_history(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Clear all chat history."""
    await db.execute(delete(ChatMessage))
    await db.commit()
    return {"status": "cleared"}


# ── Profile Endpoints ────────────────────────────────────

@router.get("/profile")
async def get_profile(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Return all user profile data grouped by category."""
    res = await db.execute(select(UserMemory).order_by(UserMemory.category, UserMemory.id))
    all_memories = res.scalars().all()

    grouped = {}
    for m in all_memories:
        if m.category not in grouped:
            grouped[m.category] = []
        grouped[m.category].append({
            "id": m.id,
            "key": m.memory_key,
            "value": m.memory_value,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        })

    return {"profile": grouped}


@router.patch("/profile/{memory_id}")
async def update_profile_field(
    memory_id: int,
    payload: ProfileFieldUpdate,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Update a specific profile field value (the edit pencil button)."""
    res = await db.execute(select(UserMemory).where(UserMemory.id == memory_id))
    mem = res.scalar_one_or_none()
    if not mem:
        raise HTTPException(404, "Memory field not found")

    mem.memory_value = payload.value
    mem.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {"status": "updated", "id": mem.id, "key": mem.memory_key, "value": mem.memory_value}


# ── Memory Endpoints (existing) ──────────────────────────

@router.get("/memories", response_model=list[UserMemoryResponse])
async def list_memories(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Return all user memories."""
    res = await db.execute(select(UserMemory).order_by(UserMemory.id.desc()))
    rows = res.scalars().all()
    return [
        UserMemoryResponse(
            id=r.id,
            category=r.category,
            memory_key=r.memory_key,
            memory_value=r.memory_value,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


@router.delete("/memories/{memory_id}")
async def delete_memory(
    memory_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Delete a specific user memory."""
    res = await db.execute(select(UserMemory).where(UserMemory.id == memory_id))
    mem = res.scalar_one_or_none()
    if not mem:
        raise HTTPException(404, "Memory not found")
    await db.delete(mem)
    await db.commit()
    return {"status": "deleted"}


# ── Schedule CRUD Endpoints ──────────────────────────────

@router.get("/schedules", response_model=list[ScheduleResponse])
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Return all automation schedules."""
    res = await db.execute(select(AutomationSchedule).order_by(AutomationSchedule.id.desc()))
    rows = res.scalars().all()
    return [
        ScheduleResponse(
            id=r.id,
            title=r.title,
            start_time=r.start_time,
            end_time=r.end_time,
            duration_hours=r.duration_hours,
            days_of_week=r.days_of_week,
            repeat_type=r.repeat_type,
            target_count=r.target_count,
            status=r.status,
            is_running=r.is_running,
            total_runs=r.total_runs or 0,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


class CreateScheduleRequest(BaseModel):
    title: str
    start_time: str = "08:00"
    end_time: str = "10:00"
    duration_hours: int = 2
    days_of_week: list[str] | None = None
    repeat_type: str = "daily"
    target_count: int = 10
    keywords: list[str] | None = None


@router.post("/schedules")
async def create_schedule(
    payload: CreateScheduleRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Create a new automation schedule."""
    sched = AutomationSchedule(
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_hours=payload.duration_hours,
        days_of_week=payload.days_of_week,
        repeat_type=payload.repeat_type,
        target_count=payload.target_count,
        keywords=payload.keywords,
        status="active",
        is_running=False,
    )
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    return {"status": "created", "id": sched.id, "title": sched.title}


@router.patch("/schedules/{schedule_id}/toggle")
async def toggle_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Toggle a schedule between active/paused."""
    res = await db.execute(select(AutomationSchedule).where(AutomationSchedule.id == schedule_id))
    sched = res.scalar_one_or_none()
    if not sched:
        raise HTTPException(404, "Schedule not found")

    sched.status = "paused" if sched.status == "active" else "active"
    sched.is_running = sched.status == "active"
    await db.commit()
    return {"status": sched.status, "id": sched.id}


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Delete a schedule."""
    res = await db.execute(select(AutomationSchedule).where(AutomationSchedule.id == schedule_id))
    sched = res.scalar_one_or_none()
    if not sched:
        raise HTTPException(404, "Schedule not found")
    await db.delete(sched)
    await db.commit()
    return {"status": "deleted"}
