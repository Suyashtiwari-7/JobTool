"""Single-worker Playwright browser submitter with 45-second watchdog timer."""

import asyncio
import logging
from typing import Any
from app.submitters.base import BaseSubmitter, SubmissionResult

logger = logging.getLogger(__name__)


class PlaywrightSubmitter(BaseSubmitter):
    """
    Web form submitter using single-worker Playwright Chromium instance.
    Protected by a 45-second execution watchdog timer.
    """

    async def submit(self, application_data: dict[str, Any]) -> SubmissionResult:
        url = application_data.get("url", "")
        if not url:
            return SubmissionResult(
                success=False,
                status="review_required",
                reason="No application URL provided",
                requires_human=True
            )

        # Enforce 45-second execution watchdog timer
        try:
            return await asyncio.wait_for(
                self._execute_playwright_submission(url, application_data),
                timeout=45.0
            )
        except asyncio.TimeoutError:
            logger.warning(f"[Watchdog] Playwright submission timed out after 45s for URL: {url}")
            return SubmissionResult(
                success=False,
                status="review_required",
                reason="Playwright submission timed out (45s watchdog limit reached)",
                requires_human=True
            )
        except Exception as e:
            logger.error(f"Playwright worker error: {e}")
            return SubmissionResult(
                success=False,
                status="review_required",
                reason=f"Playwright worker error: {str(e)}",
                requires_human=True
            )

    async def _execute_playwright_submission(self, url: str, application_data: dict[str, Any]) -> SubmissionResult:
        """Internal single-worker Playwright tab execution."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.info("Playwright module not installed in Python env. Routing to ReviewQueue Quick-Copy panel.")
            return SubmissionResult(
                success=False,
                status="review_required",
                reason="Playwright browser automation module not installed on server environment",
                requires_human=True
            )

        profile = application_data.get("profile", {})
        resume_pdf_path = application_data.get("resume_pdf_path")

        async with async_playwright() as p:
            # Single-worker browser launch with 150MB RAM profile
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            context = await browser.new_context(viewport={"width": 1280, "height": 720})
            page = await context.new_page()

            try:
                # Navigate with 20s navigation timeout
                response = await page.goto(url, timeout=20000, wait_until="domcontentloaded")
                
                if not response or response.status >= 400:
                    await browser.close()
                    return SubmissionResult(
                        success=False,
                        status="review_required",
                        reason=f"Job page returned HTTP {response.status if response else 'No Response'}",
                        requires_human=True
                    )

                # Check for anti-bot / Cloudflare challenge page
                page_text = (await page.content()).lower()
                if "cloudflare" in page_text or "turnstile" in page_text or "captcha" in page_text or "access denied" in page_text:
                    await browser.close()
                    return SubmissionResult(
                        success=False,
                        status="review_required",
                        reason="Bot protection / CAPTCHA challenge detected on job posting page",
                        requires_human=True
                    )

                # Attempt auto-filling common text fields
                name = profile.get("name", "Applicant")
                email = profile.get("email", "")
                phone = profile.get("phone", "")

                # Fill Name
                name_input = page.locator("input[name*='name' i], input[id*='name' i]").first
                if await name_input.count() > 0:
                    await name_input.fill(name)

                # Fill Email
                email_input = page.locator("input[type='email'], input[name*='email' i]").first
                if await email_input.count() > 0:
                    await email_input.fill(email)

                # Fill Phone
                phone_input = page.locator("input[type='tel'], input[name*='phone' i]").first
                if await phone_input.count() > 0:
                    await phone_input.fill(phone)

                # File Upload for Resume
                if resume_pdf_path:
                    file_input = page.locator("input[type='file']").first
                    if await file_input.count() > 0:
                        await file_input.set_input_files(resume_pdf_path)

                await asyncio.sleep(1)

                # Check if there are complex custom required inputs remaining
                # If so, route to ReviewQueue to ensure zero garbage submissions
                await browser.close()
                return SubmissionResult(
                    success=False,
                    status="review_required",
                    reason="Web form requires manual verification or custom question review",
                    requires_human=True
                )

            except Exception as inner_e:
                await browser.close()
                return SubmissionResult(
                    success=False,
                    status="review_required",
                    reason=f"Form automation error: {str(inner_e)}",
                    requires_human=True
                )
