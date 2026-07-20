"""Adzuna API job source — primary multi-country job search.

API docs: https://developer.adzuna.com/
Free tier: 25 req/min, 250/day, 2500/month
Supports: India (in), US (us), UK (gb), Canada (ca), Australia (au), South Africa (za), + more
"""

import logging
from datetime import datetime

import httpx

from app.config import settings
from app.sources.base import JobSourceBase, RawJob

logger = logging.getLogger(__name__)

# Adzuna uses 2-letter country codes in their URL path
ADZUNA_COUNTRY_CODES = {
    "in": "in",
    "us": "us",
    "gb": "gb",
    "ca": "ca",
    "au": "au",
    "za": "za",
    "de": "de",
    "fr": "fr",
    "br": "br",
    "nl": "nl",
    "nz": "nz",
    "pl": "pl",
    "sg": "sg",
    "at": "at",
    "ch": "ch",
    "it": "it",
    "ru": "ru",
}

BASE_URL = "https://api.adzuna.com/v1/api/jobs"


class AdzunaSource(JobSourceBase):
    """Adzuna public API job source."""

    @property
    def name(self) -> str:
        return "adzuna"

    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        experience_level: str | None = None,
        max_results: int = 50,
    ) -> list[RawJob]:
        if not settings.adzuna_app_id or not settings.adzuna_app_key:
            logger.warning("Adzuna API keys not configured, skipping")
            return []

        search_countries = countries or ["us"]
        # Filter to only supported Adzuna countries
        valid_countries = [c for c in search_countries if c in ADZUNA_COUNTRY_CODES]
        if not valid_countries:
            logger.warning(f"No valid Adzuna countries in: {search_countries}")
            return []

        # Build search query from keywords + experience level
        what_parts = list(keywords)
        if experience_level:
            what_parts.append(experience_level)
        what_query = " ".join(what_parts)

        all_jobs: list[RawJob] = []
        results_per_country = max(max_results // len(valid_countries), 10)

        async with httpx.AsyncClient(timeout=30.0) as client:
            for country in valid_countries:
                try:
                    jobs = await self._search_country(
                        client, country, what_query, domain, results_per_country
                    )
                    all_jobs.extend(jobs)
                except Exception as e:
                    logger.error(f"Adzuna search failed for {country}: {e}")

        return all_jobs[:max_results]

    async def _search_country(
        self,
        client: httpx.AsyncClient,
        country: str,
        what: str,
        category: str | None,
        max_results: int,
    ) -> list[RawJob]:
        """Search a single country, paginating if needed."""
        jobs: list[RawJob] = []
        page = 1
        per_page = min(max_results, 50)  # Adzuna max is 50 per page

        while len(jobs) < max_results:
            url = f"{BASE_URL}/{country}/search/{page}"
            params = {
                "app_id": settings.adzuna_app_id,
                "app_key": settings.adzuna_app_key,
                "what": what,
                "results_per_page": per_page,
                "content-type": "application/json",
            }
            if category:
                params["category"] = category

            response = await client.get(url, params=params)

            if response.status_code == 429:
                logger.warning("Adzuna rate limit hit, stopping pagination")
                break
            response.raise_for_status()

            data = response.json()
            results = data.get("results", [])
            if not results:
                break

            for item in results:
                posted_at = None
                if item.get("created"):
                    try:
                        posted_at = datetime.fromisoformat(
                            item["created"].replace("Z", "+00:00")
                        )
                    except (ValueError, TypeError):
                        pass

                jobs.append(RawJob(
                    source="adzuna",
                    external_id=str(item.get("id", "")),
                    title=item.get("title", "Unknown"),
                    company=item.get("company", {}).get("display_name", "Unknown"),
                    location=item.get("location", {}).get("display_name", ""),
                    description=item.get("description", ""),
                    url=item.get("redirect_url", ""),
                    salary_min=item.get("salary_min"),
                    salary_max=item.get("salary_max"),
                    salary_currency="GBP" if country == "gb" else "USD",
                    posted_at=posted_at,
                    raw_json=item,
                ))

            page += 1
            if len(results) < per_page:
                break  # No more pages

        return jobs[:max_results]
