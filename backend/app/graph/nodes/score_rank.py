"""Score and rank jobs node."""

import asyncio
import json
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import SearchFilter, Resume
from app.graph.state import GraphState
from app.graph.schemas import JobScoreResult
from app.llm.prompts import JOB_SCORE_PROMPT
from app.llm.provider import llm_call

logger = logging.getLogger(__name__)

async def score_rank_node(state: GraphState, db: AsyncSession) -> GraphState:
    """Score each job against the resume using LLM."""
    state.history.append("Entered: score_rank_node")

    try:
        filter_res = await db.execute(select(SearchFilter).where(SearchFilter.id == state.filter_id))
        search_filter = filter_res.scalar_one()

        # Build combined profile
        all_resumes_res = await db.execute(select(Resume).order_by(Resume.uploaded_at.desc()))
        all_resumes = all_resumes_res.scalars().all()
        
        combined_profile = {}
        all_skills = set()
        for r in all_resumes:
            parsed = r.parsed_json or {}
            r_skills = parsed.get("skills", [])
            if isinstance(r_skills, list):
                all_skills.update(r_skills)
            elif isinstance(r_skills, str):
                all_skills.update([s.strip() for s in r_skills.split(",") if s.strip()])
            for k, v in parsed.items():
                if k not in combined_profile or not combined_profile[k]:
                    combined_profile[k] = v
                    
        combined_profile["skills"] = list(all_skills)
        resume_json_str = json.dumps(combined_profile, indent=2)

        scored_jobs = []
        for i, job_dict in enumerate(state.raw_jobs):
            try:
                prompt = JOB_SCORE_PROMPT.format(
                    resume_json=resume_json_str,
                    job_title=job_dict["title"],
                    job_company=job_dict["company"],
                    job_location=job_dict["location"] or "Not specified",
                    job_description=(job_dict["description"] or "")[:3000],
                )
                
                # We save prompt before call for fallback
                state.last_prompt = prompt
                state.last_prompt_json_mode = True

                response = await llm_call(prompt, json_mode=True)
                
                # Estimate tokens (rough approx)
                state.tokens_used += len(prompt.split()) + len(response.split()) * 1.3
                
                try:
                    score_data_raw = json.loads(response)
                except json.JSONDecodeError:
                    if "```json" in response:
                        json_str = response.split("```json")[1].split("```")[0].strip()
                        score_data_raw = json.loads(json_str)
                    else:
                        raise ValueError("Invalid JSON from LLM")
                
                # Validate with Pydantic
                score_result = JobScoreResult(**score_data_raw)
                score_data = score_result.model_dump()
                
                # Calculate Real-Odds Callback Boost
                if not score_data.get("real_odds_score"):
                    is_faang = any(
                        big in job_dict["company"].lower()
                        for big in ["google", "meta", "facebook", "apple", "amazon", "microsoft", "netflix"]
                    )
                    base_score = score_data.get("score", 75)
                    odds = max(45, base_score - 25) if is_faang else min(96, base_score + 12)
                    score_data["real_odds_score"] = odds
                    score_data["callback_tier"] = "🏛️ Competitive (FAANG)" if is_faang else "🔥 High Callback Odds"

                scored_jobs.append({"job": job_dict, "score_data": score_data})
                
            except Exception as e:
                logger.error(f"[{state.run_id}] Failed to score '{job_dict['title']}': {e}")
                # We increment error and go to fallback, preserving where we were
                state.error_count += 1
                state.node_before_failure = "SCORE_RANK_NODE"
                state.current_node = "FALLBACK_NODE"
                return state

            # Rate limit backoff (Groq 30 RPM limit)
            if (i + 1) % 5 == 0:
                await asyncio.sleep(1)

        state.scored_jobs = scored_jobs

        # Rank and select
        threshold = settings.match_score_threshold
        target_count = search_filter.target_count

        # Check remaining daily cap capacity
        from datetime import datetime, timezone
        from sqlalchemy import func
        from app.db.models import Guardrails, Application, ApplicationStatus

        guardrails_res = await db.execute(select(Guardrails).where(Guardrails.id == 1))
        guardrails = guardrails_res.scalar_one_or_none()
        cap = (guardrails.daily_max_applications if guardrails and guardrails.daily_max_applications is not None else 25)

        now_utc = datetime.now(timezone.utc)
        start_of_today = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        count_res = await db.execute(
            select(func.count(Application.id)).where(
                Application.created_at >= start_of_today,
                Application.status != ApplicationStatus.CANCELLED
            )
        )
        today_count = count_res.scalar() or 0
        remaining_capacity = max(0, cap - today_count)

        effective_limit = min(target_count, remaining_capacity)

        matched_jobs = [
            item for item in scored_jobs
            if item["score_data"].get("score", 0) >= threshold
            or item["score_data"].get("real_odds_score", 0) >= 65
        ]
        
        matched_jobs.sort(
            key=lambda x: (
                x["score_data"].get("real_odds_score", x["score_data"].get("score", 0)),
                x["score_data"].get("score", 0),
            ),
            reverse=True,
        )
        
        state.matched_jobs = matched_jobs[:effective_limit]
        state.history.append(f"Matched {len(state.matched_jobs)} jobs (Cap capacity: {remaining_capacity})")
        
        state.current_node = "ATS_TAILOR_NODE"
        
    except Exception as e:
        logger.error(f"[{state.run_id}] Score/rank failed: {e}")
        state.history.append(f"Error in score_rank_node: {e}")
        state.error_count += 1
        state.node_before_failure = "SCORE_RANK_NODE"
        state.current_node = "FALLBACK_NODE"

    return state
