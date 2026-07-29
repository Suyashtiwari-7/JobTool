"""Base Submitter interface and URL pattern detection."""

from dataclasses import dataclass
from typing import Any


@dataclass
class SubmissionResult:
    success: bool
    status: str  # "applied" | "review_required" | "failed"
    reason: str | None = None
    confirmation_id: str | None = None
    requires_human: bool = False


def detect_submitter_type(url: str | None) -> str:
    """
    Per-posting API capability check.
    Detects if a job posting URL matches a supported ATS API format.
    """
    if not url:
        return "web_playwright"

    clean_url = url.lower().strip()

    if "boards.greenhouse.io" in clean_url or "greenhouse.io" in clean_url:
        return "greenhouse_api"
    elif "jobs.lever.co" in clean_url or "lever.co" in clean_url:
        return "lever_api"
    elif "jobs.ashbyhq.com" in clean_url or "ashbyhq.com" in clean_url:
        return "ashby_api"
    else:
        return "web_playwright"


class BaseSubmitter:
    """Abstract base class for job submitters."""

    async def submit(self, application_data: dict[str, Any]) -> SubmissionResult:
        raise NotImplementedError
