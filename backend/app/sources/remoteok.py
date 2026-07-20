"""RemoteOK public JSON feed source.

Endpoint: https://remoteok.com/api
No API key required. Returns all current remote job listings.
"""

import logging

import httpx

from app.sources.base import JobSourceBase, RawJob

logger = logging.getLogger(__name__)

API_URL = "https://remoteok.com/api"


class RemoteOKSource(JobSourceBase):
    """RemoteOK public JSON job feed (remote jobs only)."""

    @property
    def name(self) -> str:
        return "remoteok"

    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        experience_level: str | None = None,
        max_results: int = 50,
    ) -> list[RawJob]:
        keyword_lower = [k.lower() for k in keywords]

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # RemoteOK requires a user-agent header
                headers = {
                    "User-Agent": "JobTool/1.0 (job-search-aggregator)"
                }
                response = await client.get(API_URL, headers=headers)
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                logger.error(f"RemoteOK API failed: {e}")
                return []

        # First item is metadata/legal notice, skip it
        postings = data[1:] if len(data) > 1 else []

        jobs: list[RawJob] = []
        for item in postings:
            if not isinstance(item, dict):
                continue

            title = item.get("position", "")
            company = item.get("company", "Unknown")
            description = item.get("description", "")
            tags = " ".join(item.get("tags", []))
            location = item.get("location", "Remote")

            # Keyword filtering
            text_to_search = f"{title} {description} {tags}".lower()
            if not any(kw in text_to_search for kw in keyword_lower):
                continue

            salary_min = None
            salary_max = None
            if item.get("salary_min"):
                try:
                    salary_min = float(item["salary_min"])
                except (ValueError, TypeError):
                    pass
            if item.get("salary_max"):
                try:
                    salary_max = float(item["salary_max"])
                except (ValueError, TypeError):
                    pass

            jobs.append(RawJob(
                source="remoteok",
                external_id=str(item.get("id", "")),
                title=title,
                company=company,
                location=location,
                description=description,
                url=item.get("url", ""),
                salary_min=salary_min,
                salary_max=salary_max,
                salary_currency="USD" if salary_min else None,
                raw_json=item,
            ))

            if len(jobs) >= max_results:
                break

        return jobs
