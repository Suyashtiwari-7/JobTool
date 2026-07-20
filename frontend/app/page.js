'use client';

import { useEffect, useState } from 'react';
import AuthLayout from './components/AuthLayout';
import { getStats, getPipelineStatus, getActiveFilter, getResume } from './lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [filter, setFilter] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, p, f, r] = await Promise.all([
        getStats().catch(() => null),
        getPipelineStatus().catch(() => null),
        getActiveFilter().catch(() => null),
        getResume().catch(() => null),
      ]);
      setStats(s);
      setPipelineStatus(p);
      setFilter(f);
      setResume(r);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your job application pipeline</p>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading dashboard...</span>
        </div>
      ) : (
        <>
          {/* Setup Checklist */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">🚀 Quick Setup</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SetupItem
                done={!!resume}
                label="Upload your resume"
                href="/resume"
              />
              <SetupItem
                done={!!filter}
                label="Configure search filters"
                href="/filters"
              />
              <SetupItem
                done={stats && stats.total > 0}
                label="Run your first pipeline"
                href="/pipeline"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats?.total || 0}</div>
              <div className="stat-label">Total Applications</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.queued || 0}</div>
              <div className="stat-label">Queued for Review</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.applied || 0}</div>
              <div className="stat-label">Applied</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.response_received || 0}</div>
              <div className="stat-label">Responses</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {stats?.avg_match_score ? `${Math.round(stats.avg_match_score)}%` : '—'}
              </div>
              <div className="stat-label">Avg Match Score</div>
            </div>
          </div>

          {/* Pipeline Status */}
          {pipelineStatus && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h2 className="card-title">Latest Pipeline Run</h2>
                <div className={`pipeline-indicator pipeline-${pipelineStatus.status}`}>
                  {pipelineStatus.status === 'running' && <div className="pulse-dot" />}
                  {pipelineStatus.status}
                </div>
              </div>
              <div className="stats-grid" style={{ marginBottom: 0 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {pipelineStatus.jobs_found}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jobs Found</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {pipelineStatus.jobs_after_dedup}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>After Dedup</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {pipelineStatus.jobs_matched}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Matched</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {pipelineStatus.jobs_tailored}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tailored</div>
                </div>
              </div>
            </div>
          )}

          {/* Active Filter */}
          {filter && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Active Search Filter</h2>
                <a href="/filters" className="btn btn-secondary btn-sm">Edit</a>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Keywords: </span>
                  <span>{filter.keywords?.join(', ') || 'None'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Countries: </span>
                  <span>{filter.countries?.join(', ').toUpperCase() || 'None'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target: </span>
                  <span>{filter.target_count} jobs</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AuthLayout>
  );
}

function SetupItem({ done, label, href }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: done ? 'var(--accent-green-bg)' : 'var(--bg-input)',
        textDecoration: 'none',
        color: done ? 'var(--accent-green)' : 'var(--text-secondary)',
        fontSize: 14,
        transition: 'all var(--transition-fast)',
      }}
    >
      <span style={{ fontSize: 18 }}>{done ? '✅' : '⬜'}</span>
      <span style={{ fontWeight: 500 }}>{label}</span>
    </a>
  );
}
