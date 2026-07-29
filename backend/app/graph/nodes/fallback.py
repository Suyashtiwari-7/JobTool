"""Fallback node."""

import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.state import GraphState
from app.llm.provider import llm_call
from app.graph.schemas import JobScoreResult, TailoredResumeResult

logger = logging.getLogger(__name__)

async def fallback_node(state: GraphState, db: AsyncSession) -> GraphState:
    """Degraded-provider retry node."""
    state.history.append("Entered: fallback_node")

    # If we haven't failed enough times yet, and we have a prompt to retry
    if state.error_count < 3 and state.last_prompt and state.node_before_failure:
        state.history.append(f"Attempting fallback retry {state.error_count}/3")
        try:
            # We explicitly downgrade to a fast/cheap model to try and clear the jam
            # For JobTool, this typically means forcing Gemini Flash
            # We'll just call llm_call again which has its own built-in retry/failover,
            # but in a real enterprise app, we might pass a `force_provider="gemini"` flag.
            
            response = await llm_call(state.last_prompt, json_mode=state.last_prompt_json_mode)
            state.tokens_used += len(state.last_prompt.split()) + len(response.split()) * 1.3
            
            # Since the failure happened in the middle of a loop (e.g. scoring 1 job), 
            # simply returning to the node isn't enough, we need to return the state successfully.
            # However, our design sends the WHOLE node to fallback if ANY job fails.
            # To properly recover, we just tell the graph to re-run the failed node.
            # The failed node should be idempotent enough or skip already processed items (we'll assume the node starts over for now).
            
            # For v2.0, we just route back and hope the transient error cleared
            state.current_node = state.node_before_failure
            state.history.append(f"Fallback retry succeeded, returning to {state.current_node}")
            return state
            
        except Exception as e:
            logger.error(f"[{state.run_id}] Fallback retry failed: {e}")
            state.error_count += 1
            state.history.append(f"Fallback retry failed: {e}")

    # Exhausted retries or no clear way to recover
    state.history.append("Retries exhausted or unrecoverable, routing to REVIEW_QUEUE_NODE")
    state.current_node = "REVIEW_QUEUE_NODE"
    return state
