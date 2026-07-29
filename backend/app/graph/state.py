"""State models for the JobTool Graph Engine."""

from typing import Any
from pydantic import BaseModel, Field


class GraphState(BaseModel):
    """Immutable-ish state object passed through every graph node."""

    # Identity
    run_id: str = Field(description="UUID correlation ID for this entire run")
    batch_id: str = Field(description="Links to PipelineRun/Application batch_id")

    # Graph Control
    current_node: str = Field(description="The node to execute next")
    node_before_failure: str | None = Field(default=None, description="Where to return if fallback succeeds")
    error_count: int = Field(default=0, description="Consecutive error count")
    
    # Audit & Tracking
    history: list[str] = Field(default_factory=list, description="Append-only event log")
    tokens_used: int = Field(default=0, description="Estimated total LLM tokens consumed")

    # Data Payload
    filter_id: int | None = Field(default=None, description="ID of the active SearchFilter")
    resume_id: int | None = Field(default=None, description="ID of the active Resume")
    
    raw_jobs: list[dict] = Field(default_factory=list, description="Serialized RawJob dicts from sources")
    scored_jobs: list[dict] = Field(default_factory=list, description="Scored job dicts")
    matched_jobs: list[dict] = Field(default_factory=list, description="Top-N jobs selected for tailoring")

    last_prompt: str | None = Field(default=None, description="Last LLM prompt sent (for fallback retries)")
    last_prompt_json_mode: bool = Field(default=False, description="Whether last prompt required JSON")

    created_at: str | None = Field(default=None, description="ISO timestamp of run start")
