"""Application review queue endpoints."""

import os

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import Application, ApplicationStatus, Job

router = APIRouter()


class JobSummary(BaseModel):
    id: int
    title: str
    company: str
    location: str | None
    url: str
    source: str

    model_config = {"from_attributes": True}


class ApplicationSummary(BaseModel):
    id: int
    match_score: float
    status: str
    batch_id: str
    created_at: str
    job: JobSummary

    model_config = {"from_attributes": True}


class ApplicationDetail(BaseModel):
    id: int
    match_score: float
    score_reasoning: str | None
    status: str
    batch_id: str
    tailored_resume_text: str | None
    cover_letter_text: str | None
    notes: str | None
    created_at: str
    updated_at: str
    job: JobSummary

    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: ApplicationStatus
    notes: str | None = None


class DashboardStats(BaseModel):
    total: int
    queued: int
    reviewed: int
    applied: int
    response_received: int
    avg_match_score: float | None


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Dashboard statistics for all applications."""
    result = await db.execute(select(Application))
    apps = result.scalars().all()

    status_counts = {s.value: 0 for s in ApplicationStatus}
    scores = []
    for app in apps:
        status_counts[app.status.value] = status_counts.get(app.status.value, 0) + 1
        scores.append(app.match_score)

    return DashboardStats(
        total=len(apps),
        queued=status_counts.get("queued", 0),
        reviewed=status_counts.get("reviewed", 0),
        applied=status_counts.get("applied", 0),
        response_received=status_counts.get("response_received", 0),
        avg_match_score=sum(scores) / len(scores) if scores else None,
    )


@router.get("", response_model=list[ApplicationSummary])
async def list_applications(
    status: ApplicationStatus | None = Query(None),
    batch_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """List applications with optional filtering by status or batch."""
    query = (
        select(Application)
        .options(joinedload(Application.job))
        .order_by(Application.match_score.desc())
    )

    if status:
        query = query.where(Application.status == status)
    if batch_id:
        query = query.where(Application.batch_id == batch_id)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    apps = result.unique().scalars().all()

    return [
        ApplicationSummary(
            id=app.id,
            match_score=app.match_score,
            status=app.status.value,
            batch_id=app.batch_id,
            created_at=app.created_at.isoformat(),
            job=JobSummary(
                id=app.job.id,
                title=app.job.title,
                company=app.job.company,
                location=app.job.location,
                url=app.job.url,
                source=app.job.source.value,
            ),
        )
        for app in apps
    ]


@router.get("/{app_id}", response_model=ApplicationDetail)
async def get_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Get full details of a specific application."""
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    return ApplicationDetail(
        id=app.id,
        match_score=app.match_score,
        score_reasoning=app.score_reasoning,
        status=app.status.value,
        batch_id=app.batch_id,
        tailored_resume_text=app.tailored_resume_text,
        cover_letter_text=app.cover_letter_text,
        notes=app.notes,
        created_at=app.created_at.isoformat(),
        updated_at=app.updated_at.isoformat(),
        job=JobSummary(
            id=app.job.id,
            title=app.job.title,
            company=app.job.company,
            location=app.job.location,
            url=app.job.url,
            source=app.job.source.value,
        ),
    )


@router.patch("/{app_id}/status", response_model=ApplicationDetail)
async def update_status(
    app_id: int,
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Update application status (reviewed / applied / response_received)."""
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    app.status = body.status
    if body.notes is not None:
        app.notes = body.notes

    await db.flush()
    await db.refresh(app)

    return ApplicationDetail(
        id=app.id,
        match_score=app.match_score,
        score_reasoning=app.score_reasoning,
        status=app.status.value,
        batch_id=app.batch_id,
        tailored_resume_text=app.tailored_resume_text,
        cover_letter_text=app.cover_letter_text,
        notes=app.notes,
        created_at=app.created_at.isoformat(),
        updated_at=app.updated_at.isoformat(),
        job=JobSummary(
            id=app.job.id,
            title=app.job.title,
            company=app.job.company,
            location=app.job.location,
            url=app.job.url,
            source=app.job.source.value,
        ),
    )


@router.get("/{app_id}/resume-pdf")
async def download_tailored_resume(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Download the tailored resume PDF for an application."""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    app = result.scalar_one_or_none()
    if not app or not app.tailored_resume_pdf:
        raise HTTPException(404, "Tailored resume PDF not found")

    if not os.path.exists(app.tailored_resume_pdf):
        raise HTTPException(404, "PDF file missing from server")

    return FileResponse(
        app.tailored_resume_pdf,
        filename=f"resume_{app.batch_id}_{app_id}.pdf",
        media_type="application/pdf",
    )


@router.get("/{app_id}/cover-letter-pdf")
async def download_cover_letter(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Download the tailored cover letter PDF for an application."""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    app = result.scalar_one_or_none()
    if not app or not app.cover_letter_pdf:
        raise HTTPException(404, "Cover letter PDF not found")

    if not os.path.exists(app.cover_letter_pdf):
        raise HTTPException(404, "PDF file missing from server")

    return FileResponse(
        app.cover_letter_pdf,
        filename=f"cover_letter_{app.batch_id}_{app_id}.pdf",
        media_type="application/pdf",
    )
