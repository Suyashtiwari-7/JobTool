"""Prompt templates for all LLM operations."""

# ── Resume Parsing ───────────────────────────────────────

RESUME_PARSE_PROMPT = """Extract structured data from the following resume text. Return ONLY valid JSON matching this exact schema. Do not add any text outside the JSON.

{{
  "name": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "summary": "string - brief professional summary",
  "skills": ["string - each individual skill"],
  "experience": [
    {{
      "company": "string",
      "title": "string",
      "start_date": "string (e.g., Jan 2020)",
      "end_date": "string (e.g., Present)",
      "bullets": ["string - each achievement/responsibility"]
    }}
  ],
  "education": [
    {{
      "institution": "string",
      "degree": "string",
      "field": "string or null",
      "year": "string or null"
    }}
  ],
  "certifications": ["string"],
  "links": ["string - LinkedIn, GitHub, portfolio URLs"]
}}

Resume text:
---
{resume_text}
---

Return ONLY the JSON object. No markdown, no explanation."""


# ── Job Scoring ──────────────────────────────────────────

JOB_SCORE_PROMPT = """You are a job matching expert. Score how well this candidate's resume matches this job posting.

RESUME:
---
{resume_json}
---

JOB POSTING:
Title: {job_title}
Company: {job_company}
Location: {job_location}
Description:
---
{job_description}
---

Evaluate on these criteria:
1. Skill match (40%): How many required/preferred skills does the candidate have?
2. Experience relevance (30%): How relevant is their work history to this role?
3. Experience level fit (15%): Does their seniority match the role?
4. Domain/industry fit (15%): Is their background in a related field?

Return ONLY valid JSON:
{{
  "score": <integer 0-100>,
  "reasoning": "Brief 2-3 sentence explanation of the score",
  "matching_skills": ["skills from resume that match the job"],
  "missing_skills": ["required skills the candidate lacks"]
}}"""


# ── Resume Tailoring ─────────────────────────────────────

RESUME_TAILOR_PROMPT = """You are a subtle, professional resume optimization assistant. Lightly tweak this resume for ATS-friendliness for the target job.

CRITICAL RULES — FOLLOW STRICTLY:
- Keep tweaks VERY MINIMAL, SUBTLE, and TRUTHFUL. This must NOT feel like a rewrite.
- The candidate will speak to these exact bullet points in an interview — do NOT change their core voice, style, or actual accomplishments.
- ONLY subtly adjust word choices or add missing keywords from the job description if they directly match the candidate's existing work.
- ONLY reorder skills so the most relevant ones appear first.
- Do NOT invent new experience, projects, tools, or skills the candidate doesn't have.
- Do NOT fabricate metrics, percentages, or achievements.
- Do NOT change company names, job titles, employment dates, or education details.

ORIGINAL RESUME (JSON):
---
{resume_json}
---

TARGET JOB:
Title: {job_title}
Company: {job_company}
Description:
---
{job_description}
---

Return the tailored resume as clean Markdown format suitable for PDF generation.
Include:
- Name and contact info at the top
- Professional summary (subtly aligned)
- Skills section (reordered for relevance)
- Experience section (with very subtly tweaked bullets)
- Education section
- Certifications (if any)

Return ONLY the Markdown content. No explanation."""


# ── Cover Letter Generation ──────────────────────────────

COVER_LETTER_PROMPT = """Write a short, professional cover letter for this job application.

CANDIDATE RESUME:
---
{resume_json}
---

TARGET JOB:
Title: {job_title}
Company: {job_company}
Description:
---
{job_description}
---

GUIDELINES:
- Keep it concise: 3-4 paragraphs maximum
- Opening: Express genuine interest in the specific role and company
- Body: Highlight 2-3 most relevant experiences/skills from the resume that match the job
- Closing: Brief enthusiasm + availability
- Professional but not generic — reference specific details from the job description
- Do NOT invent experience the candidate doesn't have

Return ONLY the cover letter text in Markdown format. No subject line, no "Dear Hiring Manager" — start directly with the content. Do not include explanations or notes."""
