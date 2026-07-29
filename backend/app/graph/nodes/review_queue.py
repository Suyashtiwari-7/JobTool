"""Review queue node."""

import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ReviewQueue, AuditLog
from app.graph.state import GraphState

logger = logging.getLogger(__name__)

async def review_queue_node(state: GraphState, db: AsyncSession) -> GraphState:
    """Dead-letter queue for failed graph runs."""
    state.history.append("Entered: review_queue_node")

    try:
        # Determine reason
        if state.error_count >= 3:
            reason = "max_retries_exceeded"
        else:
            reason = "unrecoverable_error"

        # State snapshot
        snapshot = state.model_dump()

        # Insert into ReviewQueue
        queue_item = ReviewQueue(
            run_id=state.run_id,
            reason=reason,
            state_snapshot=snapshot
        )
        db.add(queue_item)
        
        # Insert AuditLog
        audit = AuditLog(
            run_id=state.run_id,
            action_type="failed",
            detail=f"Run failed and sent to review queue. Reason: {reason}",
            node_name="REVIEW_QUEUE_NODE"
        )
        db.add(audit)
        
        await db.flush()
        
        state.history.append(f"Saved to review queue. Reason: {reason}")
        state.current_node = "FAILED"
        
    except Exception as e:
        logger.error(f"[{state.run_id}] Failed to save to review queue: {e}")
        state.history.append(f"Critical error in review_queue_node: {e}")
        state.current_node = "FAILED"

    return state
