"""The Muse public API job source.

Endpoint: https://www.themuse.com/api/public/jobs
500 req/hr without key, 3600/hr with key.
Supports category, level, location filters.
"""

import logging

import httpx

from app.sources.base import JobSourceBase, RawJob

logger = logging.getLogger(__name__)

BASE_URL = "https://www.themuse.com/api/public/jobs"

# The Muse level mapping
LEVEL_MAP = {
    "entry": "Entry Level",
    "mid": "Mid Level",
    "senior": "Senior Level",
    "lead": "Senior Level",
    "executive": "Senior Level",
}


class TheMuseSource(JobSourceBase):
    """The Muse public job API."""

    @property
    def name(self) -> str:
        return "themuse"

    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        experience_level: str | None = None,
        max_results: int = 50,
    ) -> list[RawJob]:
        keyword_lower = [k.lower() for k in keywords]
        all_jobs: list[RawJob] = []
        page = 0

        async with httpx.AsyncClient(timeout=30.0) as client:
            while len(all_jobs) < max_results and page < 5:
                try:
                    params: dict = {"page": page}

                    # Add level filter if provided
                    if experience_level:
                        muse_level = LEVEL_MAP.get(experience_level.lower())
                        if muse_level:
                            params["level"] = muse_level

                    # Add category/domain filter
                    if domain:
                        params["category"] = domain

                    response = await client.get(BASE_URL, params=params)

                    if response.status_code == 429:
                        logger.warning("The Muse rate limit hit")
                        break
                    response.raise_for_status()

                    data = response.json()
                    results = data.get("results", [])
                    if not results:
                        break

                    for item in results:
                        title = item.get("name", "")
                        company_info = item.get("company", {})
                        company = company_info.get("name", "Unknown")

                        # Build description from contents sections
                        contents = item.get("contents", "")

                        # Location extraction
                        locations = item.get("locations", [])
                        location = ", ".join(
                            loc.get("name", "") for loc in locations
                        ) if locations else ""

                        # Keyword filtering
                        text_to_search = f"{title} {contents}".lower()
                        if not any(kw in text_to_search for kw in keyword_lower):
                            continue

                        # Build refs URL
                        refs = item.get("refs", {})
                        job_url = refs.get("landing_page", "")

                        all_jobs.append(RawJob(
                            source="themuse",
                            external_id=str(item.get("id", "")),
                            title=title,
                            company=company,
                            location=location,
                            description=contents,
                            url=job_url,
                            raw_json=item,
                        ))

                    # Check pagination
                    total_pages = data.get("page_count", 0)
                    page += 1
                    if page >= total_pages:
                        break

                except Exception as e:
                    logger.error(f"The Muse search failed on page {page}: {e}")
                    break

        return all_jobs[:max_results]
