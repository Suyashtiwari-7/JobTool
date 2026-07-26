'use client';

import { useState } from 'react';

/**
 * ProfileWorkspace — A full-page Neumorphic workspace serving as the AI Co-Pilot's "Brain".
 * Allows users to upload multiple base resumes, define basic contact info,
 * and answer common hard-constraint job portal questions.
 */
export default function ProfileWorkspace() {
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

  // State for Yes/No & Text questions
  const [questions, setQuestions] = useState({
    citizenship: '',
    otherCitizenship: '',
    disabled: null,
    legalCharges: null,
    legalChargesDetails: ''
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
  const NeuRadioGroup = ({ num, label, value, onChange }) => {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ 
            background: 'var(--accent-blue-gradient)', color: '#fff', borderRadius: '50%', width: 22, height: 22, 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, marginRight: 10,
            boxShadow: 'var(--neu-flat)', flexShrink: 0
          }}>
            {num}
          </span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
        </div>
        <div style={{ display: 'flex', gap: 16, marginLeft: 32 }}>
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

  // Custom Input Field for Questions
  const NeuInputQuestion = ({ num, label, value, onChange, placeholder }) => {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ 
            background: 'var(--accent-blue-gradient)', color: '#fff', borderRadius: '50%', width: 22, height: 22, 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, marginRight: 10,
            boxShadow: 'var(--neu-flat)', flexShrink: 0
          }}>
            {num}
          </span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
        </div>
        <div style={{ marginLeft: 32 }}>
          <input
            type="text"
            className="neu-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: '100%', maxWidth: 400, fontSize: 13, padding: '10px 14px' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      
      {/* Tab Switcher - Segmented Capsule */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div className="neu-inset" style={{ display: 'flex', padding: 6, borderRadius: 30, background: 'var(--bg-neu-inset)', gap: 6 }}>
          {[
            { id: 'brain', icon: '🧠', label: 'The Brain (Resumes)' },
            { id: 'info', icon: '🪪', label: 'Basic Info & Links' },
            { id: 'questions', icon: '📋', label: 'Application Questions' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', borderRadius: 24, border: 'none', outline: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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

      {/* Main Content Area */}
      <div className="neu-card" style={{ flex: 1, borderRadius: 24, padding: 32, overflowY: 'auto' }}>
        
        {/* TAB 1: THE BRAIN (Multiple Resumes) */}
        {activeTab === 'brain' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
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
                borderRadius: 16, padding: '60px 20px', textAlign: 'center', cursor: 'pointer',
                background: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-neu-inset)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📤</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Drag & Drop multiple resumes here</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Supports PDF, DOCX, TXT (Max 5MB each)</div>
            </div>

            {/* Uploaded List */}
            {resumes.length > 0 && (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }}>
                  Uploaded Assets ({resumes.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {resumes.map(resume => (
                    <div key={resume.id} className="neu-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: 24 }}>📄</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{resume.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{resume.size} • Uploaded {resume.uploadedAt}</div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveResume(resume.id)} className="neu-button" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-red)' }} title="Remove">
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
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                Only fill what isn't explicitly clear on your resume. The AI will use this to accurately fill Contact Info sections on career portals.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {[
                { key: 'fullName', label: 'Full Name', type: 'text', placeholder: 'e.g. Sarah Connor' },
                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'e.g. sarah@example.com' },
                { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'e.g. +1 (555) 123-4567' },
                { key: 'location', label: 'Location (City, State)', type: 'text', placeholder: 'e.g. San Francisco, CA' },
                { key: 'linkedin', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/...' },
                { key: 'github', label: 'GitHub / Portfolio URL', type: 'url', placeholder: 'https://github.com/...' }
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    className="neu-input"
                    placeholder={field.placeholder}
                    value={basicInfo[field.key]}
                    onChange={(e) => setBasicInfo({ ...basicInfo, [field.key]: e.target.value })}
                    style={{ width: '100%', fontSize: 14, padding: '12px 16px' }}
                  />
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button className="neu-button neu-button-primary" style={{ padding: '12px 32px', fontSize: 14, borderRadius: 24 }}>
                💾 Save Basic Info
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: APPLICATION QUESTIONS (Radio & Text) */}
        {activeTab === 'questions' && (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent-purple)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                Provide explicit answers to common mandatory compliance and eligibility questions found on company portals.
              </p>
            </div>

            <div className="neu-inset" style={{ padding: 32, borderRadius: 24, border: '1px solid var(--border-subtle)' }}>
              
              <NeuInputQuestion 
                num="1"
                label="I am a citizen of:" 
                placeholder="e.g. United States"
                value={questions.citizenship} 
                onChange={(val) => setQuestions({ ...questions, citizenship: val })} 
              />
              
              <NeuInputQuestion 
                num="2"
                label="Do you have any other country citizenship?" 
                placeholder="e.g. Canada, or 'No'"
                value={questions.otherCitizenship} 
                onChange={(val) => setQuestions({ ...questions, otherCitizenship: val })} 
              />

              <NeuRadioGroup 
                num="3"
                label="Are you disabled?" 
                value={questions.disabled} 
                onChange={(val) => setQuestions({ ...questions, disabled: val })} 
              />

              <NeuRadioGroup 
                num="4"
                label="Were you charged with any legal charges in the past?" 
                value={questions.legalCharges} 
                onChange={(val) => setQuestions({ ...questions, legalCharges: val })} 
              />

              {questions.legalCharges === true && (
                <div style={{ marginLeft: 32, marginTop: -8, marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    If yes, please state the details:
                  </label>
                  <input
                    type="text"
                    className="neu-input"
                    placeholder="Details regarding legal charges..."
                    value={questions.legalChargesDetails}
                    onChange={(e) => setQuestions({ ...questions, legalChargesDetails: e.target.value })}
                    style={{ width: '100%', maxWidth: 400, fontSize: 13, padding: '10px 14px' }}
                  />
                </div>
              )}

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button className="neu-button neu-button-primary" style={{ padding: '12px 32px', fontSize: 14, borderRadius: 24 }}>
                💾 Save Answers
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
