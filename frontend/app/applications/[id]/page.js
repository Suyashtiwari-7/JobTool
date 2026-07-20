'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthLayout from '../../components/AuthLayout';
import { getApplication, updateApplicationStatus, getResumePdfUrl, getCoverLetterPdfUrl } from '../../lib/api';

const STATUS_OPTIONS = [
  { value: 'queued', label: 'Queued' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'applied', label: 'Applied' },
  { value: 'response_received', label: 'Response Received' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ApplicationDetailPage() {
  const params = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('resume');

  useEffect(() => {
    loadApplication();
  }, [params.id]);

  async function loadApplication() {
    try {
      const data = await getApplication(params.id);
      setApp(data);
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      const updated = await updateApplicationStatus(app.id, newStatus);
      setApp(prev => ({ ...prev, status: updated.status }));
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  }

  if (loading) {
    return (
      <AuthLayout>
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading application...</span>
        </div>
      </AuthLayout>
    );
  }

  if (!app) {
    return (
      <AuthLayout>
        <div className="empty-state">
          <h3 className="empty-state-title">Application not found</h3>
        </div>
      </AuthLayout>
    );
  }

  let scoreLevel = 'low';
  if (app.match_score >= 70) scoreLevel = 'high';
  else if (app.match_score >= 45) scoreLevel = 'medium';

  return (
    <AuthLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <a href="/applications" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
            ← Back to Queue
          </a>
          <h1 className="page-title">{app.job.title}</h1>
          <p style={{ fontSize: 16, color: 'var(--text-accent)', marginTop: 4 }}>{app.job.company}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            {app.job.location && <span>📍 {app.job.location}</span>}
            <span>via {app.job.source}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          <div className={`score-badge ${scoreLevel}`} style={{ width: 64, height: 64, fontSize: 20 }}>
            {Math.round(app.match_score)}
          </div>
          <select
            value={app.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="form-select"
            style={{ fontSize: 12, padding: '6px 32px 6px 12px' }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Score Reasoning */}
      {app.score_reasoning && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title" style={{ marginBottom: 8 }}>🎯 Match Analysis</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {app.score_reasoning}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <a
          href={app.job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-success"
        >
          🔗 Open Application Page
        </a>
        <a
          href={getResumePdfUrl(app.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          📄 Download Resume PDF
        </a>
        <a
          href={getCoverLetterPdfUrl(app.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          ✉️ Download Cover Letter PDF
        </a>
      </div>

      {/* Content Tabs */}
      <div className="tabs" style={{ maxWidth: 400 }}>
        <button
          className={`tab ${activeSection === 'resume' ? 'active' : ''}`}
          onClick={() => setActiveSection('resume')}
        >
          Tailored Resume
        </button>
        <button
          className={`tab ${activeSection === 'cover' ? 'active' : ''}`}
          onClick={() => setActiveSection('cover')}
        >
          Cover Letter
        </button>
      </div>

      {/* Content */}
      <div className="card">
        {activeSection === 'resume' ? (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {app.tailored_resume_text || 'No tailored resume generated yet.'}
          </div>
        ) : (
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {app.cover_letter_text || 'No cover letter generated yet.'}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
