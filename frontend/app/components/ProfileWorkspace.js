'use client';

import { useEffect, useState } from 'react';
import {
  getProfile,
  updateProfileField,
  uploadResume,
  getIntegrations,
  connectGitHub,
  connectOutlook,
  connectLinkedIn,
  syncGitHub,
  scanOutlook,
  disconnectIntegration,
  getGuardrails,
  updateGuardrails,
} from '../lib/api';

/**
 * ProfileWorkspace — Read-only auto-filled dashboard + Connected Accounts tab + Guardrails tab.
 * Allows managing connected accounts and autonomous safety guardrails.
 */

const FIELD_LABELS = {
  full_name: '👤 Full Name',
  name: '👤 Full Name',
  email: '📧 Email Address',
  phone: '📱 Phone Number',
  location: '📍 Location',
  citizenship: '🏳️ Citizenship',
  other_citizenship: '🌍 Other Citizenship',
  linkedin: '🔗 LinkedIn',
  github: '💻 GitHub',
  portfolio: '🌐 Portfolio',
  current_role: '💼 Current Role',
  experience_years: '📅 Years of Experience',
  skills: '🛠️ Key Skills',
  github_skills: '🐙 GitHub Detected Skills',
  github_languages: '💻 GitHub Languages',
  github_top_projects: '📦 GitHub Top Repos',
  disability: '♿ Disability Status',
  legal_charges: '⚖️ Legal Charges',
  work_auth: '✅ Work Authorization',
  sponsorship: '📄 Visa Sponsorship',
};

const CATEGORY_LABELS = {
  personal: '🪪 Personal Information',
  links: '🔗 Links & Social Profiles',
  career: '💼 Career & Skills',
  boundaries: '📋 Application Questions',
  preference: '⚙️ Preferences',
  availability: '📅 Availability',
  note: '📝 Notes',
};

const CATEGORY_COLORS = {
  personal: 'rgba(59, 130, 246, 0.1)',
  links: 'rgba(16, 185, 129, 0.1)',
  career: 'rgba(245, 158, 11, 0.1)',
  boundaries: 'rgba(139, 92, 246, 0.1)',
  preference: 'rgba(236, 72, 153, 0.1)',
  availability: 'rgba(34, 211, 238, 0.1)',
  note: 'rgba(156, 163, 175, 0.1)',
};

const CATEGORY_BORDERS = {
  personal: 'var(--accent-blue)',
  links: 'var(--accent-green)',
  career: 'var(--accent-orange)',
  boundaries: 'var(--accent-purple)',
  preference: 'var(--accent-red)',
  availability: 'var(--accent-blue)',
  note: 'var(--border-subtle)',
};

export default function ProfileWorkspace() {
  const [mainTab, setMainTab] = useState('profile'); // 'profile' | 'integrations' | 'guardrails'
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Base Resume upload state
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeUploadStatus, setResumeUploadStatus] = useState('');

  async function handleProfileResumeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingResume(true);
      setResumeUploadStatus('⚡ Uploading & parsing resume with AI...');
      await uploadResume(file);
      setResumeUploadStatus('✅ Base Resume uploaded & parsed successfully! Career Profile created.');
      await loadProfile();
    } catch (err) {
      setResumeUploadStatus(`❌ Resume upload failed: ${err.message}`);
    } finally {
      setUploadingResume(false);
    }
  }

  // Connected Accounts State
  const [integrations, setIntegrations] = useState({});
  const [githubUser, setGithubUser] = useState('');
  const [outlookEmail, setOutlookEmail] = useState('');
  const [outlookPassword, setOutlookPassword] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const [savingInteg, setSavingInteg] = useState('');
  const [integStatusMsg, setIntegStatusMsg] = useState('');

  // Guardrails State
  const [guardrails, setGuardrails] = useState({
    min_salary: '',
    blocked_companies: '',
    required_keywords: '',
    excluded_keywords: '',
    daily_max_applications: 25,
    auto_submit_enabled: false,
    remote_only: false,
    is_complete: false,
  });
  const [savingGuardrails, setSavingGuardrails] = useState(false);
  const [guardrailsStatusMsg, setGuardrailsStatusMsg] = useState('');

  useEffect(() => {
    loadProfile();
    loadIntegrationsData();
    loadGuardrailsData();
  }, []);

  async function loadGuardrailsData() {
    try {
      const g = await getGuardrails();
      setGuardrails({
        min_salary: g.min_salary || '',
        blocked_companies: (g.blocked_companies || []).join(', '),
        required_keywords: (g.required_keywords || []).join(', '),
        excluded_keywords: (g.excluded_keywords || []).join(', '),
        daily_max_applications: g.daily_max_applications ?? 25,
        remote_only: g.remote_only || false,
        is_complete: g.is_complete || false,
      });
    } catch (err) {
      console.error('Failed to load guardrails:', err);
    }
  }

  async function handleSaveGuardrails(e) {
    e.preventDefault();
    try {
      setSavingGuardrails(true);
      setGuardrailsStatusMsg('');

      const reqBody = {
        min_salary: guardrails.min_salary ? parseInt(guardrails.min_salary, 10) : null,
        blocked_companies: guardrails.blocked_companies.split(',').map((s) => s.trim()).filter(Boolean),
        required_keywords: guardrails.required_keywords.split(',').map((s) => s.trim()).filter(Boolean),
        excluded_keywords: guardrails.excluded_keywords.split(',').map((s) => s.trim()).filter(Boolean),
        daily_max_applications: parseInt(guardrails.daily_max_applications, 10) || 25,
        remote_only: !!guardrails.remote_only,
      };

      const updated = await updateGuardrails(reqBody);
      setGuardrails({
        min_salary: updated.min_salary || '',
        blocked_companies: (updated.blocked_companies || []).join(', '),
        required_keywords: (updated.required_keywords || []).join(', '),
        excluded_keywords: (updated.excluded_keywords || []).join(', '),
        daily_max_applications: updated.daily_max_applications ?? 25,
        remote_only: updated.remote_only || false,
        is_complete: updated.is_complete || false,
      });

      setGuardrailsStatusMsg('✅ Guardrails saved successfully! Agent safety rules are active.');
    } catch (err) {
      setGuardrailsStatusMsg(`❌ Failed to save guardrails: ${err.message}`);
    } finally {
      setSavingGuardrails(false);
    }
  }

  async function loadProfile() {
    try {
      setLoading(true);
      const res = await getProfile();
      setProfileData(res.profile || {});
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadIntegrationsData() {
    try {
      const res = await getIntegrations();
      const map = res.integrations || {};
      setIntegrations(map);
      if (map.github) setGithubUser(map.github.username_or_email || '');
      if (map.outlook) setOutlookEmail(map.outlook.username_or_email || '');
      if (map.linkedin) setLinkedinUrl(map.linkedin.username_or_email || '');
    } catch (err) {
      console.error('Failed to load integrations:', err);
    }
  }

  async function handleSaveEdit(memoryId) {
    try {
      await updateProfileField(memoryId, editValue);
      setEditingId(null);
      setEditValue('');
      await loadProfile();
    } catch (err) {
      console.error('Failed to update profile field:', err);
    }
  }

  function handleStartEdit(id, currentValue) {
    setEditingId(id);
    setEditValue(currentValue);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  // Integration Handlers
  async function handleConnectGitHub() {
    if (!githubUser.trim()) return;
    try {
      setSavingInteg('github');
      setIntegStatusMsg('Syncing public repos...');
      const res = await connectGitHub(githubUser);
      setIntegStatusMsg(`✅ Connected GitHub: ${res.username}. Synced ${res.sync_result?.repos_scanned || 0} repos!`);
      await loadIntegrationsData();
      await loadProfile();
    } catch (err) {
      setIntegStatusMsg(`❌ GitHub connection error: ${err.message}`);
    } finally {
      setSavingInteg('');
    }
  }

  async function handleConnectOutlook() {
    if (!outlookEmail.trim() || !outlookPassword.trim()) return;
    try {
      setSavingInteg('outlook');
      setIntegStatusMsg('Testing Outlook IMAP connection...');
      const res = await connectOutlook(outlookEmail, outlookPassword);
      setIntegStatusMsg(`✅ Connected Outlook! Test scan: ${res.scan_test?.emails_scanned || 0} unread emails scanned.`);
      setOutlookPassword('');
      await loadIntegrationsData();
    } catch (err) {
      setIntegStatusMsg(`❌ Outlook connection error: ${err.message}`);
    } finally {
      setSavingInteg('');
    }
  }

  async function handleConnectLinkedIn() {
    if (!linkedinUrl.trim()) return;
    try {
      setSavingInteg('linkedin');
      await connectLinkedIn(linkedinUrl);
      setIntegStatusMsg(`✅ Saved LinkedIn URL!`);
      await loadIntegrationsData();
      await loadProfile();
    } catch (err) {
      setIntegStatusMsg(`❌ LinkedIn error: ${err.message}`);
    } finally {
      setSavingInteg('');
    }
  }

  async function handleDisconnect(serviceName) {
    if (!confirm(`Disconnect ${serviceName}?`)) return;
    try {
      await disconnectIntegration(serviceName);
      setIntegStatusMsg(`Disconnected ${serviceName}.`);
      await loadIntegrationsData();
    } catch (err) {
      alert('Failed to disconnect: ' + err.message);
    }
  }

  const categories = Object.keys(profileData);
  const isEmpty = categories.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>

      {/* Header & Sub-Tab Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: 'var(--neu-flat)'
          }}>
            👤
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Career Profile & Integrations</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
              Manage your AI Co-Pilot&apos;s memory and connected accounts
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="neu-inset" style={{ display: 'flex', padding: 4, borderRadius: 20, background: 'var(--bg-neu-inset)', gap: 4 }}>
          <button
            onClick={() => setMainTab('profile')}
            style={{
              padding: '8px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 800, transition: 'all 0.2s',
              background: mainTab === 'profile' ? 'var(--bg-card)' : 'transparent',
              boxShadow: mainTab === 'profile' ? 'var(--neu-flat)' : 'none',
              color: mainTab === 'profile' ? 'var(--text-primary)' : 'var(--text-muted)'
            }}
          >
            🧠 Career Profile
          </button>
          <button
            onClick={() => setMainTab('integrations')}
            style={{
              padding: '8px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 800, transition: 'all 0.2s',
              background: mainTab === 'integrations' ? 'var(--bg-card)' : 'transparent',
              boxShadow: mainTab === 'integrations' ? 'var(--neu-flat)' : 'none',
              color: mainTab === 'integrations' ? 'var(--accent-blue)' : 'var(--text-muted)'
            }}
          >
            🔌 Connected Accounts
          </button>
          <button
            onClick={() => setMainTab('guardrails')}
            style={{
              padding: '8px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 800, transition: 'all 0.2s',
              background: mainTab === 'guardrails' ? 'var(--bg-card)' : 'transparent',
              boxShadow: mainTab === 'guardrails' ? 'var(--neu-flat)' : 'none',
              color: mainTab === 'guardrails' ? 'var(--accent-purple)' : 'var(--text-muted)'
            }}
          >
            🛡️ Safety Guardrails
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="neu-card" style={{ flex: 1, borderRadius: 24, padding: 32, overflowY: 'auto' }}>

        {/* ════════ TAB 1: AUTO-FILLED CAREER PROFILE ════════ */}
        {mainTab === 'profile' && (
          <>
            {/* 📄 PROMINENT BASE RESUME UPLOAD & AI PARSER BOX */}
            <div className="neu-card" style={{ padding: 24, borderRadius: 20, marginBottom: 28, background: 'rgba(240, 94, 45, 0.05)', border: '1.5px dashed var(--accent-orange)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📄 Master Base Resume & AI Profile Auto-Builder
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    Upload your baseline resume (PDF or DOCX). AI will automatically parse your skills, experience, and contact details to build your profile!
                  </p>
                </div>

                <label className="neu-button neu-button-primary" style={{ padding: '10px 20px', borderRadius: 16, fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  📥 {uploadingResume ? 'Parsing Resume...' : 'Upload Base Resume (PDF/DOCX)'}
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleProfileResumeUpload}
                    disabled={uploadingResume}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {resumeUploadStatus && (
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 800, color: resumeUploadStatus.startsWith('✅') ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                  {resumeUploadStatus}
                </div>
              )}
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
                Loading profile...
              </div>
            )}

            {!loading && isEmpty && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                  No Base Resume Uploaded Yet
                </h3>
                <p style={{ fontSize: 13, margin: 0 }}>
                  Click <strong>Upload Base Resume (PDF/DOCX)</strong> above to upload your resume and auto-build your Master Profile with AI!
                </p>
              </div>
            )}

            {!loading && !isEmpty && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900, margin: '0 auto' }}>
                {categories.map(category => (
                  <div key={category}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                      paddingBottom: 8, borderBottom: `2px solid ${CATEGORY_BORDERS[category] || 'var(--border-subtle)'}`
                    }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                        background: CATEGORY_COLORS[category] || 'rgba(156, 163, 175, 0.1)',
                        padding: '2px 10px', borderRadius: 20
                      }}>
                        {profileData[category].length} {profileData[category].length === 1 ? 'field' : 'fields'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {profileData[category].map(field => (
                        <div
                          key={field.id}
                          className="neu-inset"
                          style={{
                            padding: '14px 18px', borderRadius: 14,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {editingId === field.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                              <input
                                type="text"
                                className="neu-input"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(field.id)}
                                autoFocus
                                style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
                              />
                              <button onClick={() => handleSaveEdit(field.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Save">
                                ✅
                              </button>
                              <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Cancel">
                                ❌
                              </button>
                            </div>
                          ) : (
                            <>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'capitalize' }}>
                                  {FIELD_LABELS[field.key] || field.key.replace(/_/g, ' ')}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {field.value}
                                </div>
                              </div>
                              <button
                                onClick={() => handleStartEdit(field.id, field.value)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.5 }}
                                title="Edit this field"
                              >
                                ✏️
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════ TAB 2: CONNECTED ACCOUNTS & INTEGRATIONS ════════ */}
        {mainTab === 'integrations' && (
          <div style={{ maxWidth: 850, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Status Alert Banner */}
            {integStatusMsg && (
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-blue)', fontSize: 13, fontWeight: 700 }}>
                {integStatusMsg}
              </div>
            )}

            {/* 1. GITHUB CARD */}
            <div className="neu-card" style={{ padding: 24, borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>🐙</div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>GitHub Public Skill Sync</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Auto-scans public repos, languages, and topics to keep your profile skills continuously updated (0 passwords required).
                    </p>
                  </div>
                </div>
                {integrations.github?.is_active && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 12px', borderRadius: 20 }}>
                    Connected
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="text"
                  className="neu-input"
                  placeholder="e.g. Suyashtiwari-7"
                  value={githubUser}
                  onChange={(e) => setGithubUser(e.target.value)}
                  style={{ flex: 1, fontSize: 13, padding: '10px 14px' }}
                />
                <button
                  onClick={handleConnectGitHub}
                  className="neu-button neu-button-primary"
                  style={{ padding: '10px 20px', fontSize: 13, borderRadius: 16 }}
                  disabled={savingInteg === 'github'}
                >
                  {savingInteg === 'github' ? 'Syncing...' : 'Connect & Sync GitHub'}
                </button>
                {integrations.github && (
                  <button onClick={() => handleDisconnect('github')} className="neu-button" style={{ padding: '10px', borderRadius: 16, color: 'var(--accent-red)' }} title="Disconnect">
                    🗑️
                  </button>
                )}
              </div>
            </div>

            {/* 2. OUTLOOK EMAIL CARD */}
            <div className="neu-card" style={{ padding: 24, borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>📧</div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Outlook Email Service (IMAP Scanner + SMTP Sender)</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Scans unread interview/offer emails to auto-pin calendar events, and sends cold emails from your official Outlook address. 🔒 <em>AES-256 encrypted at rest.</em>
                    </p>
                  </div>
                </div>
                {integrations.outlook?.is_active && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 12px', borderRadius: 20 }}>
                    Connected
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Outlook Email Address</label>
                  <input
                    type="email"
                    className="neu-input"
                    placeholder="e.g. user@outlook.com or user@live.com"
                    value={outlookEmail}
                    onChange={(e) => setOutlookEmail(e.target.value)}
                    style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>App Password (AES-256 Encrypted)</label>
                  <input
                    type="password"
                    className="neu-input"
                    placeholder="••••••••••••••••"
                    value={outlookPassword}
                    onChange={(e) => setOutlookPassword(e.target.value)}
                    style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                {integrations.outlook && (
                  <button onClick={() => handleDisconnect('outlook')} className="neu-button" style={{ padding: '10px 16px', fontSize: 13, borderRadius: 16, color: 'var(--accent-red)' }}>
                    Disconnect
                  </button>
                )}
                <button
                  onClick={handleConnectOutlook}
                  className="neu-button neu-button-primary"
                  style={{ padding: '10px 24px', fontSize: 13, borderRadius: 16 }}
                  disabled={savingInteg === 'outlook'}
                >
                  {savingInteg === 'outlook' ? 'Testing Connection...' : 'Save & Test Connection'}
                </button>
              </div>
            </div>

            {/* 3. LINKEDIN CARD */}
            <div className="neu-card" style={{ padding: 24, borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>💼</div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>LinkedIn Profile URL</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Used by the AI Co-Pilot for recruiter outreach and DM drafting.
                    </p>
                  </div>
                </div>
                {integrations.linkedin?.is_active && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 12px', borderRadius: 20 }}>
                    Saved
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="url"
                  className="neu-input"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  style={{ flex: 1, fontSize: 13, padding: '10px 14px' }}
                />
                <button
                  onClick={handleConnectLinkedIn}
                  className="neu-button neu-button-primary"
                  style={{ padding: '10px 20px', fontSize: 13, borderRadius: 16 }}
                  disabled={savingInteg === 'linkedin'}
                >
                  Save URL
                </button>
                {integrations.linkedin && (
                  <button onClick={() => handleDisconnect('linkedin')} className="neu-button" style={{ padding: '10px', borderRadius: 16, color: 'var(--accent-red)' }} title="Disconnect">
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB 3: SAFETY GUARDRAILS ════════ */}
        {mainTab === 'guardrails' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                🛡️ Autonomous Safety Guardrails
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Set explicit boundary conditions. The Graph Engine evaluates these deterministic rules before taking any autonomous action or spending LLM tokens.
              </p>
            </div>

            {guardrailsStatusMsg && (
              <div style={{
                padding: '12px 16px', borderRadius: 16, fontSize: 13, fontWeight: 600,
                background: guardrailsStatusMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: guardrailsStatusMsg.startsWith('✅') ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {guardrailsStatusMsg}
              </div>
            )}

            <form onSubmit={handleSaveGuardrails} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Daily Application Cap */}
              <div className="neu-card" style={{ padding: 20, borderRadius: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  📊 Daily Application Cap
                </label>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Maximum number of job applications the agent can tailor/create in a single 24-hour period.
                </p>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="neu-input"
                  value={guardrails.daily_max_applications}
                  onChange={(e) => setGuardrails({ ...guardrails, daily_max_applications: e.target.value })}
                  style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
                />
              </div>

              {/* Dual-Mode Auto-Submit Toggle */}
              <div className="neu-card" style={{ padding: 20, borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      🤖 Autonomous Auto-Submit Mode
                    </label>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, margin: 0 }}>
                      When OFF: Creates tailored resumes & cover letters for manual review (Draft-Only Mode).<br/>
                      When ON: Submits applications headlessly via direct ATS APIs & single-worker browser.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={guardrails.auto_submit_enabled || false}
                    onChange={(e) => setGuardrails({ ...guardrails, auto_submit_enabled: e.target.checked })}
                    style={{ width: 22, height: 22, cursor: 'pointer', accentColor: 'var(--accent-green)' }}
                  />
                </div>
              </div>

              {/* Salary Floor */}
              <div className="neu-card" style={{ padding: 20, borderRadius: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  💰 Minimum Annual Salary Floor ($ USD)
                </label>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Skip any job posting offering below this annual salary. Leave empty to allow any range.
                </p>
                <input
                  type="number"
                  placeholder="e.g. 90000"
                  className="neu-input"
                  value={guardrails.min_salary}
                  onChange={(e) => setGuardrails({ ...guardrails, min_salary: e.target.value })}
                  style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
                />
              </div>

              {/* Blocked Companies */}
              <div className="neu-card" style={{ padding: 20, borderRadius: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  🚫 Blocked Companies (Comma Separated)
                </label>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  The agent will NEVER tailor or apply to these companies (e.g. current employer).
                </p>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp, BadCompany Inc, Revature"
                  className="neu-input"
                  value={guardrails.blocked_companies}
                  onChange={(e) => setGuardrails({ ...guardrails, blocked_companies: e.target.value })}
                  style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
                />
              </div>

              {/* Required & Excluded Keywords */}
              <div className="neu-card" style={{ padding: 20, borderRadius: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                    ✅ Required Keywords
                  </label>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                    Job description MUST contain at least one of these.
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. Python, Remote, Junior"
                    className="neu-input"
                    value={guardrails.required_keywords}
                    onChange={(e) => setGuardrails({ ...guardrails, required_keywords: e.target.value })}
                    style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                    ⛔ Excluded Keywords
                  </label>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                    Skip job if description contains any of these.
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. Unpaid, Clearance Required"
                    className="neu-input"
                    value={guardrails.excluded_keywords}
                    onChange={(e) => setGuardrails({ ...guardrails, excluded_keywords: e.target.value })}
                    style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
                  />
                </div>
              </div>

              {/* Remote Only Toggle */}
              <div className="neu-card" style={{ padding: 20, borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>🌐 Remote Jobs Only</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Only match postings that explicitly permit 100% remote work.</div>
                </div>
                <input
                  type="checkbox"
                  checked={guardrails.remote_only}
                  onChange={(e) => setGuardrails({ ...guardrails, remote_only: e.target.checked })}
                  style={{ width: 20, height: 20, cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="submit"
                  className="neu-button neu-button-primary"
                  style={{ padding: '12px 32px', fontSize: 14, borderRadius: 16, fontWeight: 800 }}
                  disabled={savingGuardrails}
                >
                  {savingGuardrails ? 'Saving Guardrails...' : '💾 Save & Activate Safety Guardrails'}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
