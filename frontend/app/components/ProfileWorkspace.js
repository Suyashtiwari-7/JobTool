'use client';

import { useEffect, useState } from 'react';
import {
  getProfile,
  updateProfileField,
  getIntegrations,
  connectGitHub,
  connectOutlook,
  connectLinkedIn,
  syncGitHub,
  scanOutlook,
  disconnectIntegration,
} from '../lib/api';

/**
 * ProfileWorkspace — Read-only auto-filled dashboard + Connected Accounts tab.
 * Allows managing connected accounts (GitHub, Outlook, LinkedIn) with AES-256 encryption.
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
  const [mainTab, setMainTab] = useState('profile'); // 'profile' | 'integrations'
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Connected Accounts State
  const [integrations, setIntegrations] = useState({});
  const [githubUser, setGithubUser] = useState('');
  const [outlookEmail, setOutlookEmail] = useState('');
  const [outlookPassword, setOutlookPassword] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const [savingInteg, setSavingInteg] = useState('');
  const [integStatusMsg, setIntegStatusMsg] = useState('');

  useEffect(() => {
    loadProfile();
    loadIntegrationsData();
  }, []);

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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="neu-card" style={{ flex: 1, borderRadius: 24, padding: 32, overflowY: 'auto' }}>

        {/* ════════ TAB 1: AUTO-FILLED CAREER PROFILE ════════ */}
        {mainTab === 'profile' && (
          <>
            {loading && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
                Loading profile...
              </div>
            )}

            {!loading && isEmpty && (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Your profile is empty
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                  Head over to the <strong>Co-Pilot Hub</strong> and start chatting, or connect your <strong>GitHub</strong> account in Connected Accounts!
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

      </div>
    </div>
  );
}
