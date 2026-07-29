"""Core Graph Engine loop."""

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GraphRun, AgentStatus, ReviewQueue
from app.graph.state import GraphState
from app.graph.nodes import (
    guardrail_check_node,
    source_jobs_node,
    score_rank_node,
    ats_tailor_node,
    persist_db_node,
    submit_application_node,
    fallback_node,
    review_queue_node,
)

logger = logging.getLogger(__name__)

TERMINAL_STATES = {"COMPLETED", "FAILED", "PAUSED_MID_RUN"}

class JobToolGraphEngine:
    def __init__(self):
        self.nodes = {
            "GUARDRAIL_CHECK_NODE": guardrail_check_node,
            "SOURCE_JOBS_NODE": source_jobs_node,
            "SCORE_RANK_NODE": score_rank_node,
            "ATS_TAILOR_NODE": ats_tailor_node,
            "PERSIST_DB_NODE": persist_db_node,
            "SUBMIT_APPLICATION_NODE": submit_application_node,
            "FALLBACK_NODE": fallback_node,
            "REVIEW_QUEUE_NODE": review_queue_node,
        }
        self._validate_registry()

    def _validate_registry(self):
        """Ensure all nodes are properly registered."""
        required = [
            "GUARDRAIL_CHECK_NODE", "SOURCE_JOBS_NODE", "SCORE_RANK_NODE", 
            "ATS_TAILOR_NODE", "PERSIST_DB_NODE", "SUBMIT_APPLICATION_NODE",
            "FALLBACK_NODE", "REVIEW_QUEUE_NODE"
        ]
        for req in required:
            if req not in self.nodes:
                raise ValueError(f"Missing required node: {req}")

    async def _check_kill_switch(self, db: AsyncSession) -> bool:
        """Check if the agent is allowed to run."""
        res = await db.execute(select(AgentStatus).where(AgentStatus.id == 1))
        status = res.scalar_one_or_none()
        return status.is_running if status else False

    async def _persist_state(self, state: GraphState, db: AsyncSession):
        """Write-ahead state persistence."""
        res = await db.execute(select(GraphRun).where(GraphRun.id == state.run_id))
        run = res.scalar_one_or_none()
        
        is_terminal = state.current_node in TERMINAL_STATES
        
        if run:
            run.current_node = state.current_node
            run.state_json = state.model_dump()
            run.error_count = state.error_count
            run.is_terminal = is_terminal
            run.updated_at = datetime.now(timezone.utc)
        else:
            run = GraphRun(
                id=state.run_id,
                batch_id=state.batch_id,
                current_node=state.current_node,
                state_json=state.model_dump(),
                error_count=state.error_count,
                is_terminal=is_terminal,
            )
            db.add(run)
            
        await db.flush()

    async def run(self, state: GraphState, db: AsyncSession) -> GraphState:
        """The main loop."""
        step_count = 0
        max_steps = 15
        
        while state.current_node not in TERMINAL_STATES and step_count < max_steps:
            step_count += 1
            
            # 1. Kill Switch Check
            is_running = await self._check_kill_switch(db)
            if not is_running:
                logger.info(f"[{state.run_id}] Agent paused by kill switch")
                state.history.append("Agent paused by kill switch")
                state.current_node = "PAUSED_MID_RUN"
                await self._persist_state(state, db)
                await db.commit()
                break

            # 2. Look up node function
            node_func = self.nodes.get(state.current_node)
            if not node_func:
                logger.error(f"[{state.run_id}] Unknown node: {state.current_node}")
                state.history.append(f"Error: Unknown node {state.current_node}")
                state.error_count = 3 # force review queue
                state.node_before_failure = state.current_node
                state.current_node = "REVIEW_QUEUE_NODE"
                continue
                
            # 3. Write-ahead persist
            await self._persist_state(state, db)
            await db.commit()
            
            # 4. Execute node
            logger.info(f"[{state.run_id}] Executing {state.current_node} (Step {step_count})", extra={
                "run_id": state.run_id,
                "node": state.current_node,
                "error_count": state.error_count,
                "tokens_used": state.tokens_used,
            })
            
            try:
                state = await node_func(state, db)
            except Exception as e:
                logger.exception(f"[{state.run_id}] Unhandled exception in {state.current_node}: {e}")
                state.history.append(f"Unhandled exception: {e}")
                state.error_count += 1
                state.node_before_failure = state.current_node
                state.current_node = "FALLBACK_NODE"
                
        # Final persist for terminal states or max steps
        if step_count >= max_steps and state.current_node not in TERMINAL_STATES:
            state.history.append("Max steps reached, routing to REVIEW_QUEUE_NODE")
            state.error_count = 3
            state.current_node = "REVIEW_QUEUE_NODE"
            # One more loop to process review queue
            state = await review_queue_node(state, db)
            
        await self._persist_state(state, db)
        await db.commit()
        
        return state

    async def resume(self, run_id: str, db: AsyncSession) -> GraphState | None:
        """Resume a paused or failed run."""
        res = await db.execute(select(GraphRun).where(GraphRun.id == run_id))
        run = res.scalar_one_or_none()
        if not run:
            return None
            
        state = GraphState(**run.state_json)
        
        # If it was paused, and now we are resuming, we should verify the switch is on.
        # But this function just launches the loop which checks the switch immediately.
        # If it was in REVIEW_QUEUE and resolved, we need to manually adjust state before calling resume.
        
        # Assuming whoever called resume() fixed the state.current_node if needed.
        return await self.run(state, db)
