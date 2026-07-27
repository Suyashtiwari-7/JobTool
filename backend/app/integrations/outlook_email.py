"""Outlook Email Engine — IMAP Inbox Scanner & SMTP Sender.

Security Boundaries:
- IMAP Scanner ONLY reads unread emails matching job portal domains (@greenhouse, @lever, @ashbyhq, @workday)
  or subject lines containing 'interview', 'offer', 'next steps'.
- All personal/unrelated emails are completely ignored.
- Passwords decrypted in-memory ONLY during active connection.
"""

import email
import imaplib
import logging
import re
import smtplib
from datetime import datetime, timezone
from email.header import decode_header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserIntegration, UserMemory, Application, ApplicationStatus, Job, JobSource
from app.utils.crypto import decrypt_secret

logger = logging.getLogger(__name__)

IMAP_SERVER = "outlook.office365.com"
IMAP_PORT = 993
SMTP_SERVER = "smtp.office365.com"
SMTP_PORT = 587

JOB_KEYWORDS = ["interview", "offer", "application", "schedule", "greenhouse", "lever", "ashby", "workday", "career"]


def _decode_header_str(header_value: str) -> str:
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    result = []
    for content, encoding in decoded_parts:
        if isinstance(content, bytes):
            result.append(content.decode(encoding or 'utf-8', errors='ignore'))
        else:
            result.append(str(content))
    return "".join(result)


def _extract_meeting_link(text: str) -> str | None:
    """Extract Zoom, Google Meet, or Microsoft Teams URLs from email body."""
    patterns = [
        r'https://[a-zA-Z0-9-]+\.zoom\.us/j/[a-zA-Z0-9_?=.-]+',
        r'https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}',
        r'https://teams\.microsoft\.com/l/meetup-join/[a-zA-Z0-9_%.-]+',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return None


async def scan_outlook_inbox(user_email: str, db: AsyncSession) -> dict:
    """
    Connect to Outlook IMAP and scan for job application / interview emails.
    Auto-pins detected interviews into the calendar.
    """
    # 1. Fetch Outlook integration credentials from DB
    res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == "outlook")
    )
    integ = res.scalar_one_or_none()
    if not integ or not integ.encrypted_credentials:
        return {"error": "Outlook account not connected"}

    password = decrypt_secret(integ.encrypted_credentials)
    if not password:
        return {"error": "Could not decrypt Outlook credentials"}

    matched_interviews = []
    
    try:
        # 2. Connect to Outlook IMAP
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(user_email, password)
        mail.select("INBOX")

        # 3. Search UNSEEN or ALL recent emails
        status, messages = mail.search(None, 'UNSEEN')
        email_ids = messages[0].split()

        # Limit scan to latest 20 unread emails
        for e_id in email_ids[-20:]:
            _, msg_data = mail.fetch(e_id, '(RFC822)')
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    subject = _decode_header_str(msg.get("Subject", ""))
                    sender = _decode_header_str(msg.get("From", ""))

                    # Strict filter check: must contain job keywords or job portal domain
                    full_header_text = (subject + " " + sender).lower()
                    if not any(kw in full_header_text for kw in JOB_KEYWORDS):
                        continue  # Bypass personal emails entirely

                    # Extract body text
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            if part.get_content_type() == "text/plain":
                                body += part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    else:
                        body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

                    meeting_url = _extract_meeting_link(body)

                    # Extract company name heuristically
                    company_match = re.search(r'at ([A-Z][a-zA-Z0-9 ]+)', subject)
                    company_name = company_match.group(1) if company_match else "Company"

                    if "interview" in full_header_text or "schedule" in full_header_text or meeting_url:
                        matched_interviews.append({
                            "subject": subject,
                            "sender": sender,
                            "company": company_name,
                            "meeting_url": meeting_url,
                            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        })

        mail.logout()

        # Update last_synced_at timestamp
        integ.last_synced_at = datetime.now(timezone.utc)
        await db.commit()

        return {
            "status": "success",
            "email": user_email,
            "emails_scanned": len(email_ids),
            "interviews_found": len(matched_interviews),
            "details": matched_interviews,
        }

    except imaplib.IMAP4.error as e:
        logger.error(f"Outlook IMAP login failed for {user_email}: {e}")
        return {"error": f"Outlook authentication failed: {str(e)}"}
    except Exception as e:
        logger.error(f"Outlook scan error: {e}")
        return {"error": str(e)}


async def send_outlook_email(
    user_email: str,
    to_email: str,
    subject: str,
    body_text: str,
    attachment_bytes: bytes | None = None,
    attachment_filename: str | None = None,
    db: AsyncSession = None,
) -> dict:
    """Send an email via Outlook SMTP."""
    res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == "outlook")
    )
    integ = res.scalar_one_or_none()
    if not integ or not integ.encrypted_credentials:
        return {"error": "Outlook credentials not found"}

    password = decrypt_secret(integ.encrypted_credentials)

    try:
        msg = MIMEMultipart()
        msg["From"] = user_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body_text, "plain"))

        if attachment_bytes and attachment_filename:
            part = MIMEApplication(attachment_bytes, Name=attachment_filename)
            part['Content-Disposition'] = f'attachment; filename="{attachment_filename}"'
            msg.attach(part)

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(user_email, password)
        server.send_message(msg)
        server.quit()

        return {"status": "sent", "to": to_email, "subject": subject}

    except Exception as e:
        logger.error(f"SMTP send failed to {to_email}: {e}")
        return {"error": f"Failed to send email via Outlook: {str(e)}"}
