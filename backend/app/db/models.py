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
    APPLIED = "applied"
    RESPONSE_RECEIVED = "response_received"
    REJECTED = "rejected"
    INTERVIEW = "interview"


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
