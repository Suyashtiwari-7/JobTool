"""Source jobs node."""

import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CompanyList, SearchFilter, JobSource
from app.graph.state import GraphState
from app.sources.adzuna import AdzunaSource
from app.sources.arbeitnow import ArbeitnowSource
from app.sources.ashby import AshbySource
from app.sources.dedup import deduplicate_jobs
from app.sources.greenhouse import GreenhouseSource
from app.sources.lever import LeverSource
from app.sources.remoteok import RemoteOKSource
from app.sources.themuse import TheMuseSource
from app.sources.base import RawJob

logger = logging.getLogger(__name__)

async def source_jobs_node(state: GraphState, db: AsyncSession) -> GraphState:
    """Source jobs from all enabled APIs in parallel."""
    state.history.append("Entered: source_jobs_node")

    try:
        # Load filter
        filter_res = await db.execute(select(SearchFilter).where(SearchFilter.id == state.filter_id))
        search_filter = filter_res.scalar_one()

        # Load company lists
        company_result = await db.execute(select(CompanyList).where(CompanyList.is_enabled.is_(True)))
        companies = company_result.scalars().all()

        greenhouse_slugs = [c.slug for c in companies if c.source == JobSource.GREENHOUSE]
        lever_slugs = [c.slug for c in companies if c.source == JobSource.LEVER]
        ashby_slugs = [c.slug for c in companies if c.source == JobSource.ASHBY]

        sources = [
            AdzunaSource(),
            GreenhouseSource(greenhouse_slugs),
            LeverSource(lever_slugs),
            AshbySource(ashby_slugs),
            ArbeitnowSource(),
            RemoteOKSource(),
            TheMuseSource(),
        ]

        # Run all sources in parallel
        tasks = [
            source.search(
                keywords=search_filter.keywords,
                countries=search_filter.countries,
                domain=search_filter.domain,
                experience_level=search_filter.experience_level,
                max_results=search_filter.target_count,
            )
            for source in sources
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_jobs: list[RawJob] = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"[{state.run_id}] Source {sources[i].name} failed: {result}")
                state.history.append(f"Source {sources[i].name} failed: {result}")
            elif isinstance(result, list):
                logger.info(f"[{state.run_id}] Source {sources[i].name}: {len(result)} jobs")
                all_jobs.extend(result)

        state.history.append(f"Found {len(all_jobs)} raw jobs")

        unique_jobs = deduplicate_jobs(all_jobs)
        state.history.append(f"After dedup: {len(unique_jobs)} jobs")

        # Serialize RawJob objects to dicts for GraphState
        state.raw_jobs = [
            {
                "source": job.source,
                "external_id": job.external_id,
                "title": job.title,
                "company": job.company,
                "url": job.url,
                "location": job.location,
                "description": job.description,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "salary_currency": job.salary_currency,
                "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                "raw_json": job.raw_json,
            }
            for job in unique_jobs
        ]

        state.current_node = "SCORE_RANK_NODE"
        
    except Exception as e:
        logger.error(f"[{state.run_id}] Sourcing failed: {e}")
        state.history.append(f"Error in source_jobs_node: {e}")
        state.error_count += 1
        state.node_before_failure = "SOURCE_JOBS_NODE"
        state.current_node = "FALLBACK_NODE"

    return state
