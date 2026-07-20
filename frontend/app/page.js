'use client';

import { useEffect, useState } from 'react';
import AuthLayout from './components/AuthLayout';
import {
  getStats,
  getPipelineStatus,
  getActiveFilter,
  createFilter,
  listResumes,
  uploadResume,
  activateResume,
  deleteResume,
  getApplications,
  updateApplicationStatus,
  clearApplications,
  triggerPipeline,
  getResumePdfUrl,
  getCoverLetterPdfUrl,
} from './lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [filter, setFilter] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);

  // Form states
  const [newRoleLabel, setNewRoleLabel] = useState('Fullstack Developer');
  const [selectedFile, setSelectedFile] = useState(null);

  // Filter form states
  const [keywords, setKeywords] = useState('software engineer, fullstack');
  const [domain, setDomain] = useState('Tech / SaaS');
  const [targetCount, setTargetCount] = useState(50);
  const [experienceLevel, setExperienceLevel] = useState('Mid');
  const [scheduleStart, setScheduleStart] = useState('08:00');
  const [scheduleEnd, setScheduleEnd] = useState('12:00');
  const [continuousHours, setContinuousHours] = useState(12);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      const [s, p, f, rList, apps] = await Promise.all([
        getStats().catch(() => null),
        getPipelineStatus().catch(() => null),
        getActiveFilter().catch(() => null),
        listResumes().catch(() => []),
        getApplications({ limit: 50 }).catch(() => []),
      ]);

      setStats(s);
      setPipelineStatus(p);
      if (p?.status === 'running') setRunning(true);
      setResumes(rList);
      setApplications(apps);

      if (f) {
        setFilter(f);
        setKeywords(f.keywords?.join(', ') || '');
        setDomain(f.domain || '');
        setTargetCount(f.target_count || 50);
        setExperienceLevel(f.experience_level || 'Mid');
        setScheduleStart(f.schedule_start_time || '08:00');
        setScheduleEnd(f.schedule_end_time || '12:00');
        setContinuousHours(f.continuous_hours || 12);
      }
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Pipeline Execution
  async function handleRunPipeline() {
    setRunning(true);
    try {
      await triggerPipeline();
      alert('🚀 Pipeline triggered! Sourcing best role openings...');
      setTimeout(loadAllData, 3000);
    } catch (err) {
      alert('Failed to start pipeline: ' + err.message);
      setRunning(false);
    }
  }

  // Handle Clear Application History
  async function handleClearHistory() {
    if (!confirm('⚠️ Are you sure you want to clear all application history and queue records? This action cannot be undone.')) return;
    setClearing(true);
    try {
      await clearApplications();
      alert('🧹 History cleared!');
      await loadAllData();
    } catch (err) {
      alert('Failed to clear history: ' + err.message);
    } finally {
      setClearing(false);
    }
  }

  // Handle Resume Upload with Role Label
  async function handleResumeUpload(e) {
    e.preventDefault();
    if (!selectedFile) return alert('Please select a PDF or DOCX file.');
    setUploading(true);
    try {
      await uploadResume(selectedFile, newRoleLabel);
      setSelectedFile(null);
      alert(`✅ Uploaded resume for role: ${newRoleLabel}`);
      const updatedList = await listResumes();
      setResumes(updatedList);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  // Switch Active Resume
  async function handleActivateResume(id) {
    try {
      await activateResume(id);
      const updatedList = await listResumes();
      setResumes(updatedList);
    } catch (err) {
      alert('Failed to activate resume: ' + err.message);
    }
  }

  // Delete Resume
  async function handleDeleteResume(id) {
    if (!confirm('Delete this resume?')) return;
    try {
      await deleteResume(id);
      const updatedList = await listResumes();
      setResumes(updatedList);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  // Handle Filter & Schedule Save
  async function handleSaveFilter(e) {
    e.preventDefault();
    setSavingFilter(true);
    try {
      const kwList = keywords.split(',').map((k) => k.trim()).filter(Boolean);
      const updated = await createFilter({
        name: 'Default Filter',
        countries: ['in', 'us', 'gb', 'ca'],
        keywords: kwList,
        domain,
        experience_level: experienceLevel,
        target_count: parseInt(targetCount) || 50,
        schedule_start_time: scheduleStart,
        schedule_end_time: scheduleEnd,
        continuous_hours: parseInt(continuousHours) || 12,
      });
      setFilter(updated);
      alert('🎯 Filter & Schedule settings updated!');
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSavingFilter(false);
    }
  }

  // Handle Status Switch
  async function handleStatusChange(id, newStatus) {
    try {
      await updateApplicationStatus(id, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      alert('Status update failed: ' + err.message);
    }
  }

  return (
    <AuthLayout>
      {/* ── Top Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
            JobTool Control Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Single-Page Automated Application Pipeline & Resume Manager
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            className="neu-button neu-button-danger"
            title="Clear old history and queue"
          >
            🧹 {clearing ? 'Clearing...' : 'Clear History'}
          </button>

          <button
            onClick={handleRunPipeline}
            disabled={running}
            className={`neu-button neu-button-primary ${running ? 'pulse-active' : ''}`}
            style={{ padding: '12px 24px', fontSize: 15 }}
          >
            ⚡ {running ? 'Pipeline Active...' : 'Run Pipeline Now'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div>Loading Neumorphic Control Panel...</div>
        </div>
      ) : (
        <>
          {/* ── Top Stats Bar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 32 }}>
            <StatBox label="Total Processed" value={stats?.total || 0} icon="📁" />
            <StatBox label="Queued Review" value={stats?.queued || 0} icon="⏳" highlight="#3b82f6" />
            <StatBox label="Applied" value={stats?.applied || 0} icon="✅" highlight="#10b981" />
            <StatBox label="Interviews/Responses" value={(stats?.response_received || 0) + (stats?.interview || 0)} icon="🎉" highlight="#8b5cf6" />
            <StatBox label="Avg Match Score" value={stats?.avg_match_score ? `${Math.round(stats.avg_match_score)}%` : '—'} icon="🎯" />
          </div>

          {/* ── 3 Neumorphic Cards Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 32 }}>
            
            {/* Card 1: Multi-Resume Manager */}
            <div className="neu-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>📄 Multi-Role Resumes</h3>
                <span className="neu-badge neu-badge-info">{resumes.length} Uploaded</span>
              </div>

              {/* Resume List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, maxHeight: 180, overflowY: 'auto' }}>
                {resumes.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
                    No resumes uploaded yet. Upload your first resume below!
                  </div>
                ) : (
                  resumes.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: r.is_active ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-neu-base)',
                        border: r.is_active ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: r.is_active ? 'var(--text-accent)' : 'var(--text-primary)' }}>
                          {r.role_label} {r.is_active && '⭐ (Active)'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.filename}</div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        {!r.is_active && (
                          <button onClick={() => handleActivateResume(r.id)} className="neu-button" style={{ padding: '4px 8px', fontSize: 11 }}>
                            Select
                          </button>
                        )}
                        <button onClick={() => handleDeleteResume(r.id)} className="neu-button" style={{ padding: '4px 8px', fontSize: 11, color: '#ef4444' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Upload Form */}
              <form onSubmit={handleResumeUpload} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Target Role (e.g. Fullstack Engineer)"
                  value={newRoleLabel}
                  onChange={(e) => setNewRoleLabel(e.target.value)}
                  className="neu-input"
                  required
                />
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0' }}
                  required
                />
                <button type="submit" disabled={uploading} className="neu-button neu-button-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {uploading ? 'Parsing Resume...' : '➕ Upload Resume for Role'}
                </button>
              </form>
            </div>

            {/* Card 2: Search Filters & Application Limit */}
            <div className="neu-card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🎯 Domain & Application Limits</h3>

              <form onSubmit={handleSaveFilter} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Role Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="neu-input"
                    placeholder="e.g. software engineer, react, python"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Industry Domain / Sector
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="neu-input"
                    placeholder="e.g. Fintech, SaaS, AI/ML"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Max Target Applications (Type exact number or click preset)
                  </label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={targetCount}
                      onChange={(e) => setTargetCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="neu-input"
                      placeholder="e.g. 100, 150, 250"
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>openings</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[10, 50, 100, 150, 200, 300].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTargetCount(num)}
                        className={`neu-pill ${targetCount === num ? 'selected' : ''}`}
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={savingFilter} className="neu-button" style={{ marginTop: 6, justifyContent: 'center' }}>
                  {savingFilter ? 'Saving...' : '💾 Save Target Filters'}
                </button>
              </form>
            </div>

            {/* Card 3: Schedule & Automation Duration */}
            <div className="neu-card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⏰ Schedule & Duration Timers</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Daily Automated Schedule Window
                  </label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="time"
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      className="neu-input"
                    />
                    <span style={{ color: 'var(--text-muted)' }}>to</span>
                    <input
                      type="time"
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      className="neu-input"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Continuous Run Duration (Type Hours or Slider)
                  </label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={continuousHours}
                      onChange={(e) => setContinuousHours(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="neu-input"
                      placeholder="e.g. 12, 24"
                      style={{ width: 100 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Hours</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="48"
                    value={continuousHours || 12}
                    onChange={(e) => setContinuousHours(parseInt(e.target.value))}
                    className="neu-range"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>1 Hr</span>
                    <span>12 Hrs</span>
                    <span>24 Hrs</span>
                    <span>48 Hrs</span>
                  </div>
                </div>

                <div className="neu-inset" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>🟢 Automated Cloud Processing: </span>
                  Automated tailoring runs in the background. Applications & PDFs automatically expire after 15 days to keep cloud storage clean.
                </div>
              </div>
            </div>

          </div>

          {/* ── Applications Feed & Queue ── */}
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>📋 Tailored Applications Feed</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                  Review matched roles, tailored resumes, and cover letters
                </p>
              </div>

              <span className="neu-badge neu-badge-info">{applications.length} Matched Roles</span>
            </div>

            {applications.length === 0 ? (
              <div style={{ textAlignment: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                No job applications generated yet. Click <strong>"Run Pipeline Now"</strong> above to source and tailor applications!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="neu-inset"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}
                  >
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {app.job.title}
                        </span>
                        <span className="neu-badge neu-badge-active">
                          🎯 {Math.round(app.match_score)}% Match
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        🏢 <strong>{app.job.company}</strong> • 📍 {app.job.location || 'Remote'} • 🌐 Source: {app.job.source}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Status Selector */}
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className="neu-select"
                        style={{ width: 130, padding: '6px 12px', fontSize: 12 }}
                      >
                        <option value="queued">Queued</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="applied">Applied</option>
                        <option value="interview">Interview</option>
                        <option value="rejected">Rejected</option>
                      </select>

                      {/* Downloads */}
                      <a
                        href={getResumePdfUrl(app.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="neu-button"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        📄 Resume PDF
                      </a>
                      <a
                        href={getCoverLetterPdfUrl(app.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="neu-button"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        ✉️ Cover Letter
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AuthLayout>
  );
}

function StatBox({ label, value, icon, highlight }) {
  return (
    <div className="neu-card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: highlight || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
