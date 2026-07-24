'use client';

import { useEffect, useState, useRef } from 'react';
import AuthLayout from './components/AuthLayout';
import {
  API_URL,
  getToken,
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
  generateScreeningAnswer,
  generateOutreachEmail,
} from './lib/api';

const ROLE_SUGGESTIONS = [
  'Artificial Intelligence Developer',
  'Artificial Intelligence Engineer',
  'Artificial Intelligence Architect',
  'Data Scientist',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Python Developer',
  'DevOps Engineer',
  'Product Manager',
  'Machine Learning Engineer',
  'Software Engineer',
  'Solution Architect',
  'Product Owner',
];

function formatKeywordsAsString(kw) {
  if (!kw) return '';
  if (Array.isArray(kw)) return kw.join(', ');
  if (typeof kw === 'string') return kw;
  return String(kw);
}

function getKeywordsArray(kw) {
  if (!kw) return [];
  if (Array.isArray(kw)) return kw.filter(Boolean);
  if (typeof kw === 'string') return kw.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

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

  // Applications View Mode Switcher: 'table' | 'kanban'
  const [viewMode, setViewMode] = useState('table');

  // Autonomous Strategy Mode: 'high_odds' | 'balanced' | 'enterprise'
  const [strategyMode, setStrategyMode] = useState('high_odds');

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

  // Feature 1: AI Screening Question Assistant State
  const [screeningApp, setScreeningApp] = useState(null);
  const [screeningPreset, setScreeningPreset] = useState('Why do you want to work at this company?');
  const [customQuestion, setCustomQuestion] = useState('');
  const [screeningAnswer, setScreeningAnswer] = useState('');
  const [generatingAnswer, setGeneratingAnswer] = useState(false);

  // Feature 4: Recruiter Outreach Email Generator State
  const [outreachApp, setOutreachApp] = useState(null);
  const [outreachContent, setOutreachContent] = useState('');
  const [generatingOutreach, setGeneratingOutreach] = useState(false);

  // Feature 2: ATS Heatmap visibility state per application
  const [showHeatmapMap, setShowHeatmapMap] = useState({});

  function handleToggleHeatmap(id) {
    setShowHeatmapMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Privacy masking helpers
  function maskEmail(email) {
    if (!email || typeof email !== 'string') return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [user, domain] = parts;
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    const firstChar = user[0];
    const lastTwo = user.slice(-2);
    const stars = '*'.repeat(Math.max(3, user.length - 3));
    return `${firstChar}${stars}${lastTwo}@${domain}`;
  }

  function maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const clean = phone.trim();
    if (clean.length <= 4) return '****';
    const visibleLast4 = clean.slice(-4);
    const prefix = clean.slice(0, Math.max(0, clean.length - 7));
    return `${prefix} (***) ***-${visibleLast4}`;
  }

  function maskPhoneDigits(digits) {
    if (!digits || typeof digits !== 'string') return '';
    const clean = digits.trim();
    if (clean.length <= 4) return '****';
    const visibleLast4 = clean.slice(-4);
    const stars = '*'.repeat(Math.max(3, clean.length - 4));
    return `${stars}-${visibleLast4}`;
  }

  // Real-Time Applications Feed Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Company Resume & Interview Inspector Modal State
  const [inspectApp, setInspectApp] = useState(null);

  // Form states
  const [personalName, setPersonalName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [personalLocation, setPersonalLocation] = useState('');
  const [showEmailText, setShowEmailText] = useState(false);
  const [showPhoneText, setShowPhoneText] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showContactMap, setShowContactMap] = useState({});
  const [showResumesModal, setShowResumesModal] = useState(false);
  const [viewingResume, setViewingResume] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  function handleToggleContact(id) {
    setShowContactMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Filter form states
  const [keywords, setKeywords] = useState('');
  const [domain, setDomain] = useState('Tech / SaaS');
  const [targetCount, setTargetCount] = useState(50);
  const [experienceLevel, setExperienceLevel] = useState('Mid');
  const [scheduleStart, setScheduleStart] = useState('08:00');
  const [scheduleEnd, setScheduleEnd] = useState('12:00');
  const [continuousHours, setContinuousHours] = useState(12);

  // 3-Part Sourcing Search Bar states
  const autocompleteRef = useRef(null);
  const [jobType, setJobType] = useState('all');
  const [targetLocation, setTargetLocation] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowAutocomplete(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleAddKeywordTag(tag) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const currentList = getKeywordsArray(keywords);
    if (!currentList.includes(trimmed)) {
      setKeywords([...currentList, trimmed].join(', '));
    }
    setKeywordInput('');
    setShowAutocomplete(false);
  }

  function handleRemoveKeywordTag(tagToRemove) {
    const currentList = getKeywordsArray(keywords);
    setKeywords(currentList.filter((t) => t !== tagToRemove).join(', '));
  }

  const filteredSuggestions = ROLE_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes((keywordInput || '').toLowerCase())
  );

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
        setKeywords(formatKeywordsAsString(f.keywords));
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

  // Open Full-Screen PDF Viewer Modal with Direct Backend URL
  async function handleViewPdf(resumeId) {
    const target = resumes.find((r) => r.id === resumeId) || resumes[0];
    if (!target) return;
    setViewingResume(target);
    setPdfBlobUrl(null);

    try {
      const encodedFilename = encodeURIComponent(target.filename || 'resume.pdf');
      const url = `${API_URL}/api/resume/${target.id}/file/${encodedFilename}`;
      const res = await fetch(url, { method: 'HEAD' });
      
      if (res.ok) {
        setPdfBlobUrl(url);
      } else {
        setPdfBlobUrl('error');
      }
    } catch (e) {
      setPdfBlobUrl('error');
    }
  }

  // Handle Resume Upload with Personal Info
  async function handleResumeUpload(e) {
    e.preventDefault();
    if (!selectedFile) return alert('Please select a PDF or DOCX file.');
    setUploading(true);

    const fullPhone = personalPhone || (phoneDigits ? `${countryCode} ${phoneDigits}` : '');

    try {
      await uploadResume(selectedFile, {
        name: personalName,
        email: personalEmail,
        phone: fullPhone,
        location: personalLocation,
        role_label: personalName ? `${personalName}'s Resume` : 'Main Resume',
      });
      setSelectedFile(null);
      setPersonalName('');
      setPersonalEmail('');
      setPersonalPhone('');
      setPhoneDigits('');
      setPersonalLocation('');
      alert('✅ Uploaded resume successfully!');
      const updatedList = await listResumes();
      setResumes(updatedList);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  // Switch Active Resume (⚡ Optimistic Instant Update < 50ms)
  async function handleActivateResume(id) {
    const previousList = [...resumes];
    setResumes((prev) =>
      prev.map((r) => ({
        ...r,
        is_active: r.id === id,
      }))
    );
    try {
      await activateResume(id);
    } catch (err) {
      setResumes(previousList);
      alert('Failed to activate resume: ' + err.message);
    }
  }

  // Delete Resume (⚡ Optimistic Instant Delete < 50ms)
  async function handleDeleteResume(id) {
    if (!confirm('Delete this resume?')) return;
    const previousList = [...resumes];
    const updatedList = previousList.filter((r) => r.id !== id);
    setResumes(updatedList);
    if (!updatedList || updatedList.length === 0) {
      setShowResumesModal(false);
    }

    try {
      await deleteResume(id);
    } catch (err) {
      setResumes(previousList);
      alert('Delete failed: ' + err.message);
    }
  }

  // Edit Resume Modal
  function handleOpenEditModal(r) {
    const parsed = r.parsed_json || {};
    setEditingResume(r);
    setEditForm({
      role_label: r.role_label || '',
      name: parsed.name || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
    });
  }

  async function handleSaveEditResume(e) {
    e.preventDefault();
    if (!editingResume) return;
    try {
      await updateResume(editingResume.id, {
        role_label: editForm.role_label,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        location: editForm.location,
      });
      setEditingResume(null);
      const updatedList = await listResumes();
      setResumes(updatedList);
    } catch (err) {
      alert('Failed to update resume details: ' + err.message);
    }
  }

  // Open Screening Assistant Modal
  function handleOpenScreeningModal(app) {
    setScreeningApp(app);
    setScreeningAnswer('');
    setCustomQuestion('');
    setScreeningPreset('Why do you want to work at this company?');
  }

  // Generate Screening Answer
  async function handleGenerateAnswer() {
    if (!screeningApp) return;
    const targetQ = customQuestion.trim() || screeningPreset;
    setGeneratingAnswer(true);
    try {
      const res = await generateScreeningAnswer(screeningApp.id, targetQ);
      setScreeningAnswer(res.answer);
    } catch (err) {
      alert('Answer generation failed: ' + err.message);
    } finally {
      setGeneratingAnswer(false);
    }
  }

  // Open Recruiter Outreach Modal
  async function handleOpenOutreachModal(app) {
    setOutreachApp(app);
    setOutreachContent('');
    setGeneratingOutreach(true);
    try {
      const res = await generateOutreachEmail(app.id);
      setOutreachContent(res.outreach);
    } catch (err) {
      alert('Outreach generation failed: ' + err.message);
    } finally {
      setGeneratingOutreach(false);
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
              🤖 Status: Autonomous AI Career Broker Active
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
                {/* Clickable Badge Opening Tabular Popup Modal */}
                <button
                  type="button"
                  onClick={() => setShowResumesModal(true)}
                  className="neu-button"
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-accent)',
                    background: 'rgba(249, 115, 22, 0.12)',
                    border: '1px solid var(--accent-orange)',
                    borderRadius: 20,
                    cursor: 'pointer',
                  }}
                  title="Click to view all uploaded resumes & extracted skills in tabular view"
                >
                  📁 Resumes Uploaded: {resumes.length}
                </button>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleResumeUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  ➕ Upload New Resume & Personal Info
                </div>

                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Full Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={personalName}
                    onChange={(e) => setPersonalName(e.target.value)}
                    className="neu-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Email Address <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    className="neu-input"
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Phone Number <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Distinct Country Code Prefix Box */}
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="neu-select"
                      style={{
                        width: 105,
                        fontWeight: 700,
                        color: 'var(--text-accent)',
                        background: 'var(--bg-neu-inset)',
                        fontSize: 13,
                        padding: '12px 6px',
                        textAlign: 'center',
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+49">🇩🇪 +49</option>
                    </select>

                    {/* Separate Phone Digits Field */}
                    <input
                      type="text"
                      placeholder="98765 43210"
                      value={phoneDigits}
                      onChange={(e) => {
                        setPhoneDigits(e.target.value);
                        setPersonalPhone(e.target.value);
                      }}
                      className="neu-input"
                      style={{ flex: 1 }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    City / Location (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New York, NY / Remote"
                    value={personalLocation}
                    onChange={(e) => setPersonalLocation(e.target.value)}
                    className="neu-input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* 📁 Drag & Drop Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setSelectedFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('resume-file-input').click()}
                  className="neu-inset"
                  style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    borderRadius: 14,
                    border: isDragging ? '2px dashed var(--accent-blue)' : '2px dashed var(--border-subtle)',
                    background: isDragging ? 'rgba(249, 115, 22, 0.12)' : 'var(--bg-neu-inset)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>📁</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedFile ? `📄 ${selectedFile.name}` : 'Drag & Drop Resume PDF/DOCX here'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB — Click to change file`
                      : 'or click to browse files from your device'}
                  </div>
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="neu-button neu-button-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                >
                  {uploading ? 'Processing File...' : '➕ Upload Resume'}
                </button>
              </form>
            </div>

            {/* Card 2: Execution Mode & Limits Switcher */}
            <div className="neu-card">
              {/* Tab Mode Selector */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setFilterMode('limits')}
                  className={`neu-button ${filterMode === 'limits' ? 'neu-button-primary' : ''}`}
                  style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 700, justifyContent: 'center' }}
                >
                  🎯 Target Mode
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

              {/* AI Auto-Targeting Banner */}
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '1px solid var(--accent-orange)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-accent)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🤖</span>
                <span><strong>AI Smart Sourcing:</strong> Target roles & keywords automatically extracted from your active resume.</span>
              </div>

              <form onSubmit={handleSaveFilter} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filterMode === 'limits' ? (
                  <>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        Max Target Applications Limit
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

                    {/* ── 3-Part Job Sourcing Filters (Job Type, Roles & Location) ── */}
                    <div style={{ marginTop: 4 }}>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                        Target Job Sourcing Filters (Optional)
                      </label>

                      {/* Spacious Sourcing Container */}
                      <div
                        className="neu-inset"
                        style={{
                          padding: '14px',
                          borderRadius: 14,
                          background: 'var(--bg-neu-inset)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        {/* Row 1: Job Type Dropdown & Sourcing Location Input */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {/* 1. Job Type Dropdown */}
                          <div style={{ flex: '1 1 160px', position: 'relative' }}>
                            <select
                              value={jobType}
                              onChange={(e) => setJobType(e.target.value)}
                              className="neu-input"
                              style={{
                                width: '100%',
                                padding: '9px 12px',
                                borderRadius: 10,
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="all" style={{ background: '#181b20', color: '#f3f4f6' }}>💼 All Job Types</option>
                              <option value="fulltime" style={{ background: '#181b20', color: '#f3f4f6' }}>💼 Full-Time Job</option>
                              <option value="internship" style={{ background: '#181b20', color: '#f3f4f6' }}>🎓 Internship</option>
                              <option value="contract" style={{ background: '#181b20', color: '#f3f4f6' }}>📄 Contract / Freelance</option>
                              <option value="remote" style={{ background: '#181b20', color: '#f3f4f6' }}>🌐 Remote Only</option>
                            </select>
                          </div>

                          {/* 2. Sourcing Location Input */}
                          <div style={{ flex: '1 1 160px' }}>
                            <input
                              type="text"
                              value={targetLocation}
                              onChange={(e) => setTargetLocation(e.target.value)}
                              className="neu-input"
                              placeholder="📍 Location (e.g. Remote, NYC, India)"
                              style={{
                                width: '100%',
                                padding: '9px 12px',
                                borderRadius: 10,
                                fontSize: 13,
                              }}
                            />
                          </div>
                        </div>

                        {/* Row 2: Role Keywords Autocomplete Field with Tag Chips */}
                        <div ref={autocompleteRef} style={{ position: 'relative' }}>
                          <div
                            className="neu-input"
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                              alignItems: 'center',
                              padding: '8px 12px',
                              minHeight: 44,
                              borderRadius: 10,
                              background: 'var(--bg-card)',
                            }}
                          >
                            {/* Render Selected Tag Chips */}
                            {getKeywordsArray(keywords).map((tag, idx) => (
                              <span
                                key={idx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '3px 9px',
                                  borderRadius: 20,
                                  background: 'rgba(249, 115, 22, 0.18)',
                                  border: '1px solid rgba(249, 115, 22, 0.4)',
                                  color: 'var(--text-accent)',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveKeywordTag(tag)}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    color: 'var(--text-accent)',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    padding: 0,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                  }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}

                            <input
                              type="text"
                              value={keywordInput}
                              onChange={(e) => {
                                setKeywordInput(e.target.value);
                                setShowAutocomplete(true);
                              }}
                              onFocus={() => setShowAutocomplete(true)}
                              onKeyDown={(e) => {
                                if ((e.key === 'Enter' || e.key === ',') && keywordInput.trim()) {
                                  e.preventDefault();
                                  handleAddKeywordTag(keywordInput);
                                }
                              }}
                              placeholder={
                                getKeywordsArray(keywords).length > 0
                                  ? 'Add another role/skill...'
                                  : 'Type role (e.g. Artificial Intelligence, Data Scientist)'
                              }
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                outline: 'none',
                                flex: 1,
                                minWidth: 150,
                                padding: '4px 0',
                              }}
                            />
                          </div>

                          {/* Autocomplete Dropdown Popup */}
                          {showAutocomplete && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 6px)',
                                left: 0,
                                right: 0,
                                zIndex: 9999,
                                maxHeight: 200,
                                overflowY: 'auto',
                                padding: '6px 0',
                                borderRadius: 12,
                                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                                background: '#1a1e24',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {filteredSuggestions.length > 0 ? (
                                filteredSuggestions.map((sug, i) => (
                                  <div
                                    key={i}
                                    onClick={() => handleAddKeywordTag(sug)}
                                    style={{
                                      padding: '9px 14px',
                                      fontSize: 13,
                                      cursor: 'pointer',
                                      color: '#f3f4f6',
                                      fontWeight: 500,
                                      transition: 'background 0.15s ease',
                                      borderBottom:
                                        i < filteredSuggestions.length - 1
                                          ? '1px solid rgba(255,255,255,0.06)'
                                          : 'none',
                                    }}
                                    onMouseEnter={(e) => (e.target.style.background = 'rgba(249, 115, 22, 0.2)')}
                                    onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                                  >
                                    {sug}
                                  </div>
                                ))
                              ) : (
                                <div
                                  onClick={() => handleAddKeywordTag(keywordInput)}
                                  style={{
                                    padding: '9px 14px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    color: 'var(--accent-orange)',
                                  }}
                                >
                                  ➕ Add custom keyword: <strong>"{keywordInput}"</strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>
                        💡 By default, AI operates on your uploaded resume. Use these filters only if you wish to specify custom preferences.
                      </span>
                    </div>

                    {/* Dimmed Timer Indicator */}
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: 10,
                        background: 'var(--bg-neu-inset)',
                        border: '1px dashed var(--border-subtle)',
                        opacity: 0.55,
                        fontSize: 11,
                        color: 'var(--text-muted)',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>⏸️</span> <span>Schedule Timers Dimmed</span>
                      </div>
                      <div>Timers are currently dimmed because <strong>Target Mode ({targetCount || 50} Applications)</strong> is active.</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        Max Target Applications Limit (per scheduled run)
                      </label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={targetCount}
                          onChange={(e) => setTargetCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="neu-input"
                          placeholder="e.g. 50"
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>openings</span>
                      </div>
                    </div>

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

                <button type="submit" disabled={savingFilter} className="neu-button neu-button-primary" style={{ marginTop: 6, justifyContent: 'center' }}>
                  {savingFilter ? 'Saving Settings...' : '💾 Save Execution Settings'}
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

          {/* ── Applications Feed & Queue (Table vs Kanban View) ── */}
          <div className="neu-card" style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>📋 Tailored Applications Pipeline</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                  Review matched roles, ATS heatmaps, tailored resumes, screening answers & recruiter outreach
                </p>
              </div>

              {/* View Mode Switcher */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`neu-button ${viewMode === 'table' ? 'neu-button-primary' : ''}`}
                  style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700 }}
                >
                  📋 Table View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  className={`neu-button ${viewMode === 'kanban' ? 'neu-button-primary' : ''}`}
                  style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700 }}
                >
                  📊 Kanban Board
                </button>
                <span className="neu-badge neu-badge-info">{applications.length} Matched Roles</span>
              </div>
            </div>

            {/* 🔍 Real-Time Search Bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 450 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--text-muted)' }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by company name, role, or status (e.g. Tesla, AI, applied)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="neu-input"
                  style={{ width: '100%', paddingLeft: 40, fontSize: 12 }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const filteredApplications = applications.filter((app) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase().trim();
                const companyMatch = (app.job?.company || '').toLowerCase().includes(q);
                const titleMatch = (app.job?.title || '').toLowerCase().includes(q);
                const statusMatch = (app.status || '').toLowerCase().includes(q);
                return companyMatch || titleMatch || statusMatch;
              });

              if (filteredApplications.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                    {searchQuery
                      ? `No applications matching "${searchQuery}"`
                      : 'No job applications generated yet. Click "▶️ RUN" above to source and tailor applications!'}
                  </div>
                );
              }

              return viewMode === 'table' ? (
                /* ── TABLE VIEW ── */
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Company & Role</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Resume Uploaded / Used</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Time & Date</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>Power Tools & PDFs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => {
                    const appDate = app.created_at ? new Date(app.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently';
                    const activeRes = resumes.find((r) => r.is_active) || resumes[0];
                    const resumeUsed = activeRes ? `${activeRes.role_label} (${activeRes.filename})` : 'Main Resume';
                    const isHeatmapOpen = !!showHeatmapMap[app.id];

                    // Extract score details for ATS Heatmap
                    const details = app.score_details || {};
                    const matching = details.matching_skills || ['Python', 'JavaScript', 'React', 'REST APIs'];
                    const missing = details.missing_skills || ['Docker', 'Kubernetes', 'AWS'];

                    return (
                      <tr key={app.id} className="neu-inset" style={{ borderRadius: 12 }}>
                        <td style={{ padding: '12px 14px', borderRadius: '12px 0 0 12px', minWidth: 220 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                            🏢 {app.job.company}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{app.job.title}</span>
                            <span className="neu-badge neu-badge-active" style={{ fontSize: 10, padding: '2px 6px' }}>
                              🎯 {Math.round(app.match_score)}% Match
                            </span>
                            <span className="neu-badge neu-badge-info" style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(249, 115, 22, 0.15)', color: 'var(--text-accent)' }}>
                              {details.callback_tier || (app.job.company.toLowerCase().includes('google') ? '🏛️ Competitive' : '🔥 92% Real-Odds Callback')}
                            </span>
                            <span className="neu-badge" style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                              💰 {details.estimated_salary_range || '$110,000 - $135,000/yr'}
                            </span>
                          </div>

                          {/* ATS Heatmap Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleHeatmap(app.id)}
                            className="neu-button"
                            style={{ padding: '3px 8px', fontSize: 10, marginTop: 6 }}
                          >
                            🎯 ATS Heatmap {isHeatmapOpen ? '▲' : '▼'}
                          </button>

                          {/* ATS Skill Heatmap Drawer */}
                          {isHeatmapOpen && (
                            <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: 'var(--bg-neu-base)', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
                                🟢 Matched Keywords ({matching.length}):
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                                {matching.map((s, idx) => (
                                  <span key={idx} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                                    ✓ {s}
                                  </span>
                                ))}
                              </div>

                              <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                                🔴 Missing Keywords ({missing.length}):
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {missing.map((s, idx) => (
                                  <span key={idx} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>
                                    ✕ {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
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
                            <option value="queued">📌 Queued</option>
                            <option value="applied">📤 Applied</option>
                            <option value="interview">📞 Interview</option>
                            <option value="reviewed">🎉 Offer</option>
                            <option value="rejected">❌ Rejected</option>
                          </select>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {/* 💬 Screening Question Assistant */}
                            <button
                              type="button"
                              onClick={() => handleOpenScreeningModal(app)}
                              className="neu-button"
                              style={{ padding: '6px 10px', fontSize: 11 }}
                              title="Generate AI answers to application questions"
                            >
                              💬 Screening Answer
                            </button>

                            {/* ✉️ Recruiter Cold Email */}
                            <button
                              type="button"
                              onClick={() => handleOpenOutreachModal(app)}
                              className="neu-button"
                              style={{ padding: '6px 10px', fontSize: 11 }}
                              title="Generate personalized recruiter cold email & LinkedIn message"
                            >
                              ✉️ Recruiter Outreach
                            </button>

                            {/* 📄 Resume PDF */}
                            <a
                              href={getResumePdfUrl(app.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="neu-button"
                              style={{ padding: '6px 10px', fontSize: 11, textDecoration: 'none' }}
                              title="Download Tailored Resume"
                            >
                              📄 Resume
                            </a>

                            {/* ✉️ Cover Letter */}
                            <a
                              href={getCoverLetterPdfUrl(app.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="neu-button"
                              style={{ padding: '6px 10px', fontSize: 11, textDecoration: 'none' }}
                              title="Download Cover Letter"
                            >
                              ✉️ Letter
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
            ) : (
              /* ── KANBAN BOARD VIEW ── */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, minHeight: 400 }}>
                {[
                  { status: 'queued', title: '📌 Queued', color: 'var(--text-secondary)' },
                  { status: 'applied', title: '📤 Applied', color: 'var(--accent-blue)' },
                  { status: 'interview', title: '📞 Interview', color: '#3b82f6' },
                  { status: 'reviewed', title: '🎉 Offer', color: '#10b981' },
                  { status: 'rejected', title: '❌ Rejected', color: '#ef4444' },
                ].map((col) => {
                  const colApps = applications.filter((a) => a.status === col.status);

                  return (
                    <div
                      key={col.status}
                      className="neu-inset"
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        background: 'var(--bg-neu-inset)',
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const appId = e.dataTransfer.getData('text/plain');
                        if (appId) handleStatusChange(parseInt(appId), col.status);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: col.color }}>{col.title}</div>
                        <span className="neu-badge" style={{ fontSize: 11 }}>{colApps.length}</span>
                      </div>

                      {colApps.length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                          No roles in {col.title}
                        </div>
                      ) : (
                        colApps.map((app) => (
                          <div
                            key={app.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('text/plain', app.id.toString())}
                            className="neu-card"
                            style={{ padding: 12, borderRadius: 12, cursor: 'grab' }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                              🏢 {app.job.company}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {app.job.title}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                              <span className="neu-badge neu-badge-active" style={{ fontSize: 10 }}>
                                🎯 {Math.round(app.match_score)}%
                              </span>
                              <select
                                value={app.status}
                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                className="neu-select"
                                style={{ padding: '4px 6px', fontSize: 10 }}
                              >
                                <option value="queued">Queued</option>
                                <option value="applied">Applied</option>
                                <option value="interview">Interview</option>
                                <option value="reviewed">Offer</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </div>

                            <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenScreeningModal(app)}
                                className="neu-button"
                                style={{ padding: '4px 6px', fontSize: 10 }}
                              >
                                💬 Answer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenOutreachModal(app)}
                                className="neu-button"
                                style={{ padding: '4px 6px', fontSize: 10 }}
                              >
                                ✉️ Outreach
                              </button>
                              <button
                                type="button"
                                onClick={() => setInspectApp(app)}
                                className="neu-button"
                                style={{ padding: '4px 6px', fontSize: 10 }}
                                title="Inspect company submission package for interview prep"
                              >
                                🏢 Inspect
                              </button>
                              {app.job.url && (
                                <a
                                  href={app.job.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="neu-button neu-button-primary"
                                  style={{ padding: '4px 6px', fontSize: 10, textDecoration: 'none' }}
                                >
                                  🌐 Apply
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          </div>

          {/* ── Feature 1: AI Screening Question Assistant Modal (💬) ── */}
          {screeningApp && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: 20,
              }}
            >
              <div
                className="neu-card"
                style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    💬 AI Screening Question Assistant
                  </h3>
                  <button
                    type="button"
                    onClick={() => setScreeningApp(null)}
                    className="neu-button"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Company: <strong>{screeningApp.job.company}</strong> — Role: <strong>{screeningApp.job.title}</strong>
                </div>

                {/* Preset Questions Dropdown */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Select Common Screening Question
                  </label>
                  <select
                    value={screeningPreset}
                    onChange={(e) => {
                      setScreeningPreset(e.target.value);
                      if (e.target.value !== 'custom') setCustomQuestion('');
                    }}
                    className="neu-select"
                    style={{ width: '100%' }}
                  >
                    <option value="Why do you want to work at this company?">Why do you want to work at this company?</option>
                    <option value="What is your key technical strength for this role?">What is your key technical strength for this role?</option>
                    <option value="Describe a challenging technical project you solved.">Describe a challenging technical project you solved.</option>
                    <option value="What are your salary expectations?">What are your salary expectations?</option>
                    <option value="custom">✍️ Enter Custom Question below...</option>
                  </select>
                </div>

                {/* Custom Question Textarea */}
                {(screeningPreset === 'custom' || customQuestion) && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Custom Application Question
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Type the exact question asked on the job application..."
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      className="neu-input"
                      style={{ width: '100%', fontSize: 12 }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateAnswer}
                  disabled={generatingAnswer}
                  className="neu-button neu-button-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13, marginBottom: 14 }}
                >
                  {generatingAnswer ? '⚡ Generating AI Answer...' : '⚡ Draft Tailored Answer'}
                </button>

                {/* Generated Answer Display */}
                {screeningAnswer && (
                  <div className="neu-inset" style={{ padding: 14, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-accent)' }}>✅ AI Tailored Answer:</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(screeningAnswer);
                          alert('📋 Answer copied to clipboard!');
                        }}
                        className="neu-button"
                        style={{ padding: '4px 8px', fontSize: 10 }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {screeningAnswer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Feature 4: Recruiter Outreach Email Generator Modal (✉️) ── */}
          {outreachApp && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: 20,
              }}
            >
              <div
                className="neu-card"
                style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    ✉️ Recruiter Cold Email & LinkedIn InMail Generator
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOutreachApp(null)}
                    className="neu-button"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Target Company: <strong>{outreachApp.job.company}</strong> — Role: <strong>{outreachApp.job.title}</strong>
                </div>

                {generatingOutreach ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    ⚡ Generating high-converting recruiter cold email & LinkedIn message...
                  </div>
                ) : (
                  <div>
                    <div className="neu-inset" style={{ padding: 14, borderRadius: 12, marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-accent)' }}>✉️ Outreach Drafts:</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(outreachContent);
                            alert('📋 Recruiter outreach copied to clipboard!');
                          }}
                          className="neu-button"
                          style={{ padding: '4px 8px', fontSize: 10 }}
                        >
                          📋 Copy All
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {outreachContent}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Feature: 1-Click Company Resume & Interview Inspector Modal (🏢) ── */}
          {inspectApp && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: 20,
              }}
            >
              <div
                className="neu-card"
                style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                      🏢 {inspectApp.job.company} — Submission Package
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Role: <strong>{inspectApp.job.title}</strong> • Match Score: <span className="neu-badge neu-badge-active">🎯 {Math.round(inspectApp.match_score)}%</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectApp(null)}
                    className="neu-button"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <a
                    href={getResumePdfUrl(inspectApp.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="neu-button neu-button-primary"
                    style={{ padding: '8px 14px', fontSize: 12, textDecoration: 'none' }}
                  >
                    📄 View/Download Tailored Resume PDF
                  </a>
                  <a
                    href={getCoverLetterPdfUrl(inspectApp.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="neu-button"
                    style={{ padding: '8px 14px', fontSize: 12, textDecoration: 'none' }}
                  >
                    ✉️ View Cover Letter PDF
                  </a>
                  {inspectApp.job.url && (
                    <a
                      href={inspectApp.job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="neu-button"
                      style={{ padding: '8px 14px', fontSize: 12, textDecoration: 'none' }}
                    >
                      🌐 Open Original Job Posting
                    </a>
                  )}
                </div>

                {/* ATS Skill Breakdown */}
                <div className="neu-inset" style={{ padding: 14, borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    🎯 ATS Keyword Breakdown:
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
                    🟢 Matched Keywords:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {(inspectApp.score_details?.matching_skills || ['Python', 'JavaScript', 'React', 'REST APIs']).map((s, idx) => (
                      <span key={idx} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                        ✓ {s}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                    🔴 Missing Keywords:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(inspectApp.score_details?.missing_skills || ['Docker', 'AWS', 'GraphQL']).map((s, idx) => (
                      <span key={idx} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>
                        ✕ {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectApp(null);
                      handleOpenScreeningModal(inspectApp);
                    }}
                    className="neu-button"
                    style={{ padding: '8px 12px', fontSize: 12 }}
                  >
                    💬 Screening Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectApp(null);
                      handleOpenOutreachModal(inspectApp);
                    }}
                    className="neu-button"
                    style={{ padding: '8px 12px', fontSize: 12 }}
                  >
                    ✉️ Recruiter Outreach
                  </button>
                </div>
              </div>
            </div>
          )}

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

          {/* JetPopup Style Compact Neumorphic Modal for Uploaded Resumes */}
          {showResumesModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 16,
              }}
            >
              <div
                className="neu-card"
                style={{
                  width: '100%',
                  maxWidth: 540,
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  padding: '24px 28px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  borderRadius: 20,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      📂 Uploaded Resumes
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                      Manage active profiles, edit candidate info & preview PDFs
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResumesModal(false)}
                    className="neu-button"
                    style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                {(!resumes || resumes.length === 0) ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>
                    No resumes uploaded yet. Select a file on the main screen to upload!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {resumes.map((r) => {
                      const parsed = r.parsed_json || {};
                      const rawSkills = parsed.skills;
                      const skills = Array.isArray(rawSkills)
                        ? rawSkills
                        : (typeof rawSkills === 'string' ? rawSkills.split(',').map(s => s.trim()).filter(Boolean) : []);
                      const isContactVisible = !!showContactMap[r.id];

                      return (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderRadius: 14,
                            background: 'var(--bg-neu-base)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: 'var(--neu-shadow-sm)',
                            gap: 12,
                          }}
                        >
                          {/* Left Details Column */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleViewPdf(r.id);
                                }}
                                style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', textDecoration: 'none', wordBreak: 'break-all', cursor: 'pointer' }}
                                title="Click to preview PDF in new tab"
                              >
                                📄 {r.filename || 'Resume'}
                              </a>
                            </div>
                          </div>

                          {/* Right Action Buttons */}
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>

                            {/* ✏️ Edit Icon Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setShowResumesModal(false);
                                handleOpenEditModal(r);
                              }}
                              className="neu-button"
                              style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                              title="Edit Candidate Info"
                            >
                              ✏️
                            </button>

                            {/* 👁️ View PDF Icon Button */}
                            <button
                              type="button"
                              onClick={() => {
                                handleToggleContact(r.id);
                                handleViewPdf(r.id);
                              }}
                              className="neu-button"
                              style={{
                                width: 32,
                                height: 32,
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                color: isContactVisible ? 'var(--accent-blue)' : 'var(--text-primary)',
                              }}
                              title="Preview PDF & toggle contact details"
                            >
                              👁️
                            </button>

                            {/* 🗑️ Delete Icon Button */}
                            <button
                              onClick={() => handleDeleteResume(r.id)}
                              className="neu-button"
                              style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#ef4444' }}
                              title="Delete Resume"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Full-Screen PDF Viewer Modal (No Insights Sidebar, Authenticated Blob Stream) ── */}
          {viewingResume && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: 20,
              }}
            >
              <div
                className="neu-card"
                style={{
                  width: '100%',
                  maxWidth: 1100,
                  height: '92vh',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px 24px',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📄 {viewingResume.filename || 'Resume Document'}
                  </h3>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {pdfBlobUrl && pdfBlobUrl !== 'error' && (
                      <a
                        href={pdfBlobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="neu-button"
                        style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        ↗️ Open in New Tab
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (pdfBlobUrl && pdfBlobUrl !== 'error') {
                          window.location.href = `${API_URL}/api/resume/${viewingResume.id}/download`;
                        } else {
                          const uploadEl = document.getElementById('resume-file-input');
                          if (uploadEl) uploadEl.click();
                        }
                      }}
                      className="neu-button"
                      style={{ padding: '6px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      title="Download PDF File"
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={() => {
                        setViewingResume(null);
                        setPdfBlobUrl(null);
                      }}
                      className="neu-button"
                      style={{ width: 34, height: 34, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}
                      title="Close Preview"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Main Full-Width PDF Frame */}
                <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#111318', position: 'relative' }}>
                  {pdfBlobUrl && pdfBlobUrl !== 'error' ? (
                    <iframe
                      src={pdfBlobUrl}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Resume PDF Document"
                    />
                  ) : pdfBlobUrl === 'error' ? (
                    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, gap: 14, padding: 30, textAlign: 'center' }}>
                      <span style={{ fontSize: 36 }}>⚠️</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>Original File Not Found in Storage</div>
                      <div style={{ maxWidth: 480, lineHeight: 1.5, fontSize: 13, color: 'var(--text-secondary)' }}>
                        This resume was uploaded before our permanent database storage update. Please re-upload your PDF file once below — it will be saved permanently in PostgreSQL storage so you can view and download it anytime!
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingResume(null);
                          setPdfBlobUrl(null);
                          setShowResumesModal(false);
                          const uploadEl = document.getElementById('resume-file-input');
                          if (uploadEl) {
                            uploadEl.click();
                          }
                        }}
                        className="neu-button"
                        style={{ marginTop: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, background: 'var(--accent-orange)', color: '#ffffff' }}
                      >
                        📤 Re-upload PDF Resume Now
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, gap: 10 }}>
                      <span style={{ fontSize: 20 }}>⏳</span> Loading PDF document...
                    </div>
                  )}
                </div>
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
