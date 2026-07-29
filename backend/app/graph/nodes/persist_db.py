"""Persist to DB node."""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobSource, Application, ApplicationStatus, AuditLog
from app.graph.state import GraphState

logger = logging.getLogger(__name__)

async def persist_db_node(state: GraphState, db: AsyncSession) -> GraphState:
    """Save finalized jobs and applications to the DB idempotently."""
    state.history.append("Entered: persist_db_node")

    try:
        for item in state.matched_jobs:
            job_dict = item["job"]
            score_data = item["score_data"]
            
            # Idempotency check: does this application already exist for this batch?
            existing_job_res = await db.execute(
                select(Job).where(
                    Job.external_id == job_dict["external_id"],
                    Job.source == JobSource(job_dict["source"]),
                )
            )
            job_record = existing_job_res.scalar_one_or_none()

            if not job_record:
                job_record = Job(
                    external_id=job_dict["external_id"],
                    source=JobSource(job_dict["source"]),
                    title=job_dict["title"],
                    company=job_dict["company"],
                    location=job_dict["location"],
                    description=job_dict["description"],
                    url=job_dict["url"],
                    salary_min=job_dict["salary_min"],
                    salary_max=job_dict["salary_max"],
                    salary_currency=job_dict["salary_currency"],
                    posted_at=job_dict["posted_at"],
                    raw_json=job_dict["raw_json"],
                )
                db.add(job_record)
                await db.flush()

            existing_app_res = await db.execute(
                select(Application).where(
                    Application.job_id == job_record.id,
                    Application.batch_id == state.batch_id
                )
            )
            existing_app = existing_app_res.scalar_one_or_none()
            
            if existing_app:
                state.history.append(f"Skipped duplicate application for {job_dict['company']}")
                continue

            # Save application record
            application = Application(
                job_id=job_record.id,
                resume_id=state.resume_id,
                filter_id=state.filter_id,
                batch_id=state.batch_id,
                match_score=score_data.get("score", 0),
                score_reasoning=score_data.get("reasoning", ""),
                tailored_resume_text=item.get("tailored_resume_text"),
                tailored_resume_pdf=item.get("resume_pdf_path"),
                cover_letter_text=item.get("cover_letter_text"),
                cover_letter_pdf=item.get("cl_pdf_path"),
                status=ApplicationStatus.QUEUED,
            )
            db.add(application)
            await db.flush()
            
            audit = AuditLog(
                run_id=state.run_id,
                action_type="tailored",
                detail=f"Tailored resume and created application for {job_dict['title']} at {job_dict['company']}",
                node_name="PERSIST_DB_NODE"
            )
            db.add(audit)
            
        await db.flush()
        state.history.append(f"Persisted {len(state.matched_jobs)} applications")
        state.current_node = "SUBMIT_APPLICATION_NODE"
        
    except Exception as e:
        logger.error(f"[{state.run_id}] Persist DB failed: {e}")
        state.history.append(f"Error in persist_db_node: {e}")
        state.error_count += 1
        state.node_before_failure = "PERSIST_DB_NODE"
        state.current_node = "FALLBACK_NODE"

    return state
