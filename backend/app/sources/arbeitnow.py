"""Arbeitnow free job board API source.

Endpoint: https://www.arbeitnow.com/api/job-board-api
No API key required. Aggregates from Greenhouse, Lever, SmartRecruiters, etc.
"""

import logging

import httpx

from app.sources.base import JobSourceBase, RawJob

logger = logging.getLogger(__name__)

BASE_URL = "https://www.arbeitnow.com/api/job-board-api"


class ArbeitnowSource(JobSourceBase):
    """Arbeitnow free public job API."""

    @property
    def name(self) -> str:
        return "arbeitnow"

    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        experience_level: str | None = None,
        max_results: int = 50,
    ) -> list[RawJob]:
        all_jobs: list[RawJob] = []
        keyword_lower = [k.lower() for k in keywords]
        page = 1

        async with httpx.AsyncClient(timeout=30.0) as client:
            while len(all_jobs) < max_results and page <= 5:
                try:
                    url = BASE_URL
                    params = {"page": page}

                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()

                    jobs_data = data.get("data", [])
                    if not jobs_data:
                        break

                    for item in jobs_data:
                        title = item.get("title", "")
                        description = item.get("description", "")
                        company = item.get("company_name", "Unknown")
                        location = item.get("location", "")
                        tags = " ".join(item.get("tags", []))

                        # Keyword filtering
                        text_to_search = f"{title} {description} {tags}".lower()
                        if not any(kw in text_to_search for kw in keyword_lower):
                            continue

                        all_jobs.append(RawJob(
                            source="arbeitnow",
                            external_id=item.get("slug", ""),
                            title=title,
                            company=company,
                            location=location,
                            description=description,
                            url=item.get("url", ""),
                            posted_at=None,
                            raw_json=item,
                        ))

                    # Check if there are more pages
                    links = data.get("links", {})
                    if not links.get("next"):
                        break

                    page += 1

                except Exception as e:
                    logger.error(f"Arbeitnow search failed on page {page}: {e}")
                    break

        return all_jobs[:max_results]
