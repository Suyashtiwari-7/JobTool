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

COVER_LETTER_PROMPT = """Write a highly personalized, compelling, and professional cover letter for this job application.

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

CRITICAL PERSONALIZATION GUIDELINES:
- **Tailored to the Company & Role**: Specifically address {job_company} and reference core challenges or requirements mentioned in the job description.
- **Showcase Specific Impact**: Connect candidate's exact prior achievements, tools, and experiences directly to what {job_company} is seeking.
- **Structure**:
  1. **Engaging Opening**: Express enthusiastic interest in joining {job_company} as a {job_title}, mentioning what stands out about their mission/product.
  2. **Core Value Proposition**: 2 concise paragraphs highlighting candidate's most relevant past projects, technical stack, and measurable contributions.
  3. **Confident Closing**: Reiterate alignment with {job_company}'s goals and express eagerness for an interview.
- Do NOT use generic boilerplate sentences.
- Do NOT invent experiences or metrics the candidate doesn't have.

Return ONLY the cover letter text in clean Markdown format suitable for PDF rendering. Start directly with the text."""


# ── Screening Question Assistant ────────────────────────

SCREENING_QUESTION_PROMPT = """You are a job application assistant. Write a clear, highly persuasive, and tailored answer to the following screening question for a job application.

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

SCREENING QUESTION TO ANSWER:
"{question}"

GUIDELINES:
- Write 1-2 concise, impact-driven paragraphs (150-250 words max).
- Direct, confident, and specific — reference candidate's real experience that answers the prompt.
- Tailor specifically to {job_company} and the {job_title} role.
- Do NOT use generic filler or invent experience not present in the resume.

Return ONLY the final answer text."""


# ── Recruiter Outreach Email Generator ─────────────────

RECRUITER_OUTREACH_PROMPT = """Write a personalized, high-converting cold outreach email & LinkedIn InMail message to a recruiter or hiring manager at {job_company} for the {job_title} role.

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

Provide TWO options in clean Markdown format:

1. **LinkedIn InMail Message** (Under 100 words - short, punchy, curiosity-inducing)
2. **Cold Email to Recruiter** (Complete with Subject Line & 3 short paragraphs)

GUIDELINES:
- Address the recruiter professionally (e.g., "Hi [Hiring Manager / Recruiter Name]")
- Highlight 1-2 specific achievements or skills from the resume that directly solve key problems in the job description.
- Keep tone confident, warm, and professional with a low-friction call to action (e.g., "Open to a brief 5-min chat next week?").

Return ONLY the Markdown content."""
