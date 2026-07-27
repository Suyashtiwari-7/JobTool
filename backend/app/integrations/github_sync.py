"""GitHub Public Skill Auto-Sync Engine.

Uses public GitHub REST API (no passwords or access tokens required).
Fetches user's public repositories, languages, and topics, and auto-updates
the Career Profile in UserMemory.
"""

import logging
from datetime import datetime, timezone
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserMemory, UserIntegration

logger = logging.getLogger(__name__)


async def sync_github_skills(username: str, db: AsyncSession) -> dict:
    """
    Fetch public GitHub data for username and update UserMemory.
    
    Returns:
        dict: Summary of extracted repositories and new skills added.
    """
    clean_user = username.strip().lstrip('@')
    if not clean_user:
        return {"error": "Invalid GitHub username"}

    url = f"https://api.github.com/users/{clean_user}/repos?sort=updated&per_page=30"
    headers = {
        "User-Agent": "JobTool-Career-Copilot/2.0",
        "Accept": "application/vnd.github.v3+json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=headers)
        if res.status_code == 404:
            return {"error": f"GitHub user '{clean_user}' not found"}
        elif res.status_code != 200:
            return {"error": f"GitHub API returned {res.status_code}"}

        repos_data = res.json()

    languages = set()
    topics = set()
    repo_names = []

    for repo in repos_data:
        if repo.get("fork"):
            continue  # Skip forked repos to focus on original work
        
        name = repo.get("name")
        if name:
            repo_names.append(name)

        lang = repo.get("language")
        if lang:
            languages.add(lang)

        repo_topics = repo.get("topics") or []
        for t in repo_topics:
            topics.add(t)

    all_skills = sorted(list(languages | topics))
    skills_summary = ", ".join(all_skills) if all_skills else "General Development"
    repos_summary = ", ".join(repo_names[:10])

    # Update or insert into UserMemory
    async def upsert_memory(category: str, key: str, value: str):
        existing = await db.execute(
            select(UserMemory).where(
                UserMemory.category == category,
                UserMemory.memory_key == key,
            )
        )
        mem = existing.scalar_one_or_none()
        if mem:
            mem.memory_value = value
            mem.updated_at = datetime.now(timezone.utc)
        else:
            db.add(UserMemory(
                category=category,
                memory_key=key,
                memory_value=value,
            ))

    await upsert_memory("career", "github_languages", ", ".join(sorted(list(languages))))
    await upsert_memory("career", "github_skills", skills_summary)
    await upsert_memory("career", "github_top_projects", repos_summary)
    await upsert_memory("links", "github", f"https://github.com/{clean_user}")

    # Update UserIntegration record last_synced_at
    integ_res = await db.execute(
        select(UserIntegration).where(UserIntegration.service_name == "github")
    )
    integ = integ_res.scalar_one_or_none()
    if integ:
        integ.last_synced_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "status": "success",
        "username": clean_user,
        "repos_scanned": len(repos_data),
        "languages": list(languages),
        "topics": list(topics),
        "top_projects": repo_names[:10],
    }
