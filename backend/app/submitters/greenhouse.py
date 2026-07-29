"""Greenhouse Direct API Submitter."""

import logging
from typing import Any
import httpx
from app.submitters.base import BaseSubmitter, SubmissionResult

logger = logging.getLogger(__name__)


class GreenhouseSubmitter(BaseSubmitter):
    """Direct HTTP POST submitter for Greenhouse job boards."""

    async def submit(self, application_data: dict[str, Any]) -> SubmissionResult:
        url = application_data.get("url", "")
        profile = application_data.get("profile", {})
        resume_pdf_path = application_data.get("resume_pdf_path")

        # Extract company slug and job id from Greenhouse URL
        # Format: https://boards.greenhouse.io/<board_token>/jobs/<job_id>
        try:
            parts = url.rstrip("/").split("/")
            job_id = parts[-1]
            board_token = parts[-3] if "jobs" in parts else parts[-2]
            
            api_endpoint = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}"
            
            # Send HTTP request to Greenhouse public application API
            async with httpx.AsyncClient(timeout=15.0) as client:
                # First check if the job is active
                res = await client.get(api_endpoint)
                if res.status_code != 200:
                    return SubmissionResult(
                        success=False,
                        status="review_required",
                        reason=f"Greenhouse job inactive or closed (HTTP {res.status_code})",
                        requires_human=True
                    )

            # Direct API submission payload
            # For public applications without custom required fields, Greenhouse accepts multipart form:
            files = {}
            if resume_pdf_path:
                try:
                    with open(resume_pdf_path, "rb") as f:
                        files["resume"] = (f"{profile.get('first_name', 'Applicant')}_Resume.pdf", f.read(), "application/pdf")
                except Exception as e:
                    logger.warning(f"Failed to attach resume PDF: {e}")

            data = {
                "first_name": profile.get("first_name", profile.get("name", "Applicant").split()[0]),
                "last_name": profile.get("last_name", profile.get("name", "Applicant").split()[-1] if len(profile.get("name", "").split()) > 1 else "User"),
                "email": profile.get("email", ""),
                "phone": profile.get("phone", ""),
            }

            async with httpx.AsyncClient(timeout=20.0) as client:
                post_res = await client.post(f"{api_endpoint}", data=data, files=files if files else None)
                
                if post_res.status_code in (200, 201):
                    return SubmissionResult(
                        success=True,
                        status="applied",
                        confirmation_id=f"GH-{job_id}"
                    )
                elif post_res.status_code in (400, 422):
                    # Form contains custom required fields not satisfied by basic payload
                    return SubmissionResult(
                        success=False,
                        status="review_required",
                        reason="Greenhouse form contains custom required screening fields",
                        requires_human=True
                    )
                else:
                    return SubmissionResult(
                        success=False,
                        status="review_required",
                        reason=f"Greenhouse API return HTTP {post_res.status_code}",
                        requires_human=True
                    )

        except Exception as e:
            logger.error(f"Greenhouse API submission error: {e}")
            return SubmissionResult(
                success=False,
                status="review_required",
                reason=f"Greenhouse API error: {str(e)}",
                requires_human=True
            )
