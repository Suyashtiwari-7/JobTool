'use client';

import { useState } from 'react';

/**
 * ProfileModal — A Neumorphic modal serving as the AI Co-Pilot's "Brain".
 * Allows users to upload multiple base resumes, define basic contact info,
 * and answer common hard-constraint job portal questions (via sleek radio buttons).
 */
export default function ProfileModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('brain'); // 'brain' | 'info' | 'questions'
  const [isDragging, setIsDragging] = useState(false);
  
  // State for multiple uploaded resumes
  const [resumes, setResumes] = useState([
    { id: '1', name: 'Software_Engineer_Resume.pdf', size: '1.2 MB', uploadedAt: 'Just now' }
  ]);

  // State for basic info
  const [basicInfo, setBasicInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: ''
  });

  // State for Yes/No questions
  const [questions, setQuestions] = useState({
    authToWork: null,
    sponsorship: null,
    relocation: null,
    clearance: null
  });

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).map((f, i) => ({
        id: Date.now() + i.toString(),
        name: f.name,
        size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
        uploadedAt: 'Just now'
      }));
      setResumes([...resumes, ...newFiles]);
    }
  };

  const handleRemoveResume = (id) => {
    setResumes(resumes.filter(r => r.id !== id));
  };

  // Custom Neumorphic Radio Button Group Component
  const NeuRadioGroup = ({ label, value, onChange }) => {
    return (
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{label}</p>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* YES Option */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div 
              style={{
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                background: value === true ? 'var(--accent-blue)' : 'var(--bg-neu-inset)',
                boxShadow: value === true ? 'var(--neu-flat)' : 'var(--neu-pressed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                border: value === true ? 'none' : '1px solid var(--border-subtle)'
              }}
            >
              {value === true && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <input 
              type="radio" 
              checked={value === true} 
              onChange={() => onChange(true)} 
              style={{ display: 'none' }} 
            />
            <span style={{ fontSize: 13, fontWeight: value === true ? 800 : 600, color: value === true ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Yes</span>
          </label>

          {/* NO Option */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div 
              style={{
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                background: value === false ? 'var(--accent-blue)' : 'var(--bg-neu-inset)',
                boxShadow: value === false ? 'var(--neu-flat)' : 'var(--neu-pressed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                border: value === false ? 'none' : '1px solid var(--border-subtle)'
              }}
            >
              {value === false && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <input 
              type="radio" 
              checked={value === false} 
              onChange={() => onChange(false)} 
              style={{ display: 'none' }} 
            />
            <span style={{ fontSize: 13, fontWeight: value === false ? 800 : 600, color: value === false ? 'var(--text-primary)' : 'var(--text-secondary)' }}>No</span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div className="neu-card" style={{
        width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        borderRadius: 24, overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: 'var(--neu-flat)' }}>
              👤
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Career Profile & Assets</h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>The AI Co-Pilot uses this context for applications.</p>
            </div>
          </div>
          <button onClick={onClose} className="neu-button" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 16 }}>
            ✕ Close
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ padding: '16px 24px 0 24px' }}>
          <div className="neu-inset" style={{ display: 'flex', padding: 6, borderRadius: 20, background: 'var(--bg-neu-inset)', gap: 6 }}>
            {[
              { id: 'brain', icon: '🧠', label: 'The Brain (Resumes)' },
              { id: 'info', icon: '🪪', label: 'Basic Info & Links' },
              { id: 'questions', icon: '📋', label: 'Application Questions' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 14, border: 'none', outline: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                  background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                  boxShadow: activeTab === tab.id ? 'var(--neu-flat)' : 'none',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)'
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          
          {/* TAB 1: THE BRAIN (Multiple Resumes) */}
          {activeTab === 'brain' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: 12, padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-blue)', margin: '0 0 4px 0' }}>💡 How it works</h4>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                  Drop your master resumes here (you can upload multiple variations for different roles). 
                  The AI Co-Pilot will automatically extract your skills, experience, and education to fill out forms and tailor documents.
                </p>
              </div>

              {/* Dropzone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="neu-inset"
                style={{ 
                  border: isDragging ? '2px dashed var(--accent-blue)' : '2px dashed var(--border-subtle)',
                  borderRadius: 16, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                  background: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-neu-inset)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>📤</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Drag & Drop multiple resumes here</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Supports PDF, DOCX, TXT (Max 5MB each)</div>
              </div>

              {/* Uploaded List */}
              {resumes.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }}>
                    Uploaded Assets ({resumes.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {resumes.map(resume => (
                      <div key={resume.id} className="neu-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 20 }}>📄</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{resume.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{resume.size} • Uploaded {resume.uploadedAt}</div>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveResume(resume.id)} className="neu-button" style={{ padding: '6px', borderRadius: '50%', color: 'var(--accent-red)' }} title="Remove">
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BASIC INFO & LINKS */}
          {activeTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ gridColumn: '1 / -1', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', borderRadius: 12, padding: 16, marginBottom: 4 }}>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0 }}>
                  Only fill what isn't explicitly clear on your resume. The AI will use this to accurately fill Contact Info sections on career portals.
                </p>
              </div>

              {/* Inputs */}
              {[
                { key: 'fullName', label: 'Full Name', type: 'text', placeholder: 'e.g. Sarah Connor' },
                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'e.g. sarah@example.com' },
                { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'e.g. +1 (555) 123-4567' },
                { key: 'location', label: 'Location (City, State)', type: 'text', placeholder: 'e.g. San Francisco, CA' },
                { key: 'linkedin', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/...' },
                { key: 'github', label: 'GitHub / Portfolio URL', type: 'url', placeholder: 'https://github.com/...' }
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    className="neu-input"
                    placeholder={field.placeholder}
                    value={basicInfo[field.key]}
                    onChange={(e) => setBasicInfo({ ...basicInfo, [field.key]: e.target.value })}
                    style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: APPLICATION QUESTIONS (Radio Buttons) */}
          {activeTab === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent-purple)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0 }}>
                  Provide explicit answers to common mandatory compliance and eligibility questions. The AI will strictly follow these boundaries.
                </p>
              </div>

              <div className="neu-card" style={{ padding: 24, borderRadius: 16 }}>
                <NeuRadioGroup 
                  label="1. Are you legally authorized to work in the country where the job is located?" 
                  value={questions.authToWork} 
                  onChange={(val) => setQuestions({ ...questions, authToWork: val })} 
                />
                
                <NeuRadioGroup 
                  label="2. Do you now, or will you in the future, require sponsorship for employment visa status?" 
                  value={questions.sponsorship} 
                  onChange={(val) => setQuestions({ ...questions, sponsorship: val })} 
                />

                <NeuRadioGroup 
                  label="3. Are you willing to relocate for this position if required?" 
                  value={questions.relocation} 
                  onChange={(val) => setQuestions({ ...questions, relocation: val })} 
                />

                <NeuRadioGroup 
                  label="4. Do you currently hold an active Security Clearance?" 
                  value={questions.clearance} 
                  onChange={(val) => setQuestions({ ...questions, clearance: val })} 
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-card)' }}>
          <button onClick={onClose} className="neu-button neu-button-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 20 }}>
            💾 Save Profile Context
          </button>
        </div>
      </div>
    </div>
  );
}
