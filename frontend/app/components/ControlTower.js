'use client';

import { useEffect, useState } from 'react';
import { getAuditLog, getReviewQueue, resolveReviewItem, retryReviewItem } from '../lib/api';

/**
 * ControlTower — Dashboard header component showing real-time agent status,
 * live audit log event feed, and dead-letter review queue alerts.
 */
export default function ControlTower({ onRunPipeline }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingReview, setLoadingReview] = useState(true);
  const [processingItem, setProcessingItem] = useState(null);

  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function loadFeed() {
    try {
      const [logs, reviews] = await Promise.all([
        getAuditLog(15),
        getReviewQueue(),
      ]);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setReviewItems(Array.isArray(reviews) ? reviews : []);
    } catch (err) {
      console.error('ControlTower feed error:', err);
    } finally {
      setLoadingLogs(false);
      setLoadingReview(false);
    }
  }

  async function handleResolve(id) {
    try {
      setProcessingItem(id);
      await resolveReviewItem(id);
      await loadFeed();
    } catch (err) {
      alert(`Failed to resolve: ${err.message}`);
    } finally {
      setProcessingItem(null);
    }
  }

  async function handleRetry(id) {
    try {
      setProcessingItem(id);
      await retryReviewItem(id);
      alert('Retry launched in background!');
      await loadFeed();
    } catch (err) {
      alert(`Failed to retry: ${err.message}`);
    } finally {
      setProcessingItem(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
      
      {/* ── ALERT BANNER FOR REVIEW QUEUE ── */}
      {reviewItems.length > 0 && (
        <div style={{
          padding: '14px 20px', borderRadius: 20,
          background: 'rgba(245, 158, 11, 0.15)', border: '1.5px solid var(--accent-orange)',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-orange)' }}>
                {reviewItems.length} Agent Run{reviewItems.length > 1 ? 's' : ''} Requiring Human Review
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                The agent parked failed runs in the dead-letter queue instead of silently failing.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {reviewItems.slice(0, 2).map((item) => {
              const stateData = item.failed_state_json || {};
              const jobData = stateData.job || {};
              const jobUrl = jobData.url || '';
              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 14, border: '1px solid var(--border-subtle)', minWidth: 280 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800 }}>⚠️ {jobData.company || 'Job'} — {jobData.title || 'Review Required'}</span>
                    <span style={{ fontSize: 10, color: 'var(--accent-orange)' }}>{item.reason || 'Human Verification'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    {jobUrl && (
                      <a
                        href={jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="neu-button"
                        style={{ padding: '4px 8px', fontSize: 10, borderRadius: 10, textDecoration: 'none', color: 'var(--accent-blue)', fontWeight: 700 }}
                      >
                        🔗 Open Posting
                      </a>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Application Details:\nCompany: ${jobData.company}\nTitle: ${jobData.title}\nURL: ${jobUrl}`);
                        alert('📋 Job info copied to clipboard! Submit on the official board in < 10s.');
                      }}
                      className="neu-button"
                      style={{ padding: '4px 8px', fontSize: 10, borderRadius: 10 }}
                    >
                      📋 Quick-Copy Panel
                    </button>
                    <button
                      onClick={() => handleResolve(item.id)}
                      disabled={processingItem === item.id}
                      className="neu-button"
                      style={{ padding: '4px 8px', fontSize: 10, borderRadius: 10, color: 'var(--text-muted)' }}
                    >
                      ✓ Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CONTROL TOWER COCKPIT GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        
        {/* LIVE ACTIVITY FEED */}
        <div className="neu-card" style={{ padding: 18, borderRadius: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚡ Live Agent Audit Feed</span>
              <span style={{ fontSize: 10, color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: 10 }}>Auto-Refreshing</span>
            </div>
            <button onClick={loadFeed} className="neu-button" style={{ padding: '4px 10px', fontSize: 11, borderRadius: 12 }}>
              🔄 Refresh
            </button>
          </div>

          <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loadingLogs ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading audit feed...</div>
            ) : auditLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No autonomous actions logged yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, padding: '6px 10px', borderRadius: 12, background: 'var(--bg-neu-inset)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <span style={{
                      fontWeight: 800, textTransform: 'uppercase', fontSize: 9, padding: '2px 6px', borderRadius: 6,
                      background: log.action_type === 'tailored' ? 'rgba(16, 185, 129, 0.2)' : log.action_type === 'paused' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: log.action_type === 'tailored' ? 'var(--accent-green)' : log.action_type === 'paused' ? 'var(--accent-red)' : 'var(--accent-blue)',
                    }}>
                      {log.action_type}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360 }}>
                      {log.detail}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QUICK CONTROL ACTIONS */}
        <div className="neu-card" style={{ padding: 18, borderRadius: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              🕹️ Autonomous Execution
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Trigger manual pipeline execution or configure 4-hour cron automation.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={onRunPipeline}
              className="neu-button neu-button-primary"
              style={{ flex: 1, padding: '10px 14px', fontSize: 12, borderRadius: 14, fontWeight: 800 }}
            >
              ▶ Run Pipeline Now
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
