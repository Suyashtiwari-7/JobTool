"""Resume upload and parsing endpoints."""

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.config import settings
from app.db.database import get_db
from app.db.models import Resume
from app.resume.parser import parse_resume_file

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class ResumeResponse(BaseModel):
    id: int
    filename: str
    parsed_json: dict | None
    uploaded_at: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Upload a PDF or DOCX resume. Parses it into structured JSON via LLM."""
    # Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Only PDF and DOCX files allowed. Got: {ext}")

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large. Maximum size is 10 MB.")

    # Save file with UUID name for security
    file_uuid = str(uuid.uuid4())
    safe_filename = f"{file_uuid}{ext}"
    file_path = os.path.join(settings.upload_dir, safe_filename)
    os.makedirs(settings.upload_dir, exist_ok=True)

    with open(file_path, "wb") as f:
        f.write(content)

    # Parse resume (extract text + LLM structuring)
    try:
        raw_text, parsed_json = await parse_resume_file(file_path, ext)
    except Exception as e:
        # Clean up file on parse failure
        os.remove(file_path)
        raise HTTPException(500, f"Failed to parse resume: {str(e)}")

    # Deactivate previous resumes
    result = await db.execute(select(Resume).where(Resume.is_active.is_(True)))
    for old in result.scalars().all():
        old.is_active = False

    # Create new resume record
    resume = Resume(
        filename=file.filename or safe_filename,
        file_path=file_path,
        raw_text=raw_text,
        parsed_json=parsed_json,
        is_active=True,
    )
    db.add(resume)
    await db.flush()
    await db.refresh(resume)

    return ResumeResponse(
        id=resume.id,
        filename=resume.filename,
        parsed_json=resume.parsed_json,
        uploaded_at=resume.uploaded_at.isoformat(),
        is_active=resume.is_active,
    )


@router.get("", response_model=ResumeResponse | None)
async def get_active_resume(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Get the currently active (most recent) resume."""
    result = await db.execute(
        select(Resume).where(Resume.is_active.is_(True)).limit(1)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        return None
    return ResumeResponse(
        id=resume.id,
        filename=resume.filename,
        parsed_json=resume.parsed_json,
        uploaded_at=resume.uploaded_at.isoformat(),
        is_active=resume.is_active,
    )


@router.get("/download")
async def download_resume(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Download the original uploaded resume file."""
    result = await db.execute(
        select(Resume).where(Resume.is_active.is_(True)).limit(1)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(404, "No resume uploaded yet")

    if not os.path.exists(resume.file_path):
        raise HTTPException(404, "Resume file not found on server")

    return FileResponse(
        resume.file_path,
        filename=resume.filename,
        media_type="application/octet-stream",
    )
