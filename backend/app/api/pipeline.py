"""Pipeline trigger and status endpoints."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.config import settings
from app.db.database import get_db
from app.db.models import PipelineRun, PipelineStatus

router = APIRouter()


class PipelineRunResponse(BaseModel):
    id: int
    batch_id: str
    status: str
    started_at: str
    finished_at: str | None
    jobs_found: int
    jobs_after_dedup: int
    jobs_matched: int
    jobs_tailored: int
    error_log: str | None

    model_config = {"from_attributes": True}


class PipelineTriggerResponse(BaseModel):
    message: str
    batch_id: str


@router.post("/run", response_model=PipelineTriggerResponse)
async def trigger_pipeline(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Manually trigger the job sourcing + tailoring pipeline."""
    from app.pipeline.orchestrator import run_pipeline

    batch_id = await run_pipeline(db, background_tasks)
    return PipelineTriggerResponse(
        message="Pipeline started successfully",
        batch_id=batch_id,
    )


@router.post("/run/cron")
async def trigger_pipeline_cron(
    background_tasks: BackgroundTasks,
    x_cron_secret: str = Header(..., alias="X-Cron-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Cron webhook endpoint — authenticated via X-Cron-Secret header."""
    if x_cron_secret != settings.cron_secret:
        raise HTTPException(403, "Invalid cron secret")

    from app.pipeline.orchestrator import run_pipeline

    batch_id = await run_pipeline(db, background_tasks)
    return PipelineTriggerResponse(
        message="Pipeline triggered by cron",
        batch_id=batch_id,
    )


@router.get("/status", response_model=PipelineRunResponse | None)
async def get_pipeline_status(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Get the most recent pipeline run status."""
    result = await db.execute(
        select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(1)
    )
    run = result.scalar_one_or_none()
    if not run:
        return None

    return PipelineRunResponse(
        id=run.id,
        batch_id=run.batch_id,
        status=run.status.value,
        started_at=run.started_at.isoformat(),
        finished_at=run.finished_at.isoformat() if run.finished_at else None,
        jobs_found=run.jobs_found,
        jobs_after_dedup=run.jobs_after_dedup,
        jobs_matched=run.jobs_matched,
        jobs_tailored=run.jobs_tailored,
        error_log=run.error_log,
    )


@router.get("/history", response_model=list[PipelineRunResponse])
async def get_pipeline_history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """List past pipeline runs."""
    result = await db.execute(
        select(PipelineRun)
        .order_by(PipelineRun.started_at.desc())
        .limit(limit)
    )
    runs = result.scalars().all()

    return [
        PipelineRunResponse(
            id=r.id,
            batch_id=r.batch_id,
            status=r.status.value,
            started_at=r.started_at.isoformat(),
            finished_at=r.finished_at.isoformat() if r.finished_at else None,
            jobs_found=r.jobs_found,
            jobs_after_dedup=r.jobs_after_dedup,
            jobs_matched=r.jobs_matched,
            jobs_tailored=r.jobs_tailored,
            error_log=r.error_log,
        )
        for r in runs
    ]
