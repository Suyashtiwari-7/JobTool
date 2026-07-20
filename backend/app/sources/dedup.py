"""Deduplication engine for job listings from multiple sources.

Uses fuzzy string matching on (company, title, location) to identify duplicates.
Keeps the version with the richest description.
"""

import logging
from thefuzz import fuzz

from app.sources.base import RawJob

logger = logging.getLogger(__name__)

# Similarity threshold: above this, two jobs are considered duplicates
SIMILARITY_THRESHOLD = 85


def deduplicate_jobs(jobs: list[RawJob]) -> list[RawJob]:
    """
    Remove duplicate job listings across multiple sources.

    Strategy:
    1. Normalize company and title strings
    2. Compare each pair using fuzzy matching
    3. When duplicates found, keep the one with the longer description

    Returns:
        Deduplicated list of RawJob objects
    """
    if not jobs:
        return []

    unique_jobs: list[RawJob] = []

    for job in jobs:
        is_duplicate = False

        for i, existing in enumerate(unique_jobs):
            if _is_duplicate(job, existing):
                is_duplicate = True
                # Keep the version with more description content
                if len(job.description or "") > len(existing.description or ""):
                    unique_jobs[i] = job
                break

        if not is_duplicate:
            unique_jobs.append(job)

    dedup_count = len(jobs) - len(unique_jobs)
    if dedup_count > 0:
        logger.info(f"Deduplicated {dedup_count} jobs ({len(jobs)} → {len(unique_jobs)})")

    return unique_jobs


def _is_duplicate(a: RawJob, b: RawJob) -> bool:
    """Check if two jobs are likely the same posting."""
    # Normalize strings for comparison
    company_a = _normalize(a.company)
    company_b = _normalize(b.company)
    title_a = _normalize(a.title)
    title_b = _normalize(b.title)

    # Company must be similar
    company_score = fuzz.ratio(company_a, company_b)
    if company_score < 70:
        return False

    # Title must be similar
    title_score = fuzz.ratio(title_a, title_b)
    if title_score < SIMILARITY_THRESHOLD:
        return False

    # Combined score check
    combined = (company_score + title_score) / 2
    return combined >= SIMILARITY_THRESHOLD


def _normalize(text: str) -> str:
    """Normalize text for comparison: lowercase, strip extra whitespace."""
    return " ".join(text.lower().strip().split())
