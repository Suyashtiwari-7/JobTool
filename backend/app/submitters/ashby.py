"""Ashby Direct API Submitter."""

import logging
from typing import Any
import httpx
from app.submitters.base import BaseSubmitter, SubmissionResult

logger = logging.getLogger(__name__)


class AshbySubmitter(BaseSubmitter):
    """Direct HTTP POST submitter for Ashby job boards."""

    async def submit(self, application_data: dict[str, Any]) -> SubmissionResult:
        url = application_data.get("url", "")
        profile = application_data.get("profile", {})

        # Ashby URL Format: https://jobs.ashbyhq.com/<company>/<posting_id>
        try:
            parts = url.rstrip("/").split("/")
            posting_id = parts[-1]
            company = parts[-2]
            
            # Ashby public posting API endpoint
            api_endpoint = f"https://api.ashbyhq.com/posting.info?jobPostingId={posting_id}"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(api_endpoint)
                if res.status_code != 200:
                    return SubmissionResult(
                        success=False,
                        status="review_required",
                        reason=f"Ashby posting inactive or closed (HTTP {res.status_code})",
                        requires_human=True
                    )

            # Ashby web form auto-submit requires Ashby GraphQL mutation or Playwright worker
            # Bypassing to review required for custom form mapping safety:
            return SubmissionResult(
                success=False,
                status="review_required",
                reason="Ashby posting requires GraphQL custom form mapping or Playwright submission",
                requires_human=True
            )

        except Exception as e:
            logger.error(f"Ashby API submission error: {e}")
            return SubmissionResult(
                success=False,
                status="review_required",
                reason=f"Ashby error: {str(e)}",
                requires_human=True
            )
