'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { triggerPipeline, getPipelineStatus, getPipelineHistory } from '../lib/api';

export default function PipelinePage() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh when pipeline is running
  useEffect(() => {
    if (status?.status === 'running') {
      const interval = setInterval(async () => {
        try {
          const s = await getPipelineStatus();
          setStatus(s);
          if (s?.status !== 'running') {
            clearInterval(interval);
            setRunning(false);
            loadData();
          }
        } catch (err) {
          // Ignore polling errors
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [status?.status]);

  async function loadData() {
    try {
      const [s, h] = await Promise.all([
        getPipelineStatus().catch(() => null),
        getPipelineHistory().catch(() => []),
      ]);
      setStatus(s);
      setHistory(h || []);
    } catch (err) {
      console.error('Pipeline load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setMessage('');
    try {
      const result = await triggerPipeline();
      setMessage(`Pipeline started! Batch: ${result.batch_id}`);
      // Start polling for status
      setTimeout(async () => {
        const s = await getPipelineStatus();
        setStatus(s);
      }, 2000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setRunning(false);
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleString();
  }

  function formatDuration(start, end) {
    if (!start || !end) return '—';
    const ms = new Date(end) - new Date(start);
    const secs = Math.round(ms / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  return (
    <AuthLayout>
      <div className="page-header">
        <h1 className="page-title">Pipeline</h1>
        <p className="page-subtitle">Source jobs, score, and tailor applications automatically</p>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading pipeline...</span>
        </div>
      ) : (
        <>
          {/* Run Button */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="card-title">Run Pipeline</h3>
                <p className="card-subtitle" style={{ marginTop: 4 }}>
                  Sources jobs → Deduplicates → Scores → Tailors resumes → Generates PDFs
                </p>
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleRun}
                disabled={running || status?.status === 'running'}
              >
                {running || status?.status === 'running' ? (
                  <>
                    <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                    Running...
                  </>
                ) : (
                  '⚡ Run Now'
                )}
              </button>
            </div>
            {message && (
              <p style={{
                marginTop: 12,
                fontSize: 13,
                color: message.startsWith('Error') ? 'var(--accent-red)' : 'var(--accent-green)',
              }}>
                {message}
              </p>
            )}
          </div>

          {/* Current Status */}
          {status && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3 className="card-title">Current Run</h3>
                <div className={`pipeline-indicator pipeline-${status.status}`}>
                  {status.status === 'running' && <div className="pulse-dot" />}
                  {status.status}
                </div>
              </div>

              <div className="stats-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 24 }}>{status.jobs_found}</div>
                  <div className="stat-label">Jobs Found</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 24 }}>{status.jobs_after_dedup}</div>
                  <div className="stat-label">After Dedup</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 24 }}>{status.jobs_matched}</div>
                  <div className="stat-label">Matched</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 24 }}>{status.jobs_tailored}</div>
                  <div className="stat-label">Tailored</div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Started: {formatDate(status.started_at)}</span>
                {status.finished_at && (
                  <span style={{ marginLeft: 16 }}>
                    Duration: {formatDuration(status.started_at, status.finished_at)}
                  </span>
                )}
              </div>

              {status.error_log && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'var(--accent-red-bg)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  color: 'var(--accent-red)',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                }}>
                  {status.error_log}
                </div>
              )}
            </div>
          )}

          {/* Run History */}
          {history.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Run History</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Batch</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Found</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Matched</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tailored</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Duration</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((run) => (
                      <tr key={run.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>
                          {run.batch_id.slice(0, 20)}...
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`status-badge status-${run.status === 'completed' ? 'applied' : run.status === 'failed' ? 'rejected' : 'queued'}`}>
                            {run.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{run.jobs_found}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{run.jobs_matched}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{run.jobs_tailored}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatDuration(run.started_at, run.finished_at)}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatDate(run.started_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AuthLayout>
  );
}
