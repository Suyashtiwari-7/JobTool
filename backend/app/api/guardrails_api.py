"""Guardrails API — user safety constraints with singleton id=1 enforcement and daily cap."""

import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import Guardrails

logger = logging.getLogger(__name__)

router = APIRouter()


class GuardrailsRequest(BaseModel):
    min_salary: int | None = None
    blocked_companies: list[str] = []
    required_keywords: list[str] = []
    excluded_keywords: list[str] = []
    max_commute_km: int | None = None
    remote_only: bool = False
    daily_max_applications: int | None = 25
    auto_submit_enabled: bool = False


class GuardrailsResponse(BaseModel):
    id: int
    min_salary: int | None = None
    blocked_companies: list[str] = []
    required_keywords: list[str] = []
    excluded_keywords: list[str] = []
    max_commute_km: int | None = None
    remote_only: bool = False
    daily_max_applications: int | None = 25
    auto_submit_enabled: bool = False
    is_complete: bool = False

    model_config = {"from_attributes": True}


@router.get("", response_model=GuardrailsResponse)
async def get_guardrails(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Get current guardrails setting (Singleton id=1)."""
    res = await db.execute(select(Guardrails).where(Guardrails.id == 1))
    g = res.scalar_one_or_none()
    
    if not g:
        g = Guardrails(id=1, daily_max_applications=25, auto_submit_enabled=False)
        db.add(g)
        await db.commit()
        await db.refresh(g)

    return GuardrailsResponse(
        id=g.id,
        min_salary=g.min_salary,
        blocked_companies=g.blocked_companies or [],
        required_keywords=g.required_keywords or [],
        excluded_keywords=g.excluded_keywords or [],
        max_commute_km=g.max_commute_km,
        remote_only=g.remote_only,
        daily_max_applications=g.daily_max_applications if g.daily_max_applications is not None else 25,
        auto_submit_enabled=bool(g.auto_submit_enabled),
        is_complete=g.is_complete,
    )


@router.post("", response_model=GuardrailsResponse)
async def update_guardrails(
    req: GuardrailsRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Save or update guardrails (Singleton id=1)."""
    res = await db.execute(select(Guardrails).where(Guardrails.id == 1).with_for_update())
    g = res.scalar_one_or_none()
    
    if not g:
        g = Guardrails(id=1)
        db.add(g)

    g.min_salary = req.min_salary
    g.blocked_companies = req.blocked_companies
    g.required_keywords = req.required_keywords
    g.excluded_keywords = req.excluded_keywords
    g.max_commute_km = req.max_commute_km
    g.remote_only = req.remote_only
    g.daily_max_applications = req.daily_max_applications if req.daily_max_applications is not None else 25
    g.auto_submit_enabled = req.auto_submit_enabled

    g.is_complete = True

    await db.commit()
    await db.refresh(g)

    return GuardrailsResponse(
        id=g.id,
        min_salary=g.min_salary,
        blocked_companies=g.blocked_companies or [],
        required_keywords=g.required_keywords or [],
        excluded_keywords=g.excluded_keywords or [],
        max_commute_km=g.max_commute_km,
        remote_only=g.remote_only,
        daily_max_applications=g.daily_max_applications,
        auto_submit_enabled=bool(g.auto_submit_enabled),
        is_complete=g.is_complete,
    )
