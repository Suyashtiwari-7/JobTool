"""Ashby public job board API source.

Endpoint: https://api.ashbyhq.com/posting-api/job-board/{company}
No authentication required.
"""

import logging

import httpx

from app.sources.base import JobSourceBase, RawJob

logger = logging.getLogger(__name__)

BASE_URL = "https://api.ashbyhq.com/posting-api/job-board"


class AshbySource(JobSourceBase):
    """Ashby public job board API."""

    def __init__(self, company_slugs: list[str] | None = None):
        self._company_slugs = company_slugs or []

    @property
    def name(self) -> str:
        return "ashby"

    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        experience_level: str | None = None,
        max_results: int = 50,
    ) -> list[RawJob]:
        if not self._company_slugs:
            logger.info("No Ashby companies configured, skipping")
            return []

        all_jobs: list[RawJob] = []
        keyword_lower = [k.lower() for k in keywords]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for slug in self._company_slugs:
                try:
                    jobs = await self._fetch_company(client, slug, keyword_lower)
                    all_jobs.extend(jobs)
                except Exception as e:
                    logger.error(f"Ashby fetch failed for {slug}: {e}")

                if len(all_jobs) >= max_results:
                    break

        return all_jobs[:max_results]

    async def _fetch_company(
        self,
        client: httpx.AsyncClient,
        slug: str,
        keywords: list[str],
    ) -> list[RawJob]:
        """Fetch and filter jobs from a single Ashby company board."""
        url = f"{BASE_URL}/{slug}"
        params = {"includeCompensation": "true"}

        response = await client.get(url, params=params)
        if response.status_code == 404:
            logger.warning(f"Ashby board not found: {slug}")
            return []
        response.raise_for_status()

        data = response.json()
        job_postings = data.get("jobs", [])

        jobs: list[RawJob] = []
        for item in job_postings:
            title = item.get("title", "")
            location = item.get("location", "")
            # Ashby uses departmentName for domain info
            department = item.get("departmentName", "")
            description = item.get("descriptionHtml", "") or item.get("descriptionPlain", "")

            # Keyword filtering
            text_to_search = f"{title} {description} {department}".lower()
            if not any(kw in text_to_search for kw in keywords):
                continue

            # Build the application URL
            job_id = item.get("id", "")
            job_url = item.get("jobUrl", f"https://jobs.ashbyhq.com/{slug}/{job_id}")

            # Parse compensation if available
            salary_min = None
            salary_max = None
            salary_currency = None
            compensation = item.get("compensation")
            if compensation:
                salary_min = compensation.get("compensationTierSummary", {}).get("min")
                salary_max = compensation.get("compensationTierSummary", {}).get("max")
                salary_currency = compensation.get("compensationTierSummary", {}).get("currency")

            jobs.append(RawJob(
                source="ashby",
                external_id=job_id,
                title=title,
                company=slug.replace("-", " ").title(),
                location=location,
                description=description,
                url=job_url,
                salary_min=salary_min,
                salary_max=salary_max,
                salary_currency=salary_currency,
                raw_json=item,
            ))

        return jobs
