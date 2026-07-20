"""Resume parser — extracts text from PDF/DOCX and structures it via LLM."""

import json
import logging

import fitz  # PyMuPDF
from docx import Document

from app.llm.provider import llm_call
from app.llm.prompts import RESUME_PARSE_PROMPT

logger = logging.getLogger(__name__)


async def parse_resume_file(file_path: str, extension: str) -> tuple[str, dict]:
    """
    Parse a resume file into structured JSON.

    Args:
        file_path: Path to the uploaded file
        extension: File extension (.pdf or .docx)

    Returns:
        Tuple of (raw_text, parsed_json_dict)
    """
    # Step 1: Extract raw text
    if extension == ".pdf":
        raw_text = _extract_pdf_text(file_path)
    elif extension == ".docx":
        raw_text = _extract_docx_text(file_path)
    else:
        raise ValueError(f"Unsupported file type: {extension}")

    if not raw_text.strip():
        raise ValueError("Could not extract any text from the file")

    logger.info(f"Extracted {len(raw_text)} chars from resume")

    # Step 2: Structure via LLM
    prompt = RESUME_PARSE_PROMPT.format(resume_text=raw_text)
    llm_response = await llm_call(prompt, json_mode=True)

    # Parse the LLM response as JSON
    try:
        parsed = json.loads(llm_response)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        if "```json" in llm_response:
            json_str = llm_response.split("```json")[1].split("```")[0].strip()
            parsed = json.loads(json_str)
        elif "```" in llm_response:
            json_str = llm_response.split("```")[1].split("```")[0].strip()
            parsed = json.loads(json_str)
        else:
            raise ValueError(f"LLM returned invalid JSON: {llm_response[:200]}")

    logger.info(f"Parsed resume: {parsed.get('name', 'Unknown')} — {len(parsed.get('skills', []))} skills found")
    return raw_text, parsed


def _extract_pdf_text(file_path: str) -> str:
    """Extract text from a PDF using PyMuPDF."""
    doc = fitz.open(file_path)
    text_parts: list[str] = []

    for page in doc:
        text_parts.append(page.get_text())

    doc.close()
    return "\n".join(text_parts)


def _extract_docx_text(file_path: str) -> str:
    """Extract text from a DOCX using python-docx."""
    doc = Document(file_path)
    text_parts: list[str] = []

    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            text_parts.append(paragraph.text)

    # Also extract text from tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    text_parts.append(cell.text)

    return "\n".join(text_parts)
