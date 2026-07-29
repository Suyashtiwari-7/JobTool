"""Pydantic schemas for validating LLM outputs in the graph engine."""

from typing import List, Optional
from pydantic import BaseModel, Field


class GuardrailCheckResult(BaseModel):
    passes: bool = Field(description="True if the job passes all guardrails")
    failure_reason: Optional[str] = Field(default=None, description="Reason if it failed")


class JobScoreResult(BaseModel):
    score: int = Field(ge=0, le=100, description="0-100 relevance score")
    real_odds_score: int = Field(ge=0, le=100, description="Real odds callback probability")
    callback_tier: str = Field(description="Callback tier category string")
    reasoning: str = Field(description="Brief explanation of match quality")
    matching_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)


class TailoredResumeResult(BaseModel):
    resume_text: str = Field(description="Tailored resume content in Markdown")
    cover_letter_text: str = Field(description="Generated cover letter content in Markdown")
