"""Agent API — Kill Switch endpoints with explicit id=1 singleton and atomic locking."""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import AgentStatus, AuditLog

logger = logging.getLogger(__name__)

router = APIRouter()


class AgentStatusResponse(BaseModel):
    is_running: bool
    paused_reason: str | None = None
    paused_at: str | None = None
    updated_at: str | None = None

    model_config = {"from_attributes": True}


class PauseAgentRequest(BaseModel):
    reason: str = "User initiated pause"


class ResumeAgentRequest(BaseModel):
    confirm: bool = Field(..., description="Must be explicitly set to True to resume autonomous operations")


@router.get("/status", response_model=AgentStatusResponse)
async def get_agent_status(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Get the current kill switch status of the agent (Singleton id=1)."""
    res = await db.execute(select(AgentStatus).where(AgentStatus.id == 1))
    status = res.scalar_one_or_none()
    
    if not status:
        # Default to paused until explicitly turned on
        status = AgentStatus(id=1, is_running=False, paused_reason="Initial system state")
        db.add(status)
        await db.commit()
        await db.refresh(status)

    return AgentStatusResponse(
        is_running=status.is_running,
        paused_reason=status.paused_reason,
        paused_at=status.paused_at.isoformat() if status.paused_at else None,
        updated_at=status.updated_at.isoformat() if status.updated_at else None,
    )


@router.post("/pause", response_model=AgentStatusResponse)
async def pause_agent(
    req: PauseAgentRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Pause the autonomous agent (Kill Switch) with row-level locking on singleton id=1."""
    res = await db.execute(select(AgentStatus).where(AgentStatus.id == 1).with_for_update())
    status = res.scalar_one_or_none()
    
    now = datetime.now(timezone.utc)
    if not status:
        status = AgentStatus(id=1, is_running=False, paused_reason=req.reason, paused_at=now)
        db.add(status)
    else:
        status.is_running = False
        status.paused_reason = req.reason
        status.paused_at = now

    audit = AuditLog(
        action_type="paused",
        detail=f"Agent paused: {req.reason}",
        node_name="API"
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(status)

    return AgentStatusResponse(
        is_running=status.is_running,
        paused_reason=status.paused_reason,
        paused_at=status.paused_at.isoformat() if status.paused_at else None,
        updated_at=status.updated_at.isoformat() if status.updated_at else None,
    )


@router.post("/resume", response_model=AgentStatusResponse)
async def resume_agent(
    req: ResumeAgentRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Resume the autonomous agent (Requires confirm: true payload)."""
    if not req.confirm:
        raise HTTPException(
            status_code=400,
            detail="Resume operation rejected. Request must explicitly set 'confirm: true'."
        )

    res = await db.execute(select(AgentStatus).where(AgentStatus.id == 1).with_for_update())
    status = res.scalar_one_or_none()
    
    if not status:
        status = AgentStatus(id=1, is_running=True)
        db.add(status)
    else:
        status.is_running = True
        status.paused_reason = None
        status.paused_at = None

    audit = AuditLog(
        action_type="resumed",
        detail="Agent resumed by user with explicit confirmation",
        node_name="API"
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(status)

    return AgentStatusResponse(
        is_running=status.is_running,
        paused_reason=status.paused_reason,
        paused_at=status.paused_at.isoformat() if status.paused_at else None,
        updated_at=status.updated_at.isoformat() if status.updated_at else None,
    )
