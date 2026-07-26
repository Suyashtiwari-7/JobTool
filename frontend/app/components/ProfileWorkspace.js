'use client';

import { useEffect, useState } from 'react';
import { getProfile, updateProfileField } from '../lib/api';

/**
 * ProfileWorkspace — Read-only auto-filled dashboard.
 * The AI fills this from conversation. Users can click ✏️ to edit any field.
 */

// Friendly labels for profile field keys
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
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadProfile();
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

  const categories = Object.keys(profileData);
  const isEmpty = categories.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: 'var(--neu-flat)'
          }}>
            👤
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Career Profile</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
              Auto-filled by the AI from your conversations
            </p>
          </div>
        </div>
        <button onClick={loadProfile} className="neu-button" style={{ padding: '8px 16px', fontSize: 12, borderRadius: 16 }}>
          🔄 Refresh
        </button>
      </div>

      {/* Main Content */}
      <div className="neu-card" style={{ flex: 1, borderRadius: 24, padding: 32, overflowY: 'auto' }}>

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
              Head over to the <strong>Co-Pilot Hub</strong> and start chatting! The AI will naturally ask about you and auto-fill this section. No forms needed.
            </p>
          </div>
        )}

        {!loading && !isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900, margin: '0 auto' }}>
            {categories.map(category => (
              <div key={category}>
                {/* Category Header */}
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

                {/* Fields Grid */}
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
                        /* Edit Mode */
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
                        /* Read Mode */
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
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                              opacity: 0.5, transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = 1}
                            onMouseLeave={(e) => e.target.style.opacity = 0.5}
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

      </div>
    </div>
  );
}
