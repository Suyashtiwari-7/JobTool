"""Audit Log API — feed for control tower."""

import logging
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import AuditLog

logger = logging.getLogger(__name__)

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: int
    run_id: str | None = None
    action_type: str
    detail: str | None = None
    node_name: str | None = None
    created_at: str

    model_config = {"from_attributes": True}


@router.get("", response_model=list[AuditLogResponse])
async def get_audit_log(
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Fetch recent autonomous audit log entries."""
    res = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    logs = res.scalars().all()
    
    return [
        AuditLogResponse(
            id=log.id,
            run_id=log.run_id,
            action_type=log.action_type,
            detail=log.detail,
            node_name=log.node_name,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]
