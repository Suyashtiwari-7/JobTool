"""Settings endpoints — company lists and LLM status."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.config import settings
from app.db.database import get_db
from app.db.models import CompanyList, JobSource

router = APIRouter()


class CompanyEntry(BaseModel):
    id: int | None = None
    source: str
    slug: str
    name: str | None = None
    is_enabled: bool = True

    model_config = {"from_attributes": True}


class CompanyListUpdate(BaseModel):
    companies: list[CompanyEntry]


class LLMStatus(BaseModel):
    gemini: bool
    groq: bool
    deepseek: bool


@router.get("/companies", response_model=list[CompanyEntry])
async def list_companies(
    source: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Get company slugs for Greenhouse/Lever/Ashby sources."""
    query = select(CompanyList).order_by(CompanyList.source, CompanyList.slug)
    if source:
        try:
            job_source = JobSource(source)
            query = query.where(CompanyList.source == job_source)
        except ValueError:
            raise HTTPException(400, f"Invalid source: {source}")

    result = await db.execute(query)
    companies = result.scalars().all()

    return [
        CompanyEntry(
            id=c.id,
            source=c.source.value,
            slug=c.slug,
            name=c.name,
            is_enabled=c.is_enabled,
        )
        for c in companies
    ]


@router.put("/companies")
async def update_companies(
    body: CompanyListUpdate,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Bulk update company lists. Replaces all entries for each source present."""
    # Group by source
    by_source: dict[str, list[CompanyEntry]] = {}
    for entry in body.companies:
        by_source.setdefault(entry.source, []).append(entry)

    for source_str, entries in by_source.items():
        try:
            job_source = JobSource(source_str)
        except ValueError:
            raise HTTPException(400, f"Invalid source: {source_str}")

        # Delete existing entries for this source
        result = await db.execute(
            select(CompanyList).where(CompanyList.source == job_source)
        )
        for old in result.scalars().all():
            await db.delete(old)

        # Insert new entries
        for entry in entries:
            db.add(CompanyList(
                source=job_source,
                slug=entry.slug,
                name=entry.name,
                is_enabled=entry.is_enabled,
            ))

    await db.flush()
    return {"message": "Company lists updated"}


@router.post("/companies/seed")
async def seed_default_companies(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Seed the database with default company lists (idempotent)."""
    from app.sources.company_lists import DEFAULT_COMPANIES

    added = 0
    for source_str, companies in DEFAULT_COMPANIES.items():
        job_source = JobSource(source_str)
        for slug, name in companies:
            # Check if already exists
            result = await db.execute(
                select(CompanyList).where(
                    CompanyList.source == job_source,
                    CompanyList.slug == slug,
                )
            )
            if not result.scalar_one_or_none():
                db.add(CompanyList(source=job_source, slug=slug, name=name))
                added += 1

    await db.flush()
    return {"message": f"Seeded {added} companies"}


@router.get("/llm-status", response_model=LLMStatus)
async def check_llm_status(_user: str = Depends(verify_token)):
    """Check which LLM providers have API keys configured."""
    return LLMStatus(
        gemini=bool(settings.gemini_api_key),
        groq=bool(settings.groq_api_key),
        deepseek=bool(settings.deepseek_api_key),
    )
