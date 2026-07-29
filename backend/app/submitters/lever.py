"""Lever Direct API Submitter."""

import logging
from typing import Any
import httpx
from app.submitters.base import BaseSubmitter, SubmissionResult

logger = logging.getLogger(__name__)


class LeverSubmitter(BaseSubmitter):
    """Direct HTTP POST submitter for Lever job boards."""

    async def submit(self, application_data: dict[str, Any]) -> SubmissionResult:
        url = application_data.get("url", "")
        profile = application_data.get("profile", {})
        resume_pdf_path = application_data.get("resume_pdf_path")

        # Lever URL Format: https://jobs.lever.co/<company>/<posting_id>
        try:
            parts = url.rstrip("/").split("/")
            posting_id = parts[-1]
            company = parts[-2]
            
            api_endpoint = f"https://api.lever.co/v0/postings/{company}/{posting_id}"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(api_endpoint)
                if res.status_code != 200:
                    return SubmissionResult(
                        success=False,
                        status="review_required",
                        reason=f"Lever posting inactive or closed (HTTP {res.status_code})",
                        requires_human=True
                    )

            files = {}
            if resume_pdf_path:
                try:
                    with open(resume_pdf_path, "rb") as f:
                        files["resume"] = (f"{profile.get('name', 'Applicant')}_Resume.pdf", f.read(), "application/pdf")
                except Exception as e:
                    logger.warning(f"Failed to attach resume PDF: {e}")

            data = {
                "name": profile.get("name", "Applicant"),
                "email": profile.get("email", ""),
                "phone": profile.get("phone", ""),
                "org": profile.get("company", ""),
            }

            async with httpx.AsyncClient(timeout=20.0) as client:
                post_res = await client.post(f"{api_endpoint}/apply", data=data, files=files if files else None)
                
                if post_res.status_code in (200, 201):
                    return SubmissionResult(
                        success=True,
                        status="applied",
                        confirmation_id=f"LEV-{posting_id}"
                    )
                else:
                    return SubmissionResult(
                        success=False,
                        status="review_required",
                        reason=f"Lever API returned HTTP {post_res.status_code}",
                        requires_human=True
                    )

        except Exception as e:
            logger.error(f"Lever API submission error: {e}")
            return SubmissionResult(
                success=False,
                status="review_required",
                reason=f"Lever API error: {str(e)}",
                requires_human=True
            )
