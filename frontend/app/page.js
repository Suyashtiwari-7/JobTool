'use client';

import { useEffect, useState, useRef } from 'react';
import AuthLayout from './components/AuthLayout';
import SidebarNav from './components/SidebarNav';
import CoPilotHub from './components/CoPilotHub';
import AppliedCalendar from './components/AppliedCalendar';
import StatBox from './components/StatBox';
import ProfileWorkspace from './components/ProfileWorkspace';
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
  togglePinApplication,
  deleteApplication,
  clearApplications,
  triggerPipeline,
  getResumePdfUrl,
  getCoverLetterPdfUrl,
  generateScreeningAnswer,
  generateOutreachEmail,
  sendAssistantChat,
  getAssistantMemories,
  deleteAssistantMemory,
  getAssistantSchedules,
  toggleAssistantSchedule,
  createAssistantSchedule,
  deleteAssistantSchedule,
  getChatHistory,
} from './lib/api';

const ROLE_SUGGESTIONS = [
  'Software Engineering Apprentice',
  'Artificial Intelligence Apprentice',
  'Full Stack Apprentice',
  'Cybersecurity Apprentice',
  'Cloud Engineer Apprentice',
  'Data Science Apprentice',
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
  const [showAppliedModal, setShowAppliedModal] = useState(false);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [viewingResume, setViewingResume] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // Multipage Navigation & AI Co-Pilot Assistant States
  const [activePage, setActivePage] = useState('hub'); // 'hub' | 'schedules' | 'calendar'
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantChatHistory, setAssistantChatHistory] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your AI Career Co-Pilot. Click the Glowing Orb or type a command like "Apply for Big Tech Apprenticeships everyday 8am-10am" or "My internship ends June 30".',
      actions: [],
    },
  ]);
  const [assistantMemories, setAssistantMemories] = useState([]);
  const [assistantSchedules, setAssistantSchedules] = useState([]);
  const [sendingChat, setSendingChat] = useState(false);

  function handleToggleContact(id) {
    setShowContactMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleDeleteApplicationItem(id) {
    if (!confirm('Delete this application record?')) return;
    const prev = [...applications];
    setApplications((old) => old.filter((a) => a.id !== id));
    try {
      await deleteApplication(id);
      const s = await getStats().catch(() => null);
      if (s) setStats(s);
    } catch (err) {
      setApplications(prev);
      alert('Failed to delete application: ' + err.message);
    }
  }

  async function handleTogglePin(id) {
    setApplications((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, is_pinned: !a.is_pinned } : a));
      return [...updated].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || b.match_score - a.match_score);
    });
    try {
      await togglePinApplication(id);
    } catch (err) {
      console.error('Failed to pin application:', err);
    }
  }

  async function handleSendAssistantMessage(customMsg) {
    const textToSend = customMsg || assistantInput;
    if (!textToSend || !textToSend.trim()) return;

    const userMessageObj = { sender: 'user', text: textToSend };
    setAssistantChatHistory((prev) => [...prev, userMessageObj]);
    setAssistantInput('');
    setSendingChat(true);

    try {
      const res = await sendAssistantChat(textToSend);
      const botMessageObj = {
        sender: 'assistant',
        text: res.response_text || "I've updated your configuration.",
        actions: res.actions_taken || [],
      };
      setAssistantChatHistory((prev) => [...prev, botMessageObj]);
      await loadAllData();
    } catch (err) {
      setAssistantChatHistory((prev) => [
        ...prev,
        { sender: 'assistant', text: 'Sorry, I ran into an issue updating parameters: ' + err.message },
      ]);
    } finally {
      setSendingChat(false);
    }
  }

  async function handleClearHistory() {
    if (!confirm('Clear all conversation history?')) return;
    try {
      setClearing(true);
      await clearChatHistory();
      setAssistantChatHistory([
        {
          sender: 'assistant',
          text: 'Hello! I am your AI Career Co-Pilot. How can I assist your job search today?',
        },
      ]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    } finally {
      setClearing(false);
    }
  }

  async function handleDeleteMemoryItem(id) {
    setAssistantMemories((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteAssistantMemory(id);
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  }

  async function handleToggleScheduleItem(id) {
    setAssistantSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_running: !s.is_running, status: s.is_running ? 'paused' : 'active' } : s))
    );
    try {
      await toggleAssistantSchedule(id);
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  }

  async function handleCreateSchedule(data) {
    try {
      const newSched = await createAssistantSchedule(data);
      setAssistantSchedules((prev) => [newSched, ...prev]);
    } catch (err) {
      alert('Failed to create schedule: ' + err.message);
    }
  }

  async function handleDeleteSchedule(id) {
    setAssistantSchedules((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteAssistantSchedule(id);
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
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
      const [s, p, f, rList, apps, mems, scheds, chatHist] = await Promise.all([
        getStats().catch(() => null),
        getPipelineStatus().catch(() => null),
        getActiveFilter().catch(() => null),
        listResumes().catch(() => []),
        getApplications({ limit: 50 }).catch(() => []),
        getAssistantMemories().catch(() => []),
        getAssistantSchedules().catch(() => []),
        getChatHistory().catch(() => []),
      ]);

      setStats(s);
      setPipelineStatus(p);
      if (p?.status === 'running') setRunning(true);
      setResumes(rList);
      setApplications(apps);
      if (mems) setAssistantMemories(mems);
      if (scheds) setAssistantSchedules(scheds);
      if (chatHist && chatHist.length > 0) {
        setAssistantChatHistory(
          chatHist.map((msg) => ({
            sender: msg.role === 'assistant' ? 'assistant' : 'user',
            text: msg.content,
          }))
        );
      }

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
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        {/* VS Code Style Left Vertical Navigation Sidebar */}
        <SidebarNav activePage={activePage} setActivePage={setActivePage} />

        <div style={{ flex: 1, padding: '24px 32px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          {/* ── Top Header Bar (Canva Split Floating Cards) ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            {/* Left Header Card / Branding */}
            <div className="neu-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderRadius: 16 }}>
              <img src="/logo.png" alt="JobTool Logo" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', boxShadow: 'var(--neu-flat)' }} />
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                  JobTool
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginTop: 1, margin: 0 }}>
                  your career co-pilot
                </p>
              </div>
            </div>

            {/* Right Header Controls Card */}
            <div className="neu-card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 16px', borderRadius: 16 }}>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="neu-button neu-button-danger"
                style={{ padding: '8px 16px', fontSize: 12, borderRadius: 20, fontWeight: 700 }}
                title="Clear old history and queue"
              >
                🧹 {clearing ? 'Clearing...' : 'Clear History'}
              </button>

              <div 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                style={{ 
                  width: 90, 
                  height: 40, 
                  borderRadius: 20, 
                  position: 'relative', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: 'var(--bg-base)', 
                  boxShadow: 'var(--neu-pressed)',
                  border: 'none',
                  outline: 'none'
                }}
              >
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 12px', fontSize: 13, fontWeight: 900, alignItems: 'center' }}>
                  <span style={{ color: '#5c8cf5', opacity: theme === 'dark' ? 1 : 0.4 }}>ON</span>
                  <span style={{ fontSize: 13, opacity: theme === 'light' ? 1 : 0.4 }}>🌙</span>
                </div>
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 3, 
                    left: theme === 'light' ? 3 : 43, 
                    width: 44, 
                    height: 34, 
                    borderRadius: 17, 
                    background: 'var(--bg-card)', 
                    boxShadow: 'var(--neu-flat)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: 15,
                  }}
                >
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
          {/* ════════ PAGE 1: AI CO-PILOT HUB ════════ */}
          {activePage === 'hub' && (
            <CoPilotHub
              assistantChatHistory={assistantChatHistory}
              assistantInput={assistantInput}
              setAssistantInput={setAssistantInput}
              assistantMemories={assistantMemories}
              sendingChat={sendingChat}
              onSendMessage={handleSendAssistantMessage}
              onDeleteMemory={handleDeleteMemoryItem}
              isChatOpen={isChatOpen}
              setIsChatOpen={setIsChatOpen}
              theme={theme}
            />
          )}

          {/* ════════ PAGE 2: AUTOMATION WORKSPACE ════════ */}
          {activePage === 'schedules' && (
            <AppliedCalendar
              applications={applications}
              stats={stats}
              onDeleteApplication={handleDeleteApplicationItem}
              onTogglePin={handleTogglePin}
              onStatusChange={handleStatusChange}
            />
          )}

          {/* ════════ PAGE 3: CAREER PROFILE ════════ */}
          {activePage === 'profile' && (
            <ProfileWorkspace />
          )}
        </>
      )}
      
      {/* ── Applied Organizations & Applications Modal ── */}
      {showAppliedModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowAppliedModal(false)}
        >
          <div
            className="neu-card"
            style={{
              width: '100%',
              maxWidth: 920,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🏢 Applied Organizations & Companies
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 10px', borderRadius: 12 }}>
                    {applications.filter((a) => a.status === 'applied' || a.status === 'response_received' || a.status === 'interview').length} Total
                  </span>
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Auto-retained for 60 days (2 months) in PostgreSQL storage before automatic cleanup.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAppliedModal(false)}
                className="neu-button"
                style={{ width: 34, height: 34, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}
                title="Close Modal"
              >
                ✕
              </button>
            </div>

            {/* Search Filter Inside Modal */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="🔍 Search company name, position, or status..."
                value={appliedSearchQuery}
                onChange={(e) => setAppliedSearchQuery(e.target.value)}
                className="neu-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Content List / Table Container */}
            <div className="mobile-table-wrap" style={{ flex: 1, overflowY: 'auto' }}>
              {(() => {
                const appliedList = applications.filter((app) => {
                  const q = appliedSearchQuery.toLowerCase();
                  const comp = (app.job?.company || '').toLowerCase();
                  const title = (app.job?.title || '').toLowerCase();
                  const status = (app.status || '').toLowerCase();
                  return comp.includes(q) || title.includes(q) || status.includes(q);
                });

                if (appliedList.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                      <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>🏢</span>
                      {appliedSearchQuery ? 'No matching applied organizations found.' : 'No applied companies recorded yet.'}
                    </div>
                  );
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 12px' }}>Company / Organization</th>
                        <th style={{ padding: '10px 12px' }}>Job Role & Source</th>
                        <th style={{ padding: '10px 12px' }}>🎯 AI Match</th>
                        <th style={{ padding: '10px 12px' }}>Applied Date</th>
                        <th style={{ padding: '10px 12px' }}>Retention Lifecycle</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appliedList.map((app) => {
                        const appDate = new Date(app.created_at);
                        const daysAgo = Math.floor((new Date() - appDate) / (1000 * 60 * 60 * 24));
                        const daysRemaining = Math.max(0, 60 - daysAgo);

                        return (
                          <tr key={app.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {app.job?.company || 'Organization'}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.job?.title || 'Position'}</div>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                {app.job?.source || 'API'} • {app.job?.location || 'Remote'}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: (app.match_score || 0) >= 80 ? 'var(--accent-green)' : 'var(--text-accent)',
                                  background: (app.match_score || 0) >= 80 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                                  padding: '4px 10px',
                                  borderRadius: 12,
                                }}
                              >
                                {Math.round(app.match_score || 0)}%
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                              {isNaN(appDate) ? 'Recently' : appDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: daysRemaining <= 7 ? 'var(--accent-red)' : 'var(--text-muted)',
                                  background: daysRemaining <= 7 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-neu-inset)',
                                  padding: '4px 8px',
                                  borderRadius: 8,
                                }}
                              >
                                ⏳ {daysRemaining} days remaining
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                  background:
                                    app.status === 'applied'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : app.status === 'interview'
                                      ? 'rgba(139, 92, 246, 0.15)'
                                      : 'rgba(59, 130, 246, 0.15)',
                                  color:
                                    app.status === 'applied'
                                      ? 'var(--accent-green)'
                                      : app.status === 'interview'
                                      ? 'var(--accent-purple)'
                                      : 'var(--text-accent)',
                                }}
                              >
                                {app.status || 'applied'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                {app.job?.url && (
                                  <a
                                    href={app.job.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="neu-button"
                                    style={{ padding: '4px 10px', fontSize: 11 }}
                                    title="Open Job Posting"
                                  >
                                    🌐 View
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApplicationItem(app.id)}
                                  className="neu-button"
                                  style={{ padding: '4px 8px', fontSize: 11, color: 'var(--accent-red)' }}
                                  title="Delete application record"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </AuthLayout>
  );
}
