import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.config import settings
from app.db.database import get_db
from app.db.models import Resume
from app.resume.parser import parse_resume_file

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class ResumeResponse(BaseModel):
    id: int
    filename: str
    role_label: str | None = "General"
    parsed_json: dict | None
    uploaded_at: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    role_label: str = Form("Main Resume"),
    name: str | None = Form(None),
    email: str | None = Form(None),
    phone: str | None = Form(None),
    location: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Upload a PDF or DOCX resume with optional personal details."""
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

    # Parse resume (extract text + LLM structuring) with absolute fail-safe
    try:
        raw_text, parsed_json = await parse_resume_file(file_path, ext)
    except Exception as e:
        logger.warning(f"Resume parsing exception caught ({e}). Using fail-safe fallback.")
        raw_text = f"Uploaded Resume: {file.filename}"
        parsed_json = {
            "name": name or "Candidate",
            "email": email,
            "phone": phone,
            "location": location,
            "summary": "Uploaded Resume",
            "skills": [],
            "experience": [],
            "education": []
        }

    # Merge manually provided personal info into parsed_json if provided
    parsed_json = parsed_json or {}
    if name:
        parsed_json["name"] = name
    if email:
        parsed_json["email"] = email
    if phone:
        parsed_json["phone"] = phone
    if location:
        parsed_json["location"] = location

    # Deactivate previous resumes
    result = await db.execute(select(Resume).where(Resume.is_active.is_(True)))
    for old in result.scalars().all():
        old.is_active = False

    effective_label = role_label or name or "Main Resume"

    # Create new resume record
    resume = Resume(
        filename=file.filename or safe_filename,
        role_label=effective_label,
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
        role_label=resume.role_label or "General",
        parsed_json=resume.parsed_json,
        uploaded_at=resume.uploaded_at.isoformat(),
        is_active=resume.is_active,
    )


@router.get("/list", response_model=list[ResumeResponse])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """List all uploaded resumes with their role labels and active status."""
    result = await db.execute(select(Resume).order_by(Resume.uploaded_at.desc()))
    resumes = result.scalars().all()
    return [
        ResumeResponse(
            id=r.id,
            filename=r.filename,
            role_label=r.role_label or "General",
            parsed_json=r.parsed_json,
            uploaded_at=r.uploaded_at.isoformat(),
            is_active=r.is_active,
        )
        for r in resumes
    ]


@router.get("", response_model=ResumeResponse | None)
async def get_active_resume(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Get the currently active resume."""
    result = await db.execute(
        select(Resume).where(Resume.is_active.is_(True)).order_by(Resume.uploaded_at.desc()).limit(1)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        return None
    return ResumeResponse(
        id=resume.id,
        filename=resume.filename,
        role_label=resume.role_label or "General",
        parsed_json=resume.parsed_json,
        uploaded_at=resume.uploaded_at.isoformat(),
        is_active=resume.is_active,
    )


@router.put("/{resume_id}/activate", response_model=ResumeResponse)
async def activate_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Set a specific resume as active for the pipeline."""
    result = await db.execute(select(Resume))
    resumes = result.scalars().all()
    target = None
    for r in resumes:
        if r.id == resume_id:
            r.is_active = True
            target = r
        else:
            r.is_active = False

    if not target:
        raise HTTPException(404, "Resume not found")

    await db.flush()
    await db.refresh(target)

    return ResumeResponse(
        id=target.id,
        filename=target.filename,
        role_label=target.role_label or "General",
        parsed_json=target.parsed_json,
        uploaded_at=target.uploaded_at.isoformat(),
        is_active=target.is_active,
    )


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Delete a resume entry and file."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(404, "Resume not found")

    if resume.file_path and os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except Exception:
            pass

    await db.delete(resume)
    await db.flush()
    return {"message": "Resume deleted"}


class ResumeUpdateRequest(BaseModel):
    role_label: str | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None


@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume_details(
    resume_id: int,
    payload: ResumeUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Update details (role label, contact info) of a specific resume."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(404, "Resume not found")

    if payload.role_label is not None:
        resume.role_label = payload.role_label

    parsed = resume.parsed_json or {}
    if payload.name is not None:
        parsed["name"] = payload.name
    if payload.email is not None:
        parsed["email"] = payload.email
    if payload.phone is not None:
        parsed["phone"] = payload.phone
    if payload.location is not None:
        parsed["location"] = payload.location

    resume.parsed_json = parsed
    # Mark modified for SQLAlchemy JSON tracking
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(resume, "parsed_json")

    await db.flush()
    await db.refresh(resume)

    return ResumeResponse(
        id=resume.id,
        filename=resume.filename,
        role_label=resume.role_label or "General",
        parsed_json=resume.parsed_json,
        uploaded_at=resume.uploaded_at.isoformat(),
        is_active=resume.is_active,
    )


@router.get("/{resume_id}/file")
async def get_resume_file(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Serve a specific uploaded resume file by ID."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(404, "Resume not found")

    if not os.path.exists(resume.file_path):
        raise HTTPException(404, "Resume file not found on server")

    return FileResponse(
        resume.file_path,
        filename=resume.filename,
        media_type="application/octet-stream",
    )


@router.get("/download")
async def download_resume(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Download the original active uploaded resume file."""
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
