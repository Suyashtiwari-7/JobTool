"""Search filter CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import SearchFilter

router = APIRouter()

# Supported countries with Adzuna country codes
SUPPORTED_COUNTRIES = {
    "in": "India",
    "us": "United States",
    "gb": "United Kingdom",
    "ca": "Canada",
    "au": "Australia",
    "za": "South Africa",
    "de": "Germany",
    "fr": "France",
    "br": "Brazil",
    "nl": "Netherlands",
    "nz": "New Zealand",
    "pl": "Poland",
    "sg": "Singapore",
    "at": "Austria",
    "ch": "Switzerland",
    "it": "Italy",
    "ru": "Russia",
}

EXPERIENCE_LEVELS = ["Entry", "Mid", "Senior", "Lead", "Executive"]


class FilterCreate(BaseModel):
    name: str = "Default Filter"
    countries: list[str] = Field(default_factory=lambda: ["in", "us"])
    keywords: list[str] = Field(default_factory=lambda: ["software engineer"])
    domain: str | None = None
    experience_level: str | None = None
    target_count: int = Field(default=20, ge=1, le=500)


class FilterResponse(BaseModel):
    id: int
    name: str
    countries: list[str]
    keywords: list[str]
    domain: str | None
    experience_level: str | None
    target_count: int
    is_active: bool

    model_config = {"from_attributes": True}


@router.get("/countries")
async def list_countries():
    """List all supported countries for job search."""
    return {"countries": SUPPORTED_COUNTRIES}


@router.get("/experience-levels")
async def list_experience_levels():
    """List supported experience levels."""
    return {"levels": EXPERIENCE_LEVELS}


@router.get("", response_model=FilterResponse | None)
async def get_active_filter(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Get the currently active search filter."""
    result = await db.execute(
        select(SearchFilter).where(SearchFilter.is_active.is_(True)).limit(1)
    )
    filt = result.scalar_one_or_none()
    if not filt:
        return None
    return filt


@router.post("", response_model=FilterResponse)
async def create_or_update_filter(
    body: FilterCreate,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Create or update the active search filter. Deactivates any previous filter."""
    # Validate country codes
    invalid = [c for c in body.countries if c not in SUPPORTED_COUNTRIES]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid country codes: {invalid}")

    # Deactivate existing filters
    result = await db.execute(
        select(SearchFilter).where(SearchFilter.is_active.is_(True))
    )
    for old in result.scalars().all():
        old.is_active = False

    # Create new filter
    new_filter = SearchFilter(
        name=body.name,
        countries=body.countries,
        keywords=body.keywords,
        domain=body.domain,
        experience_level=body.experience_level,
        target_count=body.target_count,
        is_active=True,
    )
    db.add(new_filter)
    await db.flush()
    await db.refresh(new_filter)
    return new_filter


@router.get("/all", response_model=list[FilterResponse])
async def list_filters(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """List all saved filters."""
    result = await db.execute(select(SearchFilter).order_by(SearchFilter.created_at.desc()))
    return result.scalars().all()
