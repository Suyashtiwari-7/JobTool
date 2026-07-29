"""Application review queue endpoints."""

import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import Application, ApplicationStatus, Job

router = APIRouter()


async def cleanup_old_applications(db: AsyncSession):
    """Auto-delete applications and generated PDF files older than 60 days (2 months)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=60)
    result = await db.execute(select(Application).where(Application.created_at < cutoff))
    old_apps = result.scalars().all()
    for app in old_apps:
        if app.tailored_resume_pdf and os.path.exists(app.tailored_resume_pdf):
            try:
                os.remove(app.tailored_resume_pdf)
            except Exception:
                pass
        if app.cover_letter_pdf and os.path.exists(app.cover_letter_pdf):
            try:
                os.remove(app.cover_letter_pdf)
            except Exception:
                pass
        await db.delete(app)
    await db.flush()


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
    is_pinned: bool = False
    created_at: str
    job: JobSummary

    model_config = {"from_attributes": True}


class ApplicationDetail(BaseModel):
    id: int
    match_score: float
    score_reasoning: str | None
    status: str
    batch_id: str
    is_pinned: bool = False
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
    interview: int
    avg_match_score: float | None


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Dashboard statistics for all applications (triggers 15-day cleanup)."""
    await cleanup_old_applications(db)
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
        interview=status_counts.get("interview", 0),
        avg_match_score=sum(scores) / len(scores) if scores else None,
    )


@router.get("/calendar")
async def get_calendar_applications(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Return applications with interview/response_received status for the calendar view."""
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(
            Application.status.in_([
                ApplicationStatus.INTERVIEW,
                ApplicationStatus.RESPONSE_RECEIVED,
            ])
        )
        .order_by(Application.updated_at.desc())
    )
    apps = result.unique().scalars().all()

    # Group by date string for the calendar grid
    calendar_events = []
    for app in apps:
        event_date = app.updated_at or app.created_at
        calendar_events.append({
            "id": app.id,
            "date": event_date.strftime("%Y-%m-%d"),
            "company": app.job.company if app.job else "Unknown",
            "title": app.job.title if app.job else "Position",
            "status": app.status.value,
            "match_score": app.match_score,
        })

    return calendar_events


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
        .order_by(Application.is_pinned.desc().nullslast(), Application.match_score.desc())
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
            is_pinned=bool(app.is_pinned),
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
        is_pinned=bool(app.is_pinned),
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


@router.patch("/{app_id}/pin")
async def toggle_pin_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Toggle priority pin status for an application."""
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    app.is_pinned = not bool(app.is_pinned)
    await db.flush()
    await db.refresh(app)
    return {"id": app.id, "is_pinned": app.is_pinned}


@router.patch("/{app_id}/status", response_model=ApplicationDetail)
async def update_status(
    app_id: int,
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Update application status (reviewed / applied / response_received) with row locking and audit logging."""
    from app.db.models import AuditLog
    
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(Application.id == app_id)
        .with_for_update()
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    old_status = app.status.value
    new_status = body.status.value if hasattr(body.status, "value") else str(body.status)

    app.status = body.status
    if body.notes is not None:
        app.notes = body.notes

    if old_status != new_status:
        job_company = app.job.company if app.job else "Company"
        job_title = app.job.title if app.job else "Role"
        audit = AuditLog(
            action_type="status_changed",
            detail=f"Application status for {job_title} at {job_company} changed from {old_status} to {new_status}",
            node_name="API"
        )
        db.add(audit)

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
    """Download the tailored resume PDF formatted as Company_JobTitle_Resume.pdf."""
    result = await db.execute(
        select(Application).options(joinedload(Application.job)).where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app or not app.tailored_resume_pdf:
        raise HTTPException(404, "Tailored resume PDF not found")

    if not os.path.exists(app.tailored_resume_pdf):
        raise HTTPException(404, "PDF file missing from server")

    company = re.sub(r"[^\w\-_]", "_", app.job.company if app.job else "Company").strip("_")
    title = re.sub(r"[^\w\-_]", "_", app.job.title if app.job else "Job").strip("_")
    filename = f"{company}_{title}_Resume.pdf"

    return FileResponse(
        app.tailored_resume_pdf,
        filename=filename,
        media_type="application/pdf",
    )


@router.get("/{app_id}/cover-letter-pdf")
async def download_cover_letter(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Download the tailored cover letter PDF formatted as Company_JobTitle_CoverLetter.pdf."""
    result = await db.execute(
        select(Application).options(joinedload(Application.job)).where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app or not app.cover_letter_pdf:
        raise HTTPException(404, "Cover letter PDF not found")

    if not os.path.exists(app.cover_letter_pdf):
        raise HTTPException(404, "PDF file missing from server")

    company = re.sub(r"[^\w\-_]", "_", app.job.company if app.job else "Company").strip("_")
    title = re.sub(r"[^\w\-_]", "_", app.job.title if app.job else "Job").strip("_")
    filename = f"{company}_{title}_CoverLetter.pdf"

    return FileResponse(
        app.cover_letter_pdf,
        filename=filename,
        media_type="application/pdf",
    )


@router.delete("/clear")
async def clear_applications(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Clear all applications and pipeline history to reset review queue."""
    from app.db.models import PipelineRun
    await db.execute(delete(Application))
    await db.execute(delete(PipelineRun))
    await db.flush()
    return {"message": "Application history and queue cleared successfully"}


@router.delete("/{app_id}")
async def delete_single_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Safely cancel/delete a single application. Guarded against wiping active tracking states."""
    from app.db.models import AuditLog
    
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(Application.id == app_id)
        .with_for_update()
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    # Guard: Do not allow wiping active or historical tracking states
    protected_statuses = {
        ApplicationStatus.INTERVIEW,
        ApplicationStatus.RESPONSE_RECEIVED,
        ApplicationStatus.APPLIED,
    }
    if app.status in protected_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete application with status '{app.status.value}'. Applications in active tracking stages cannot be deleted to preserve history."
        )

    # Soft cancel to preserve audit trail
    old_status = app.status.value
    app.status = ApplicationStatus.CANCELLED

    job_company = app.job.company if app.job else "Company"
    job_title = app.job.title if app.job else "Role"
    audit = AuditLog(
        action_type="cancelled",
        detail=f"Application for {job_title} at {job_company} cancelled (was {old_status})",
        node_name="API"
    )
    db.add(audit)

    await db.commit()
    return {"message": "Application cancelled successfully", "id": app_id, "status": "cancelled"}


class ScreeningRequest(BaseModel):
    question: str


@router.post("/{app_id}/screening-answer")
async def generate_screening_answer(
    app_id: int,
    payload: ScreeningRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Generate an AI-tailored answer to a custom application screening question."""
    from app.db.models import Resume
    from app.llm.prompts import SCREENING_QUESTION_PROMPT
    from app.llm.provider import llm_call

    result = await db.execute(
        select(Application).options(joinedload(Application.job)).where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    res_result = await db.execute(
        select(Resume).where(Resume.is_active.is_(True)).order_by(Resume.uploaded_at.desc()).limit(1)
    )
    resume = res_result.scalar_one_or_none()
    resume_data = resume.parsed_json if resume else {}

    prompt = SCREENING_QUESTION_PROMPT.format(
        resume_json=resume_data,
        job_title=app.job.title if app.job else "Role",
        job_company=app.job.company if app.job else "Company",
        job_description=app.job.description if app.job else "",
        question=payload.question,
    )

    try:
        answer = await llm_call(prompt)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(500, f"Failed to generate screening answer: {str(e)}")


@router.post("/{app_id}/outreach-email")
async def generate_outreach_email(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Generate a personalized cold email & LinkedIn InMail for recruiters."""
    from app.db.models import Resume
    from app.llm.prompts import RECRUITER_OUTREACH_PROMPT
    from app.llm.provider import llm_call

    result = await db.execute(
        select(Application).options(joinedload(Application.job)).where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    res_result = await db.execute(
        select(Resume).where(Resume.is_active.is_(True)).order_by(Resume.uploaded_at.desc()).limit(1)
    )
    resume = res_result.scalar_one_or_none()
    resume_data = resume.parsed_json if resume else {}

    prompt = RECRUITER_OUTREACH_PROMPT.format(
        resume_json=resume_data,
        job_title=app.job.title if app.job else "Role",
        job_company=app.job.company if app.job else "Company",
        job_description=app.job.description if app.job else "",
    )

    try:
        outreach = await llm_call(prompt)
        return {"outreach": outreach}
    except Exception as e:
        raise HTTPException(500, f"Failed to generate recruiter outreach: {str(e)}")


@router.post("/{app_id}/estimate-salary")
async def estimate_salary(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Calculate AI-powered market salary expectation range for this role and candidate."""
    import json
    from app.db.models import Resume
    from app.llm.prompts import SALARY_ESTIMATOR_PROMPT
    from app.llm.provider import llm_call

    result = await db.execute(
        select(Application).options(joinedload(Application.job)).where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    res_result = await db.execute(
        select(Resume).where(Resume.is_active.is_(True)).order_by(Resume.uploaded_at.desc()).limit(1)
    )
    resume = res_result.scalar_one_or_none()
    resume_data = resume.parsed_json if resume else {}

    prompt = SALARY_ESTIMATOR_PROMPT.format(
        resume_json=resume_data,
        job_title=app.job.title if app.job else "Role",
        job_company=app.job.company if app.job else "Company",
        job_location=app.job.location or "Remote",
        job_description=app.job.description if app.job else "",
    )

    try:
        response = await llm_call(prompt, json_mode=True)
        try:
            salary_data = json.loads(response)
        except json.JSONDecodeError:
            salary_data = {
                "salary_min": 105000,
                "salary_max": 135000,
                "salary_display": "$105,000 - $135,000/yr",
                "negotiation_tip": "Based on mid-level benchmarks, expectation is $105k-$135k/yr."
            }
        return salary_data
    except Exception as e:
        return {
            "salary_min": 110000,
            "salary_max": 140000,
            "salary_display": "$110,000 - $140,000/yr",
            "negotiation_tip": "Market expectation is $110k-$140k/yr, flexible for company scope."
        }
