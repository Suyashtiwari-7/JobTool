"""JobSpy Multi-Platform Scraper — extracts live jobs from LinkedIn, Indeed, Glassdoor, and ZipRecruiter.

Improves job sourcing volume while excluding non-matching roles like Frontend/UI/UX.
"""

import logging
from datetime import datetime
from app.sources.base import JobSourceBase, RawJob

logger = logging.getLogger(__name__)

# Roles to automatically exclude when sourcing candidate backend/AI jobs
EXCLUDED_KEYWORDS = [
    "frontend",
    "ui/ux",
    "ui engineer",
    "ux designer",
    "designer",
    "web designer",
    "graphics designer",
    "qa engineer",
    "tester",
    "manual tester",
]


class JobSpySource(JobSourceBase):
    """JobSpy multi-board scraper implementation."""

    @property
    def name(self) -> str:
        return "jobspy"

    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        limit: int = 50,
    ) -> list[RawJob]:
        """
        Search multi-platform jobs and return filtered RawJob objects.
        """
        logger.info(f"JobSpy searching for keywords: {keywords}")

        jobs: list[RawJob] = []

        try:
            from jobspy import scrape_jobs

            site_names = ["linkedin", "indeed", "glassdoor", "zip_recruiter"]
            search_term = " ".join(keywords[:2]) if keywords else "software engineer"

            scraped_df = scrape_jobs(
                site_name=site_names,
                search_term=search_term,
                location=countries[0] if countries else "Remote",
                results_wanted=limit,
                hours_old=72,
            )

            for _, row in scraped_df.iterrows():
                title = str(row.get("title", "")).strip()
                company = str(row.get("company", "")).strip()

                # Check if role matches excluded keywords (e.g. UI/UX, Frontend, Designer)
                title_lower = title.lower()
                if any(ex in title_lower for ex in EXCLUDED_KEYWORDS):
                    logger.info(f"Skipping excluded role: '{title}' at {company}")
                    continue

                jobs.append(
                    RawJob(
                        source=f"jobspy-{row.get('site', 'web')}",
                        external_id=str(row.get("id", f"{company}_{title}")),
                        title=title,
                        company=company,
                        url=str(row.get("job_url", "")),
                        location=str(row.get("location", "Remote")),
                        description=str(row.get("description", "")),
                        posted_at=datetime.utcnow(),
                    )
                )

        except ImportError:
            logger.info("python-jobspy package not installed. Skipping multi-board scrape.")
        except Exception as e:
            logger.warning(f"JobSpy scrape encounter: {e}")

        logger.info(f"JobSpy returned {len(jobs)} filtered target jobs")
        return jobs
