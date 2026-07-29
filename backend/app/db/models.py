"""SQLAlchemy ORM models for the JobTool pipeline."""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    Boolean,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.db.database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ── Enums ────────────────────────────────────────────────


class ApplicationStatus(str, enum.Enum):
    QUEUED = "queued"
    REVIEWED = "reviewed"
    REVIEW_REQUIRED = "review_required"
    APPLIED = "applied"
    RESPONSE_RECEIVED = "response_received"
    REJECTED = "rejected"
    INTERVIEW = "interview"
    CANCELLED = "cancelled"


class PipelineStatus(str, enum.Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobSource(str, enum.Enum):
    ADZUNA = "adzuna"
    GREENHOUSE = "greenhouse"
    LEVER = "lever"
    ASHBY = "ashby"
    ARBEITNOW = "arbeitnow"
    REMOTEOK = "remoteok"
    THEMUSE = "themuse"


# ── Models ───────────────────────────────────────────────


class Resume(Base):
    """Uploaded resume with parsed structured data."""

    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    role_label = Column(String(100), nullable=True, default="General", doc="Target role/label for this resume")
    file_path = Column(String(500), nullable=False)
    file_data = Column(LargeBinary, nullable=True, doc="Original file bytes stored in DB for persistence across deploys")
    raw_text = Column(Text, nullable=True, doc="Extracted plain text from PDF/DOCX")
    parsed_json = Column(JSONB, nullable=True, doc="LLM-structured resume data")
    uploaded_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    is_active = Column(Boolean, default=True, doc="Only one resume is active at a time")

    # Relationships
    applications = relationship("Application", back_populates="resume")


class SearchFilter(Base):
    """User-defined search criteria for the job pipeline."""

    __tablename__ = "search_filters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, default="Default Filter")
    countries = Column(ARRAY(String), nullable=False, default=list, doc="Country codes: in, us, gb, ca, au, za")
    keywords = Column(ARRAY(String), nullable=False, default=list, doc="Role/position keywords")
    domain = Column(String(100), nullable=True, doc="Industry/domain filter")
    experience_level = Column(String(50), nullable=True, doc="Entry/Mid/Senior/Lead/Executive")
    target_count = Column(Integer, nullable=False, default=20, doc="Number of top jobs to target")
    schedule_start_time = Column(String(10), nullable=True, default="08:00", doc="Daily schedule window start")
    schedule_end_time = Column(String(10), nullable=True, default="12:00", doc="Daily schedule window end")
    continuous_hours = Column(Integer, nullable=True, default=12, doc="Continuous run duration in hours")
    is_active = Column(Boolean, default=True, doc="Active filter used by the pipeline")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    pipeline_runs = relationship("PipelineRun", back_populates="search_filter")
    applications = relationship("Application", back_populates="search_filter")


class Job(Base):
    """A sourced job posting from any API."""

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    external_id = Column(String(255), nullable=True, doc="ID from the source API")
    source = Column(Enum(JobSource), nullable=False)
    title = Column(String(500), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    url = Column(String(1000), nullable=False, doc="Link to the original posting")
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(10), nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    raw_json = Column(JSONB, nullable=True, doc="Full API response for this job")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    applications = relationship("Application", back_populates="job")


class Application(Base):
    """A tailored application for a specific job."""

    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    filter_id = Column(Integer, ForeignKey("search_filters.id"), nullable=False)
    batch_id = Column(String(50), nullable=False, doc="Groups applications from the same pipeline run")

    match_score = Column(Float, nullable=False, doc="0-100 relevance score")
    score_reasoning = Column(Text, nullable=True, doc="LLM explanation for the score")

    tailored_resume_text = Column(Text, nullable=True, doc="Tailored resume content (markdown)")
    tailored_resume_pdf = Column(String(500), nullable=True, doc="Path to generated PDF")
    cover_letter_text = Column(Text, nullable=True, doc="Generated cover letter content")
    cover_letter_pdf = Column(String(500), nullable=True, doc="Path to generated PDF")

    status = Column(
        Enum(ApplicationStatus),
        nullable=False,
        default=ApplicationStatus.QUEUED,
    )
    notes = Column(Text, nullable=True, doc="User notes on this application")
    is_pinned = Column(Boolean, default=False, nullable=True, doc="User priority pin status for ordering")

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    search_filter = relationship("SearchFilter", back_populates="applications")


class PipelineRun(Base):
    """Tracks each execution of the sourcing + tailoring pipeline."""

    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filter_id = Column(Integer, ForeignKey("search_filters.id"), nullable=False)
    batch_id = Column(String(50), nullable=False, unique=True)

    status = Column(Enum(PipelineStatus), nullable=False, default=PipelineStatus.RUNNING)
    started_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    jobs_found = Column(Integer, default=0, doc="Total jobs sourced before dedup")
    jobs_after_dedup = Column(Integer, default=0)
    jobs_matched = Column(Integer, default=0, doc="Jobs above score threshold")
    jobs_tailored = Column(Integer, default=0, doc="Jobs with completed tailoring")

    error_log = Column(Text, nullable=True)

    # Relationships
    search_filter = relationship("SearchFilter", back_populates="pipeline_runs")


class CompanyList(Base):
    """Configurable company slugs for Greenhouse/Lever/Ashby sources."""

    __tablename__ = "company_lists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(Enum(JobSource), nullable=False, doc="Which API this company belongs to")
    slug = Column(String(100), nullable=False, doc="Company slug for the API")
    name = Column(String(255), nullable=True, doc="Human-readable company name")
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class UserMemory(Base):
    """Stores user availability, preferences, and career history memory for the AI Co-Pilot."""

    __tablename__ = "user_memories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(50), nullable=False, default="preference")  # availability, preference, skill, note
    memory_key = Column(String(100), nullable=False)
    memory_value = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class AutomationSchedule(Base):
    """Stores configured pipeline schedule windows and continuous runs."""

    __tablename__ = "automation_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)  # e.g. "Everyday morning 8am-10am", "5-Hour AI Sourcing Run"
    start_time = Column(String(10), nullable=True, default="08:00")
    end_time = Column(String(10), nullable=True, default="10:00")
    duration_hours = Column(Integer, nullable=True, default=2)
    keywords = Column(ARRAY(String), nullable=True)
    company_scope = Column(String(50), nullable=True, default="all")  # big_tech, startups, all
    days_of_week = Column(ARRAY(String), nullable=True, default=list, doc="e.g. ['Mon','Tue','Wed']")
    repeat_type = Column(String(20), nullable=True, default="daily", doc="daily, weekly, custom, once")
    target_count = Column(Integer, nullable=True, default=10, doc="Jobs per run")
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    total_runs = Column(Integer, default=0)
    status = Column(String(50), nullable=False, default="active")  # active, paused, stopped, completed
    is_running = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class ChatMessage(Base):
    """Stores conversation history for the AI Co-Pilot's multi-turn memory."""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(20), nullable=False, doc="'user' or 'assistant'")
    content = Column(Text, nullable=False)
    metadata_json = Column(JSONB, nullable=True, doc="Optional structured data: actions taken, profile updates, etc.")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class UserIntegration(Base):
    """Stores connected accounts (GitHub, Outlook, LinkedIn) with AES-256 encrypted credentials."""

    __tablename__ = "user_integrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_name = Column(String(50), nullable=False, unique=True, doc="'github', 'outlook', 'linkedin'")
    username_or_email = Column(String(255), nullable=False)
    encrypted_credentials = Column(Text, nullable=True, doc="AES-256 encrypted password/token string")
    config_json = Column(JSONB, nullable=True, doc="Extra configuration: IMAP host, port, sync flags")
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

class GraphRun(Base):
    """Write-ahead state persistence for the graph engine."""

    __tablename__ = "graph_runs"

    id = Column(String(50), primary_key=True)         # run_id (UUID)
    batch_id = Column(String(50), nullable=False)
    current_node = Column(String(50), nullable=False)
    state_json = Column(JSONB, nullable=False)         # Full GraphState snapshot
    error_count = Column(Integer, default=0)
    is_terminal = Column(Boolean, default=False)       # True for COMPLETED/FAILED
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class AuditLog(Base):
    """Logs autonomous actions performed by the graph engine."""

    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), nullable=True)          # Correlation ID
    action_type = Column(String(50), nullable=False)    # sourced, scored, tailored, skipped, failed, paused
    detail = Column(Text, nullable=True)
    node_name = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class ReviewQueue(Base):
    """Dead-letter queue for failed graph runs."""

    __tablename__ = "review_queue"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), nullable=False)
    reason = Column(String(100), nullable=False)        # max_retries_exceeded, unregistered_node, etc.
    state_snapshot = Column(JSONB, nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class AgentStatus(Base):
    """Kill switch state for the autonomous agent."""

    __tablename__ = "agent_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    is_running = Column(Boolean, default=False)
    paused_reason = Column(String(255), nullable=True)
    paused_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Guardrails(Base):
    """User-defined safety constraints applied before LLM calls."""

    __tablename__ = "guardrails"

    id = Column(Integer, primary_key=True, autoincrement=True)
    min_salary = Column(Integer, nullable=True)         # Skip jobs below this
    blocked_companies = Column(ARRAY(String), default=list)  # Never apply here
    required_keywords = Column(ARRAY(String), default=list)  # Must contain at least one
    excluded_keywords = Column(ARRAY(String), default=list)  # Skip if contains any
    max_commute_km = Column(Integer, nullable=True)
    remote_only = Column(Boolean, default=False)
    daily_max_applications = Column(Integer, default=25, nullable=True)  # Daily application cap
    auto_submit_enabled = Column(Boolean, default=False)  # Dual-mode auto-submit toggle
    is_complete = Column(Boolean, default=False)        # Onboarding gate
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
