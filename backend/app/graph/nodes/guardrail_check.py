"""Guardrail checking node with daily application cap enforcement."""

import logging
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AgentStatus, SearchFilter, Resume, Guardrails, Application, AuditLog
from app.graph.state import GraphState

logger = logging.getLogger(__name__)

async def guardrail_check_node(state: GraphState, db: AsyncSession) -> GraphState:
    """Cheap deterministic checks before any LLM call."""
    state.history.append("Entered: guardrail_check_node")

    # 1. Check Agent Status
    status_res = await db.execute(select(AgentStatus).where(AgentStatus.id == 1))
    status = status_res.scalar_one_or_none()
    if status and not status.is_running:
        state.current_node = "PAUSED_MID_RUN"
        state.history.append("Skipped: Agent is paused")
        return state

    # 2. Check Search Filter
    if not state.filter_id:
        state.current_node = "COMPLETED"
        state.history.append("Skipped: No filter_id provided")
        return state

    filter_res = await db.execute(select(SearchFilter).where(SearchFilter.id == state.filter_id))
    search_filter = filter_res.scalar_one_or_none()
    
    if not search_filter or not search_filter.keywords or search_filter.target_count <= 0:
        state.current_node = "COMPLETED"
        state.history.append("Skipped: Invalid or empty search filter")
        return state

    # 3. Check Resume
    if not state.resume_id:
        state.current_node = "COMPLETED"
        state.history.append("Skipped: No resume_id provided")
        return state

    resume_res = await db.execute(select(Resume).where(Resume.id == state.resume_id))
    resume = resume_res.scalar_one_or_none()
    
    if not resume or not resume.parsed_json:
        state.current_node = "COMPLETED"
        state.history.append("Skipped: Resume missing or not parsed")
        return state

    # 4. Check Guardrails
    guardrails_res = await db.execute(select(Guardrails).where(Guardrails.id == 1))
    guardrails = guardrails_res.scalar_one_or_none()
    if guardrails and not guardrails.is_complete:
        state.current_node = "COMPLETED"
        state.history.append("Skipped: Guardrails are incomplete")
        return state

    # 5. Enforce Daily Application Cap
    from app.db.models import ApplicationStatus
    cap = (guardrails.daily_max_applications if guardrails and guardrails.daily_max_applications is not None else 25)
    now_utc = datetime.now(timezone.utc)
    start_of_today = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

    count_res = await db.execute(
        select(func.count(Application.id)).where(
            Application.created_at >= start_of_today,
            Application.status != ApplicationStatus.CANCELLED
        )
    )
    today_count = count_res.scalar() or 0

    if today_count >= cap:
        state.current_node = "COMPLETED"
        state.history.append(f"Skipped: Daily application cap reached ({today_count}/{cap})")
        logger.info(f"[{state.run_id}] Daily application cap reached: {today_count}/{cap}")
        return state

    # All checks passed
    state.history.append(f"Guardrails passed (Today apps: {today_count}/{cap})")
    state.current_node = "SOURCE_JOBS_NODE"
    return state
