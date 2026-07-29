"""SUBMIT_APPLICATION_NODE for v3.0 Auto-Submit Engine."""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Guardrails, Application, ApplicationStatus, ReviewQueue, AuditLog, Resume
from app.graph.state import GraphState
from app.submitters.base import detect_submitter_type
from app.submitters.greenhouse import GreenhouseSubmitter
from app.submitters.lever import LeverSubmitter
from app.submitters.ashby import AshbySubmitter
from app.submitters.web_playwright import PlaywrightSubmitter

logger = logging.getLogger(__name__)


async def submit_application_node(state: GraphState, db: AsyncSession) -> GraphState:
    """
    Submits applications using direct ATS APIs or Playwright single-worker browser.
    Gated by Guardrails.auto_submit_enabled.
    """
    state.history.append("Entered: submit_application_node")

    # 1. Dual-Mode Gating Check
    guardrails_res = await db.execute(select(Guardrails).where(Guardrails.id == 1))
    guardrails = guardrails_res.scalar_one_or_none()

    auto_submit = guardrails.auto_submit_enabled if guardrails else False

    if not auto_submit:
        state.current_node = "COMPLETED"
        state.history.append("Draft-Only Mode active (auto_submit_enabled = False). Applications preserved in QUEUED queue.")
        return state

    # 2. Get active user profile / resume data
    resume_res = await db.execute(
        select(Resume).where(Resume.id == state.resume_id if state.resume_id else 1)
    )
    resume = resume_res.scalar_one_or_none()
    user_profile = resume.parsed_json if (resume and resume.parsed_json) else {}

    # 3. Process matched jobs in current batch
    matched_jobs = state.matched_jobs or []
    if not matched_jobs:
        state.current_node = "COMPLETED"
        state.history.append("No matched jobs to submit")
        return state

    submitters = {
        "greenhouse_api": GreenhouseSubmitter(),
        "lever_api": LeverSubmitter(),
        "ashby_api": AshbySubmitter(),
        "web_playwright": PlaywrightSubmitter(),
    }

    for item in matched_jobs:
        job_data = item.get("job", {})
        job_url = job_data.get("url", "")
        job_id = job_data.get("external_id")

        # Find database Application row
        app_res = await db.execute(
            select(Application).where(
                Application.pipeline_run_id == state.run_id,
                Application.job_id == job_id
            ).with_for_update()
        )
        app_row = app_res.unique().scalar_one_or_none()
        if not app_row:
            # Try finding application by URL
            app_res = await db.execute(
                select(Application).where(Application.job_id != None).limit(1)
            )
            app_row = app_res.scalar_one_or_none()

        submitter_type = detect_submitter_type(job_url)
        submitter = submitters.get(submitter_type, submitters["web_playwright"])

        payload = {
            "url": job_url,
            "profile": user_profile,
            "resume_pdf_path": app_row.tailored_resume_pdf if app_row else None,
            "cover_letter_pdf_path": app_row.cover_letter_pdf if app_row else None,
        }

        try:
            res = await submitter.submit(payload)
            
            if res.success:
                if app_row:
                    app_row.status = ApplicationStatus.APPLIED
                audit = AuditLog(
                    action_type="auto_submitted",
                    detail=f"Successfully auto-submitted application for {job_data.get('title')} at {job_data.get('company')} via {submitter_type}",
                    node_name="SUBMIT_APPLICATION_NODE"
                )
                db.add(audit)
                state.history.append(f"Auto-submitted: {job_data.get('title')} via {submitter_type}")
            else:
                # Require human review via ReviewQueue — non-regressive PDF preservation
                if app_row:
                    app_row.status = ApplicationStatus.REVIEW_REQUIRED

                queue_item = ReviewQueue(
                    run_id=state.run_id,
                    node_name="SUBMIT_APPLICATION_NODE",
                    error_message=f"Human review required: {res.reason}",
                    failed_state_json={
                        "job": job_data,
                        "reason": res.reason,
                        "tailored_resume_pdf": app_row.tailored_resume_pdf if app_row else None,
                        "cover_letter_pdf": app_row.cover_letter_pdf if app_row else None,
                    },
                    is_resolved=False
                )
                db.add(queue_item)
                state.history.append(f"Review Required ({job_data.get('title')}): {res.reason}")

        except Exception as err:
            logger.error(f"Error submitting {job_url}: {err}")
            if app_row:
                app_row.status = ApplicationStatus.REVIEW_REQUIRED
            queue_item = ReviewQueue(
                run_id=state.run_id,
                node_name="SUBMIT_APPLICATION_NODE",
                error_message=f"Submission failure: {str(err)}",
                failed_state_json={"job": job_data, "reason": str(err)},
                is_resolved=False
            )
            db.add(queue_item)

    await db.flush()
    state.current_node = "COMPLETED"
    return state
