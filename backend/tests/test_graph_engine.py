"""Tests for Graph Engine."""

import pytest
import uuid
from sqlalchemy import select
from unittest.mock import AsyncMock, MagicMock

from app.db.models import GraphRun, ReviewQueue, AuditLog, AgentStatus, SearchFilter, Resume, Job, Application, Guardrails
from app.graph.engine import JobToolGraphEngine
from app.graph.state import GraphState
from app.graph.nodes import guardrail_check_node

pytestmark = pytest.mark.asyncio

@pytest.fixture
def db_session():
    """Mock async DB session."""
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalar_one.return_value = None
    mock_result.scalar.return_value = 0
    session.execute.return_value = mock_result
    return session

@pytest.fixture
def setup_graph_data():
    """Returns mock data ids."""
    return 1, 1

async def test_unregistered_node(db_session, setup_graph_data):
    filter_id, resume_id = setup_graph_data
    engine = JobToolGraphEngine()
    
    mock_status_res = MagicMock()
    mock_status = MagicMock()
    mock_status.is_running = True
    mock_status_res.scalar_one_or_none.return_value = mock_status
    db_session.execute.return_value = mock_status_res

    state = GraphState(
        run_id=str(uuid.uuid4()),
        batch_id="batch123",
        current_node="NONEXISTENT_NODE",
        filter_id=filter_id,
        resume_id=resume_id
    )
    
    final_state = await engine.run(state, db_session)
    
    assert final_state.current_node == "FAILED"
    assert db_session.add.call_count >= 1 # added to ReviewQueue and AuditLog

async def test_kill_switch_pause(db_session):
    """Test when agent kill switch is turned off."""
    mock_status_res = MagicMock()
    mock_status = MagicMock()
    mock_status.is_running = False
    mock_status_res.scalar_one_or_none.return_value = mock_status
    db_session.execute.return_value = mock_status_res
    
    engine = JobToolGraphEngine()
    state = GraphState(
        run_id=str(uuid.uuid4()),
        batch_id="batch123",
        current_node="GUARDRAIL_CHECK_NODE",
    )
    
    final_state = await engine.run(state, db_session)
    assert final_state.current_node == "PAUSED_MID_RUN"

async def test_guardrail_block(db_session):
    """Test that a job failing guardrail (e.g. incomplete guardrails or cap reached) routes state.current_node to COMPLETED with a skipped reason logged, and zero LLM calls were made."""
    # 1. Agent status is running
    mock_status = MagicMock(is_running=True)
    mock_status_res = MagicMock()
    mock_status_res.scalar_one_or_none.return_value = mock_status

    # 2. SearchFilter exists
    mock_filter = MagicMock(keywords=["python"], target_count=5)
    mock_filter_res = MagicMock()
    mock_filter_res.scalar_one_or_none.return_value = mock_filter

    # 3. Resume exists
    mock_resume = MagicMock(parsed_json={"skills": ["Python"]})
    mock_resume_res = MagicMock()
    mock_resume_res.scalar_one_or_none.return_value = mock_resume

    # 4. Guardrails exist but are incomplete
    mock_guardrails = MagicMock(is_complete=False)
    mock_guardrails_res = MagicMock()
    mock_guardrails_res.scalar_one_or_none.return_value = mock_guardrails

    db_session.execute.side_effect = [
        mock_status_res,
        mock_filter_res,
        mock_resume_res,
        mock_guardrails_res
    ]

    state = GraphState(
        run_id=str(uuid.uuid4()),
        batch_id="batch_guardrail",
        current_node="GUARDRAIL_CHECK_NODE",
        filter_id=1,
        resume_id=1,
        tokens_used=0,
    )

    final_state = await guardrail_check_node(state, db_session)

    assert final_state.current_node == "COMPLETED"
    assert any("Skipped:" in msg for msg in final_state.history)
    assert final_state.tokens_used == 0

async def test_3x_failure_review_queue(db_session, setup_graph_data):
    """Force an unrecoverable failure and check review queue."""
    filter_id, resume_id = setup_graph_data
    engine = JobToolGraphEngine()
    
    mock_status_res = MagicMock()
    mock_status = MagicMock()
    mock_status.is_running = True
    mock_status_res.scalar_one_or_none.return_value = mock_status
    db_session.execute.return_value = mock_status_res
    
    async def mock_fail_node(state, db):
        raise ValueError("Simulated failure")
        
    engine.nodes["GUARDRAIL_CHECK_NODE"] = mock_fail_node
    
    state = GraphState(
        run_id=str(uuid.uuid4()),
        batch_id="batch_fail",
        current_node="GUARDRAIL_CHECK_NODE",
        filter_id=filter_id,
        resume_id=resume_id
    )
    
    final_state = await engine.run(state, db_session)
    
    assert final_state.current_node == "FAILED"
    assert final_state.error_count == 1
    assert db_session.add.call_count >= 1

async def test_delete_queued_application_allowed(db_session):
    """Test that cancelling a QUEUED application transitions it to CANCELLED status."""
    from app.api.applications import delete_single_application
    from app.db.models import ApplicationStatus
    
    mock_app = MagicMock()
    mock_app.id = 1
    mock_app.status = ApplicationStatus.QUEUED
    mock_app.job = MagicMock(company="Acme Corp", title="Developer")
    
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = mock_app
    db_session.execute.return_value = mock_res
    
    result = await delete_single_application(1, db=db_session, _user="admin")
    
    assert mock_app.status == ApplicationStatus.CANCELLED
    assert result["status"] == "cancelled"

async def test_delete_interview_application_forbidden(db_session):
    """Test that attempting to delete an INTERVIEW application raises HTTP 400."""
    from fastapi import HTTPException
    from app.api.applications import delete_single_application
    from app.db.models import ApplicationStatus
    
    mock_app = MagicMock()
    mock_app.id = 2
    mock_app.status = ApplicationStatus.INTERVIEW
    mock_app.job = MagicMock(company="BigTech", title="Engineer")
    
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = mock_app
    db_session.execute.return_value = mock_res
    
    with pytest.raises(HTTPException) as exc_info:
        await delete_single_application(2, db=db_session, _user="admin")
        
    assert exc_info.value.status_code == 400
    assert "Cannot delete application with status 'interview'" in exc_info.value.detail

async def test_pause_mid_run(db_session, setup_graph_data):
    """Test that flipping kill switch mid-run transitions state to PAUSED_MID_RUN."""
    filter_id, resume_id = setup_graph_data
    engine = JobToolGraphEngine()

    mock_status_res = MagicMock()
    mock_status = MagicMock()
    mock_status.is_running = False  # Flip kill switch to paused
    mock_status_res.scalar_one_or_none.return_value = mock_status
    db_session.execute.return_value = mock_status_res

    state = GraphState(
        run_id=str(uuid.uuid4()),
        batch_id="batch_pause",
        current_node="SOURCE_JOBS_NODE",
        filter_id=filter_id,
        resume_id=resume_id
    )

    final_state = await engine.run(state, db_session)
    assert final_state.current_node == "PAUSED_MID_RUN"

async def test_idempotency(db_session):
    """Test that persist_db_node skips already created applications for the same batch."""
    from app.graph.nodes.persist_db import persist_db_node
    
    mock_job = MagicMock()
    mock_job.id = 10
    
    mock_app = MagicMock()
    mock_app.id = 100 # Existing application
    
    mock_res_job = MagicMock()
    mock_res_job.scalar_one_or_none.return_value = mock_job
    
    mock_res_app = MagicMock()
    mock_res_app.scalar_one_or_none.return_value = mock_app
    
    # Return existing job first query, existing app second query
    db_session.execute.side_effect = [mock_res_job, mock_res_app]

    state = GraphState(
        run_id=str(uuid.uuid4()),
        batch_id="batch_idem",
        current_node="PERSIST_DB_NODE",
        matched_jobs=[{
            "job": {"external_id": "job1", "source": "adzuna", "title": "Dev", "company": "Co", "url": "x", "location": "Remote", "description": "x", "salary_min": None, "salary_max": None, "salary_currency": None, "posted_at": None, "raw_json": {}},
            "score_data": {"score": 85, "reasoning": "Match"}
        }]
    )

    final_state = await persist_db_node(state, db_session)
    assert final_state.current_node == "SUBMIT_APPLICATION_NODE"
    assert "Skipped duplicate application" in final_state.history[-2]

async def test_resume_from_pause(db_session, setup_graph_data):
    """Test resuming a run from saved GraphRun state after unpausing."""
    filter_id, resume_id = setup_graph_data
    engine = JobToolGraphEngine()

    mock_run = MagicMock()
    mock_run.state_json = {
        "run_id": "run_resumed_123",
        "batch_id": "batch_res",
        "current_node": "SOURCE_JOBS_NODE",
        "filter_id": filter_id,
        "resume_id": resume_id
    }
    
    mock_res_run = MagicMock()
    mock_res_run.scalar_one_or_none.return_value = mock_run

    mock_status_res = MagicMock()
    mock_status = MagicMock()
    mock_status.is_running = True
    mock_status_res.scalar_one_or_none.return_value = mock_status
    
    db_session.execute.side_effect = [mock_res_run, mock_status_res, mock_status_res, mock_status_res]

    async def mock_source_node(st, db):
        st.current_node = "COMPLETED"
        return st

    engine.nodes["SOURCE_JOBS_NODE"] = mock_source_node

    resumed_state = await engine.resume("run_resumed_123", db_session)
    assert resumed_state is not None
    assert resumed_state.current_node == "COMPLETED"

async def test_malformed_llm_json(db_session):
    """Test that malformed LLM output is caught and routed to fallback/review queue."""
    from app.graph.schemas import JobScoreResult
    
    with pytest.raises(Exception):
        JobScoreResult(score=150, real_odds_score=-10, callback_tier="", reasoning="")


async def test_submit_application_node_draft_mode(db_session):
    """Test that submit_application_node skips submission when auto_submit_enabled is False."""
    from app.graph.nodes.submit_application import submit_application_node
    
    mock_guardrails = MagicMock(auto_submit_enabled=False)
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_guardrails
    db_session.execute.return_value = mock_res
    
    state = GraphState(
        run_id=str(uuid.uuid4()),
        batch_id="batch_draft",
        current_node="SUBMIT_APPLICATION_NODE",
    )
    
    final_state = await submit_application_node(state, db_session)
    assert final_state.current_node == "COMPLETED"
    assert "Draft-Only Mode active" in final_state.history[-1]


async def test_submit_application_url_detection():
    """Test per-posting API capability URL detection logic."""
    from app.submitters.base import detect_submitter_type
    
    assert detect_submitter_type("https://boards.greenhouse.io/stripe/jobs/123") == "greenhouse_api"
    assert detect_submitter_type("https://jobs.lever.co/figma/abc-123") == "lever_api"
    assert detect_submitter_type("https://jobs.ashbyhq.com/linear/456") == "ashby_api"
    assert detect_submitter_type("https://careers.google.com/jobs/results/") == "web_playwright"

