"""Review Queue API — dead-letter queue resolution with double-retry guard."""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import ReviewQueue
from app.graph.engine import JobToolGraphEngine

logger = logging.getLogger(__name__)

router = APIRouter()


class ReviewQueueResponse(BaseModel):
    id: int
    run_id: str
    reason: str
    state_snapshot: dict
    is_resolved: bool
    created_at: str
    resolved_at: str | None = None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ReviewQueueResponse])
async def get_review_queue(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """List items requiring review in the dead-letter queue."""
    res = await db.execute(
        select(ReviewQueue)
        .where(ReviewQueue.is_resolved.is_(False))
        .order_by(ReviewQueue.created_at.desc())
    )
    items = res.scalars().all()

    return [
        ReviewQueueResponse(
            id=item.id,
            run_id=item.run_id,
            reason=item.reason,
            state_snapshot=item.state_snapshot,
            is_resolved=item.is_resolved,
            created_at=item.created_at.isoformat(),
            resolved_at=item.resolved_at.isoformat() if item.resolved_at else None,
        )
        for item in items
    ]


@router.post("/{id}/resolve")
async def resolve_review_item(
    id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Mark a review queue item as resolved."""
    res = await db.execute(select(ReviewQueue).where(ReviewQueue.id == id).with_for_update())
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Review queue item not found")

    if item.is_resolved:
        return {"message": "Review queue item was already marked as resolved"}

    item.is_resolved = True
    item.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Review queue item marked as resolved"}


@router.post("/{id}/retry")
async def retry_review_item(
    id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Re-enter the graph engine from a saved review snapshot (guarded against concurrent duplicate retries)."""
    res = await db.execute(select(ReviewQueue).where(ReviewQueue.id == id).with_for_update())
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Review queue item not found")

    if item.is_resolved:
        raise HTTPException(400, "Review queue item is already resolved or currently being retried.")

    # Mark as resolved immediately to prevent race conditions on fast double clicks
    item.is_resolved = True
    item.resolved_at = datetime.now(timezone.utc)
    await db.commit()

    run_id = item.run_id
    
    async def resume_bg(r_id: str):
        from app.db.database import async_session
        async with async_session() as bg_session:
            engine = JobToolGraphEngine()
            from app.db.models import GraphRun
            from app.graph.state import GraphState
            
            run_res = await bg_session.execute(select(GraphRun).where(GraphRun.id == r_id))
            g_run = run_res.scalar_one_or_none()
            if g_run:
                state = GraphState(**g_run.state_json)
                state.current_node = state.node_before_failure or "GUARDRAIL_CHECK_NODE"
                state.error_count = 0
                await engine.run(state, bg_session)

    background_tasks.add_task(resume_bg, run_id)
    return {"message": "Retry launched in background", "run_id": run_id}
