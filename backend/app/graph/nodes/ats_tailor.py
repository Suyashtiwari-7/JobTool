"""ATS Tailoring node."""

import json
import logging
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Resume
from app.graph.state import GraphState
from app.graph.schemas import TailoredResumeResult
from app.llm.prompts import RESUME_TAILOR_PROMPT, COVER_LETTER_PROMPT
from app.llm.provider import llm_call
from app.pipeline.pdf_generator import generate_resume_pdf, generate_cover_letter_pdf

logger = logging.getLogger(__name__)

async def ats_tailor_node(state: GraphState, db: AsyncSession) -> GraphState:
    """Tailor resume and cover letter for matched jobs."""
    # NOTE: batch retries currently reprocess all items in the batch; incremental progress persistence is deferred to v3.0
    state.history.append("Entered: ats_tailor_node")

    try:
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

        for i, item in enumerate(state.matched_jobs):
            job_dict = item["job"]
            
            # 1. Tailor Resume
            tailor_prompt = RESUME_TAILOR_PROMPT.format(
                resume_json=resume_json_str,
                job_title=job_dict["title"],
                job_company=job_dict["company"],
                job_description=(job_dict["description"] or "")[:3000],
            )
            state.last_prompt = tailor_prompt
            state.last_prompt_json_mode = False
            tailored_resume_text = await llm_call(tailor_prompt)
            state.tokens_used += len(tailor_prompt.split()) + len(tailored_resume_text.split()) * 1.3

            # 2. Cover Letter
            cl_prompt = COVER_LETTER_PROMPT.format(
                resume_json=resume_json_str,
                job_title=job_dict["title"],
                job_company=job_dict["company"],
                job_description=(job_dict["description"] or "")[:3000],
            )
            state.last_prompt = cl_prompt
            state.last_prompt_json_mode = False
            cover_letter_text = await llm_call(cl_prompt)
            state.tokens_used += len(cl_prompt.split()) + len(cover_letter_text.split()) * 1.3

            # Validate schemas
            result = TailoredResumeResult(
                resume_text=tailored_resume_text,
                cover_letter_text=cover_letter_text
            )

            # Generate PDFs
            app_id = uuid.uuid4().hex[:8]
            resume_pdf_path = generate_resume_pdf(result.resume_text, state.batch_id, app_id)
            cl_pdf_path = generate_cover_letter_pdf(result.cover_letter_text, state.batch_id, app_id)

            item["tailored_resume_text"] = result.resume_text
            item["cover_letter_text"] = result.cover_letter_text
            item["resume_pdf_path"] = resume_pdf_path
            item["cl_pdf_path"] = cl_pdf_path
            
            state.history.append(f"Tailored {job_dict['company']}")

        state.current_node = "PERSIST_DB_NODE"
        
    except Exception as e:
        logger.error(f"[{state.run_id}] Tailoring failed: {e}")
        state.history.append(f"Error in ats_tailor_node: {e}")
        state.error_count += 1
        state.node_before_failure = "ATS_TAILOR_NODE"
        state.current_node = "FALLBACK_NODE"

    return state
