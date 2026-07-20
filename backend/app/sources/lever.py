"""Lever public postings API source.

Endpoint: https://api.lever.co/v0/postings/{company}?mode=json
No authentication required.
"""

import logging
from datetime import datetime

import httpx

from app.sources.base import JobSourceBase, RawJob

logger = logging.getLogger(__name__)

BASE_URL = "https://api.lever.co/v0/postings"


class LeverSource(JobSourceBase):
    """Lever public postings API."""

    def __init__(self, company_slugs: list[str] | None = None):
        self._company_slugs = company_slugs or []

    @property
    def name(self) -> str:
        return "lever"

    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        experience_level: str | None = None,
        max_results: int = 50,
    ) -> list[RawJob]:
        if not self._company_slugs:
            logger.info("No Lever companies configured, skipping")
            return []

        all_jobs: list[RawJob] = []
        keyword_lower = [k.lower() for k in keywords]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for slug in self._company_slugs:
                try:
                    jobs = await self._fetch_company(client, slug, keyword_lower)
                    all_jobs.extend(jobs)
                except Exception as e:
                    logger.error(f"Lever fetch failed for {slug}: {e}")

                if len(all_jobs) >= max_results:
                    break

        return all_jobs[:max_results]

    async def _fetch_company(
        self,
        client: httpx.AsyncClient,
        slug: str,
        keywords: list[str],
    ) -> list[RawJob]:
        """Fetch and filter jobs from a single Lever company."""
        url = f"{BASE_URL}/{slug}"
        params = {"mode": "json"}

        response = await client.get(url, params=params)
        if response.status_code == 404:
            logger.warning(f"Lever company not found: {slug}")
            return []
        response.raise_for_status()

        postings = response.json()
        if not isinstance(postings, list):
            return []

        jobs: list[RawJob] = []
        for item in postings:
            title = item.get("text", "")
            description = item.get("descriptionPlain", "") or item.get("description", "")
            categories = item.get("categories", {})
            location = categories.get("location", "") or item.get("workplaceType", "")

            # Keyword filtering
            text_to_search = f"{title} {description}".lower()
            if not any(kw in text_to_search for kw in keywords):
                continue

            posted_at = None
            if item.get("createdAt"):
                try:
                    # Lever timestamps are in milliseconds
                    posted_at = datetime.fromtimestamp(item["createdAt"] / 1000)
                except (ValueError, TypeError, OSError):
                    pass

            jobs.append(RawJob(
                source="lever",
                external_id=item.get("id", ""),
                title=title,
                company=slug.replace("-", " ").title(),
                location=location,
                description=description,
                url=item.get("hostedUrl", f"https://jobs.lever.co/{slug}/{item.get('id', '')}"),
                posted_at=posted_at,
                raw_json=item,
            ))

        return jobs
