"""Connected Accounts & Integrations API router."""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_token
from app.db.database import get_db
from app.db.models import UserIntegration
from app.utils.crypto import encrypt_secret
from app.integrations.github_sync import sync_github_skills
from app.integrations.outlook_email import scan_outlook_inbox

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request / Response Models ────────────────────────────

class GitHubConnectRequest(BaseModel):
    username: str


class OutlookConnectRequest(BaseModel):
    email: str
    password: str = Field(description="Outlook App Password (AES-256 encrypted at rest)")


class LinkedInConnectRequest(BaseModel):
    profile_url: str


class IntegrationStatusResponse(BaseModel):
    service_name: str
    username_or_email: str
    is_active: bool
    last_synced_at: str | None = None
    created_at: str


# ── Endpoints ────────────────────────────────────────────

@router.get("", response_model=dict)
async def get_integrations(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Return status of all connected accounts (passwords are write-only and never returned)."""
    res = await db.execute(select(UserIntegration).order_by(UserIntegration.id))
    rows = res.scalars().all()

    integrations = {}
    for r in rows:
        integrations[r.service_name] = {
            "id": r.id,
            "service_name": r.service_name,
            "username_or_email": r.username_or_email,
            "is_active": r.is_active,
            "last_synced_at": r.last_synced_at.isoformat() if r.last_synced_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }

    return {"integrations": integrations}


@router.post("/github")
async def connect_github(
    payload: GitHubConnectRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Connect GitHub username (public REST API — 0 passwords required) and run initial skill sync."""
    clean_user = payload.username.strip().lstrip('@')
    if not clean_user:
        raise HTTPException(400, "Username cannot be empty")

    res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == "github")
    )
    integ = res.scalar_one_or_none()

    if integ:
        integ.username_or_email = clean_user
        integ.is_active = True
        integ.updated_at = datetime.now(timezone.utc)
    else:
        integ = UserIntegration(
            service_name="github",
            username_or_email=clean_user,
            is_active=True,
        )
        db.add(integ)

    await db.commit()

    # Trigger instant skill sync
    sync_result = await sync_github_skills(clean_user, db)

    return {
        "status": "connected",
        "service": "github",
        "username": clean_user,
        "sync_result": sync_result,
    }


@router.post("/outlook")
async def connect_outlook(
    payload: OutlookConnectRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Connect Outlook email with AES-256 encrypted App Password and test connection."""
    email_clean = payload.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(400, "Invalid Outlook email address")

    encrypted_pw = encrypt_secret(payload.password)

    res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == "outlook")
    )
    integ = res.scalar_one_or_none()

    if integ:
        integ.username_or_email = email_clean
        integ.encrypted_credentials = encrypted_pw
        integ.is_active = True
        integ.updated_at = datetime.now(timezone.utc)
    else:
        integ = UserIntegration(
            service_name="outlook",
            username_or_email=email_clean,
            encrypted_credentials=encrypted_pw,
            is_active=True,
        )
        db.add(integ)

    await db.commit()

    # Run test scan
    scan_res = await scan_outlook_inbox(email_clean, db)

    return {
        "status": "connected",
        "service": "outlook",
        "email": email_clean,
        "scan_test": scan_res,
    }


@router.post("/linkedin")
async def connect_linkedin(
    payload: LinkedInConnectRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Save LinkedIn profile URL for outreach context."""
    url = payload.profile_url.strip()
    if not url:
        raise HTTPException(400, "Profile URL cannot be empty")

    res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == "linkedin")
    )
    integ = res.scalar_one_or_none()

    if integ:
        integ.username_or_email = url
        integ.is_active = True
        integ.updated_at = datetime.now(timezone.utc)
    else:
        integ = UserIntegration(
            service_name="linkedin",
            username_or_email=url,
            is_active=True,
        )
        db.add(integ)

    await db.commit()

    return {"status": "connected", "service": "linkedin", "profile_url": url}


@router.post("/github/sync")
async def trigger_github_sync(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Trigger manual GitHub skill sync."""
    res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == "github")
    )
    integ = res.scalar_one_or_none()
    if not integ or not integ.username_or_email:
        raise HTTPException(400, "GitHub account not connected")

    result = await sync_github_skills(integ.username_or_email, db)
    return result


@router.post("/outlook/scan")
async def trigger_outlook_scan(
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Trigger manual Outlook inbox scan for job/interview emails."""
    res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == "outlook")
    )
    integ = res.scalar_one_or_none()
    if not integ or not integ.username_or_email:
        raise HTTPException(400, "Outlook account not connected")

    result = await scan_outlook_inbox(integ.username_or_email, db)
    return result


@router.delete("/{service_name}")
async def disconnect_integration(
    service_name: str,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(verify_token),
):
    """Disconnect a service."""
    res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == service_name)
    )
    integ = res.scalar_one_or_none()
    if not integ:
        raise HTTPException(404, "Integration not found")

    await db.delete(integ)
    await db.commit()
    return {"status": "disconnected", "service": service_name}
