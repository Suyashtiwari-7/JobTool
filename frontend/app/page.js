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
  updateResume,
  deleteResume,
  getSpecificResumeUrl,
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
  const [theme, setTheme] = useState('light');

  // Filter Mode Switcher state: 'limits' | 'schedule'
  const [filterMode, setFilterMode] = useState('limits');

  // Resume Editing State (Pen Button)
  const [editingResume, setEditingResume] = useState(null);
  const [editForm, setEditForm] = useState({
    role_label: '',
    name: '',
    email: '',
    phone: '',
    location: '',
  });

  // Form states
  const [personalName, setPersonalName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [personalLocation, setPersonalLocation] = useState('');
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

  // Handle Resume Upload with Personal Info
  async function handleResumeUpload(e) {
    e.preventDefault();
    if (!selectedFile) return alert('Please select a PDF or DOCX file.');
    setUploading(true);
    try {
      await uploadResume(selectedFile, {
        name: personalName,
        email: personalEmail,
        phone: personalPhone,
        location: personalLocation,
        role_label: personalName ? `${personalName}'s Resume` : 'Main Resume',
      });
      setSelectedFile(null);
      setPersonalName('');
      setPersonalEmail('');
      setPersonalPhone('');
      setPersonalLocation('');
      alert('✅ Uploaded resume and personal info successfully!');
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

  // Open Edit Pen Modal for Resume
  function handleOpenEditModal(resume) {
    setEditingResume(resume);
    const parsed = resume.parsed_json || {};
    setEditForm({
      role_label: resume.role_label || 'Main Resume',
      name: parsed.name || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
    });
  }

  // Save Edit Resume Details
  async function handleSaveEditResume(e) {
    e.preventDefault();
    if (!editingResume) return;
    try {
      await updateResume(editingResume.id, editForm);
      alert('✅ Resume details updated!');
      setEditingResume(null);
      const updatedList = await listResumes();
      setResumes(updatedList);
    } catch (err) {
      alert('Update failed: ' + err.message);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src="/logo.png" alt="JobTool Logo" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', boxShadow: 'var(--neu-flat)' }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              ⚡ Status: Cloud Engine
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              Auto-Sourcing: {running ? <span style={{ color: 'var(--accent-green)' }}>Active</span> : 'Standby'}
            </p>
          </div>
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

          <div 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="neu-inset" 
            style={{ width: 120, height: 46, borderRadius: 30, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 4px', border: '1px solid var(--border-subtle)' }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 14px', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)' }}>
              <span>ON</span>
              <span>OFF</span>
            </div>
            <div style={{
              width: 56, height: 38, borderRadius: 24, background: 'var(--bg-card)', 
              boxShadow: 'var(--neu-flat)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 12,
              position: 'absolute',
              transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
              transform: theme === 'light' ? 'translateX(0px)' : 'translateX(56px)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)'
            }}>
              {theme === 'light' ? '☀️' : '🌙'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div>Loading Neumorphic Control Panel...</div>
        </div>
      ) : (
        <>
          {/* ── Top Stats Bar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 24 }}>
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
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>📄 Uploaded Resumes</h3>
                <span className="neu-badge neu-badge-info">Resumes Uploaded: {resumes.length}</span>
              </div>

              {/* Resume List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, maxHeight: 220, overflowY: 'auto' }}>
                {resumes.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                    No resumes uploaded yet. Select your file below to upload!
                  </div>
                ) : (
                  resumes.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: r.is_active ? 'rgba(249, 115, 22, 0.12)' : 'var(--bg-neu-base)',
                        border: r.is_active ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: r.is_active ? 'var(--text-accent)' : 'var(--text-primary)' }}>
                          {r.role_label} {r.is_active && '⭐ (Active)'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.filename}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {/* ✏️ Pen Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(r)}
                          className="neu-button"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                          title="Edit details (Pen)"
                        >
                          ✏️
                        </button>

                        {/* 👁️ View/Download PDF Button */}
                        <a
                          href={getSpecificResumeUrl(r.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="neu-button"
                          style={{ padding: '6px 10px', fontSize: 12, textDecoration: 'none', color: 'var(--text-primary)' }}
                          title="View PDF file"
                        >
                          👁️
                        </a>

                        {/* ⭐ Select Active Button */}
                        {!r.is_active && (
                          <button
                            onClick={() => handleActivateResume(r.id)}
                            className="neu-button"
                            style={{ padding: '6px 10px', fontSize: 11 }}
                          >
                            Select
                          </button>
                        )}

                        {/* ✕ Delete Button */}
                        <button
                          onClick={() => handleDeleteResume(r.id)}
                          className="neu-button"
                          style={{ padding: '6px 10px', fontSize: 11, color: '#ef4444' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Upload Form */}
              <form onSubmit={handleResumeUpload} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  ➕ Upload New Resume & Personal Info
                </div>
                <input
                  type="text"
                  placeholder="Full Name (optional)"
                  value={personalName}
                  onChange={(e) => setPersonalName(e.target.value)}
                  className="neu-input"
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    className="neu-input"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    className="neu-input"
                    style={{ flex: 1 }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="City / Location"
                  value={personalLocation}
                  onChange={(e) => setPersonalLocation(e.target.value)}
                  className="neu-input"
                />
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0' }}
                  required
                />
                <button type="submit" disabled={uploading} className="neu-button neu-button-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {uploading ? 'Processing File...' : '➕ Upload Resume'}
                </button>
              </form>
            </div>

            {/* Card 2: Filter Mode Switcher (Domain Limits OR Schedule Timers) */}
            <div className="neu-card">
              {/* Tab Mode Selector */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => setFilterMode('limits')}
                  className={`neu-button ${filterMode === 'limits' ? 'neu-button-primary' : ''}`}
                  style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 700, justifyContent: 'center' }}
                >
                  🎯 Domain & Limits
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('schedule')}
                  className={`neu-button ${filterMode === 'schedule' ? 'neu-button-primary' : ''}`}
                  style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 700, justifyContent: 'center' }}
                >
                  ⏰ Schedule & Timers
                </button>
              </div>

              <form onSubmit={handleSaveFilter} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filterMode === 'limits' ? (
                  <>
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
                        Max Target Applications
                      </label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={targetCount}
                          onChange={(e) => setTargetCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="neu-input"
                          placeholder="e.g. 50, 100"
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>openings</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                        Continuous Run Duration (Hours)
                      </label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max="72"
                          value={continuousHours}
                          onChange={(e) => setContinuousHours(e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="neu-input"
                          placeholder="e.g. 12"
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>hours</span>
                      </div>
                    </div>
                  </>
                )}

                <button type="submit" disabled={savingFilter} className="neu-button" style={{ marginTop: 10, justifyContent: 'center' }}>
                  {savingFilter ? 'Saving Filters...' : '💾 Save Target Filters'}
                </button>
              </form>
            </div>

          </div>

          {/* ── BIG CENTERED RUN BUTTON ── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <button
              onClick={handleRunPipeline}
              disabled={running}
              className={`neu-button ${running ? '' : 'neu-button-primary'} ${running ? 'pulse-active' : ''}`}
              style={{
                padding: '20px 60px',
                fontSize: 22,
                fontWeight: 800,
                borderRadius: 50,
                boxShadow: running ? 'none' : '0 12px 30px rgba(249, 115, 22, 0.4)',
                minWidth: '350px',
                justifyContent: 'center'
              }}
            >
              {running ? '⚡ PIPELINE IS RUNNING...' : '▶️ RUN'}
            </button>
          </div>

          {/* ── Applications Feed & Queue (Tabular View) ── */}
          <div className="neu-card" style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>📋 Tailored Applications Feed</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                  Review matched roles, tailored resumes, and cover letters in tabular format
                </p>
              </div>

              <span className="neu-badge neu-badge-info">{applications.length} Matched Roles</span>
            </div>

            {applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                No job applications generated yet. Click <strong>"▶️ RUN"</strong> above to source and tailor applications!
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Company & Role</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Resume Uploaded / Used</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Time & Date</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px' }}>Actions & PDFs</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const appDate = app.created_at ? new Date(app.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently';
                    const activeRes = resumes.find((r) => r.is_active) || resumes[0];
                    const resumeUsed = activeRes ? `${activeRes.role_label} (${activeRes.filename})` : 'Main Resume';

                    return (
                      <tr key={app.id} className="neu-inset" style={{ borderRadius: 12 }}>
                        <td style={{ padding: '12px 14px', borderRadius: '12px 0 0 12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                            🏢 {app.job.company}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{app.job.title}</span>
                            <span className="neu-badge neu-badge-active" style={{ fontSize: 10, padding: '2px 6px' }}>
                              🎯 {Math.round(app.match_score)}%
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          📄 {resumeUsed}
                        </td>

                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                          ⏰ {appDate}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            className="neu-select"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                          >
                            <option value="queued">Queued</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="applied">Applied</option>
                            <option value="interview">Interview</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <a
                              href={getResumePdfUrl(app.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="neu-button"
                              style={{ padding: '6px 10px', fontSize: 11 }}
                              title="Download Tailored Resume"
                            >
                              📄 Resume PDF
                            </a>
                            <a
                              href={getCoverLetterPdfUrl(app.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="neu-button"
                              style={{ padding: '6px 10px', fontSize: 11 }}
                              title="Download Personal Cover Letter"
                            >
                              ✉️ Cover Letter
                            </a>
                            {app.job.url && (
                              <a
                                href={app.job.url}
                                target="_blank"
                                rel="noreferrer"
                                className="neu-button neu-button-primary"
                                style={{ padding: '6px 10px', fontSize: 11, textDecoration: 'none' }}
                                title="Apply on company website"
                              >
                                🌐 Apply
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Edit Resume Modal (Pen Tool) ── */}
          {editingResume && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 20,
              }}
            >
              <div
                className="neu-card"
                style={{
                  width: '100%',
                  maxWidth: 480,
                  padding: '32px 28px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>✏️ Edit Resume Details</h3>
                  <button
                    onClick={() => setEditingResume(null)}
                    className="neu-button"
                    style={{ padding: '4px 10px', fontSize: 13 }}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveEditResume} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Resume Label
                    </label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editForm.role_label}
                      onChange={(e) => setEditForm({ ...editForm, role_label: e.target.value })}
                      placeholder="e.g. Main Resume"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Candidate Name
                    </label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Full Name"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="neu-input"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="e.g. email@domain.com"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="e.g. +1 555-123-4567"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Location / Address
                    </label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="e.g. New York, NY / Remote"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button type="submit" className="neu-button neu-button-primary" style={{ flex: 1, justifyContent: 'center' }}>
                      💾 Save Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingResume(null)}
                      className="neu-button"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
