"""Greenhouse public job board API source.

Endpoint: https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true
No authentication required for GET requests.
"""

import logging
from datetime import datetime

import httpx

from app.sources.base import JobSourceBase, RawJob

logger = logging.getLogger(__name__)

BASE_URL = "https://boards-api.greenhouse.io/v1/boards"


class GreenhouseSource(JobSourceBase):
    """Greenhouse public job board API."""

    def __init__(self, company_slugs: list[str] | None = None):
        self._company_slugs = company_slugs or []

    @property
    def name(self) -> str:
        return "greenhouse"

    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        experience_level: str | None = None,
        max_results: int = 50,
    ) -> list[RawJob]:
        if not self._company_slugs:
            logger.info("No Greenhouse companies configured, skipping")
            return []

        all_jobs: list[RawJob] = []
        keyword_lower = [k.lower() for k in keywords]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for slug in self._company_slugs:
                try:
                    jobs = await self._fetch_company(client, slug, keyword_lower)
                    all_jobs.extend(jobs)
                except Exception as e:
                    logger.error(f"Greenhouse fetch failed for {slug}: {e}")

                if len(all_jobs) >= max_results:
                    break

        return all_jobs[:max_results]

    async def _fetch_company(
        self,
        client: httpx.AsyncClient,
        slug: str,
        keywords: list[str],
    ) -> list[RawJob]:
        """Fetch and filter jobs from a single company's Greenhouse board."""
        url = f"{BASE_URL}/{slug}/jobs"
        params = {"content": "true"}

        response = await client.get(url, params=params)
        if response.status_code == 404:
            logger.warning(f"Greenhouse board not found: {slug}")
            return []
        response.raise_for_status()

        data = response.json()
        jobs_data = data.get("jobs", [])

        jobs: list[RawJob] = []
        for item in jobs_data:
            title = item.get("title", "")
            content = item.get("content", "")
            location_name = item.get("location", {}).get("name", "")

            # Filter: only include jobs whose title or content matches keywords
            text_to_search = f"{title} {content}".lower()
            if not any(kw in text_to_search for kw in keywords):
                continue

            posted_at = None
            if item.get("updated_at"):
                try:
                    posted_at = datetime.fromisoformat(
                        item["updated_at"].replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    pass

            # Build the application URL
            job_url = item.get("absolute_url", f"https://boards.greenhouse.io/{slug}/jobs/{item.get('id', '')}")

            jobs.append(RawJob(
                source="greenhouse",
                external_id=str(item.get("id", "")),
                title=title,
                company=slug.replace("-", " ").title(),
                location=location_name,
                description=content,
                url=job_url,
                posted_at=posted_at,
                raw_json=item,
            ))

        return jobs
