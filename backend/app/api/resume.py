import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token, verify_token_or_query
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

from datetime import datetime, timezone


def _format_resume_response(r: Resume) -> ResumeResponse:
    if hasattr(r.uploaded_at, "isoformat"):
        up_str = r.uploaded_at.isoformat()
    elif r.uploaded_at:
        up_str = str(r.uploaded_at)
    else:
        up_str = datetime.now(timezone.utc).isoformat()

    return ResumeResponse(
        id=r.id,
        filename=r.filename,
        role_label=r.role_label or "General",
        parsed_json=r.parsed_json,
        uploaded_at=up_str,
        is_active=r.is_active,
    )


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
    now_dt = datetime.now(timezone.utc)

    # Create new resume record (store file bytes in DB for persistence)
    resume = Resume(
        filename=file.filename or safe_filename,
        role_label=effective_label,
        file_path=file_path,
        file_data=content,
        raw_text=raw_text,
        parsed_json=parsed_json,
        uploaded_at=now_dt,
        is_active=True,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return _format_resume_response(resume)


@router.get("/list", response_model=list[ResumeResponse])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """List all uploaded resumes with their role labels and active status."""
    result = await db.execute(select(Resume).order_by(Resume.uploaded_at.desc()))
    resumes = result.scalars().all()
    return [_format_resume_response(r) for r in resumes]


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
    return _format_resume_response(resume)


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

    await db.commit()
    await db.refresh(target)

    return _format_resume_response(target)


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

    was_active = resume.is_active

    if resume.file_path and os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except Exception:
            pass

    await db.delete(resume)
    await db.commit()

    # If deleted resume was active, set latest remaining resume as active
    if was_active:
        rem_res = await db.execute(select(Resume).order_by(Resume.uploaded_at.desc()).limit(1))
        latest = rem_res.scalar_one_or_none()
        if latest:
            latest.is_active = True
            await db.commit()

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


def _get_content_type(filename: str) -> str:
    """Determine MIME type from filename extension."""
    lower = (filename or "").lower()
    if lower.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif lower.endswith(".doc"):
        return "application/msword"
    return "application/pdf"


def _restore_file_from_db(resume: Resume) -> str | None:
    """If file_data exists in DB but disk file is gone, restore it. Returns file_path or None."""
    if not resume.file_data:
        return None
    os.makedirs(settings.upload_dir, exist_ok=True)
    filename = resume.filename or "resume.pdf"
    path = os.path.join(settings.upload_dir, f"{resume.id}_{filename}")
    with open(path, "wb") as f:
        f.write(resume.file_data)
    return path


@router.get("/{resume_id}/file")
@router.get("/{resume_id}/file/{filename}")
async def get_resume_file(
    resume_id: int,
    filename: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Serve the original uploaded resume file by ID with NO content-disposition so browser views inline."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        res_latest = await db.execute(select(Resume).order_by(Resume.uploaded_at.desc()).limit(1))
        resume = res_latest.scalar_one_or_none()
    if not resume:
        raise HTTPException(404, "Resume not found")

    content_type = _get_content_type(resume.filename)
    path_to_read = None

    if resume.file_path and os.path.exists(resume.file_path):
        path_to_read = resume.file_path
    else:
        path_to_read = _restore_file_from_db(resume)

    if path_to_read:
        with open(path_to_read, "rb") as f:
            content = f.read()
        return Response(content=content, media_type=content_type)

    raise HTTPException(404, "Original file not available. Please re-upload your resume.")


@router.get("/{resume_id}/download")
async def download_specific_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Download a specific uploaded resume file by ID with original filename."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(404, "Resume not found")

    content_type = _get_content_type(resume.filename)

    # Case 1: File exists on disk
    if resume.file_path and os.path.exists(resume.file_path):
        return FileResponse(
            resume.file_path,
            filename=resume.filename,
            media_type=content_type,
            content_disposition_type="attachment",
        )

    # Case 2: Restore from DB
    restored_path = _restore_file_from_db(resume)
    if restored_path:
        return FileResponse(
            restored_path,
            filename=resume.filename,
            media_type=content_type,
            content_disposition_type="attachment",
        )

    raise HTTPException(404, "Original file not available. Please re-upload your resume.")


@router.get("/download")
async def download_resume(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token_or_query),
):
    """Download the latest uploaded resume file with original filename."""
    result = await db.execute(
        select(Resume).order_by(Resume.uploaded_at.desc()).limit(1)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(404, "No resume uploaded yet")

    content_type = _get_content_type(resume.filename)

    # Case 1: File exists on disk
    if resume.file_path and os.path.exists(resume.file_path):
        return FileResponse(
            resume.file_path,
            filename=resume.filename,
            media_type=content_type,
            content_disposition_type="attachment",
        )

    # Case 2: Restore from DB
    restored_path = _restore_file_from_db(resume)
    if restored_path:
        return FileResponse(
            restored_path,
            filename=resume.filename,
            media_type=content_type,
            content_disposition_type="attachment",
        )

    raise HTTPException(404, "Original file not available. Please re-upload your resume.")
