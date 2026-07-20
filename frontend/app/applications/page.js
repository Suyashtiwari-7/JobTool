'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { getApplications, updateApplicationStatus } from '../lib/api';

const STATUS_OPTIONS = [
  { value: 'queued', label: 'Queued', icon: '📦' },
  { value: 'reviewed', label: 'Reviewed', icon: '👀' },
  { value: 'applied', label: 'Applied', icon: '✅' },
  { value: 'response_received', label: 'Response', icon: '💬' },
  { value: 'interview', label: 'Interview', icon: '🎯' },
  { value: 'rejected', label: 'Rejected', icon: '❌' },
];

function ScoreBadge({ score }) {
  let level = 'low';
  if (score >= 70) level = 'high';
  else if (score >= 45) level = 'medium';

  return (
    <div className={`score-badge ${level}`}>
      {Math.round(score)}
    </div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      const data = await getApplications({ limit: 100 });
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(appId, newStatus) {
    try {
      const updated = await updateApplicationStatus(appId, newStatus);
      setApplications(prev =>
        prev.map(a => a.id === appId ? { ...a, status: updated.status } : a)
      );
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  }

  const filtered = activeTab === 'all'
    ? applications
    : applications.filter(a => a.status === activeTab);

  return (
    <AuthLayout>
      <div className="page-header">
        <h1 className="page-title">Review Queue</h1>
        <p className="page-subtitle">Review tailored applications and apply to jobs</p>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading applications...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">No applications yet</h3>
          <p className="empty-state-text">
            Run the pipeline from the Pipeline page to source and tailor job applications.
          </p>
        </div>
      ) : (
        <>
          {/* Status Tabs */}
          <div className="tabs" style={{ maxWidth: 600, marginBottom: 24 }}>
            <button
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ({applications.length})
            </button>
            {STATUS_OPTIONS.slice(0, 4).map(s => {
              const count = applications.filter(a => a.status === s.value).length;
              return (
                <button
                  key={s.value}
                  className={`tab ${activeTab === s.value ? 'active' : ''}`}
                  onClick={() => setActiveTab(s.value)}
                >
                  {s.icon} {count}
                </button>
              );
            })}
          </div>

          {/* Application Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((app, index) => (
              <div
                key={app.id}
                className="app-card"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ScoreBadge score={app.match_score} />

                <div className="app-card-content">
                  <div className="app-card-title">{app.job.title}</div>
                  <div className="app-card-company">{app.job.company}</div>
                  <div className="app-card-meta">
                    {app.job.location && <span>📍 {app.job.location}</span>}
                    <span>via {app.job.source}</span>
                    <span className={`status-badge status-${app.status}`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="app-card-actions">
                  <a
                    href={`/applications/${app.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    View Details
                  </a>
                  <a
                    href={app.job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success btn-sm"
                  >
                    Open Job →
                  </a>
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.id, e.target.value)}
                    className="form-select"
                    style={{ fontSize: 11, padding: '4px 28px 4px 8px', minWidth: 120 }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AuthLayout>
  );
}
