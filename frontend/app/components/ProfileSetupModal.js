'use client';

import { useState } from 'react';
import { uploadResume, updateProfileField } from '../lib/api';

/**
 * ProfileSetupModal — Predefined Questionnaire + Drag & Drop Resume Upload.
 * Appears when user attempts to apply without profile info. Auto-saves to profile.
 */
export default function ProfileSetupModal({ isOpen, onClose, onProfileSaved }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleLabel, setRoleLabel] = useState('');

  // Questionnaire state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    current_role: '',
    experience_years: '3',
    disability: 'No',
    work_auth: 'Authorized to work',
    sponsorship: 'No',
  });

  if (!isOpen) return null;

  const [parsing, setParsing] = useState(false);

  async function processResumeFile(selectedFile) {
    setFile(selectedFile);
    try {
      setParsing(true);
      const res = await uploadResume(selectedFile, 'Baseline Resume');
      if (res && res.parsed_json) {
        const p = res.parsed_json;
        setFormData((prev) => ({
          ...prev,
          full_name: p.name || prev.full_name,
          email: p.email || prev.email,
          phone: p.phone || prev.phone,
          location: p.location || prev.location,
          current_role: (p.experience && p.experience[0]?.title) || p.summary?.slice(0, 30) || prev.current_role,
        }));
      }
    } catch (err) {
      console.warn('Resume parsing notice:', err);
    } finally {
      setParsing(false);
    }
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processResumeFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      processResumeFile(e.target.files[0]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);

      // 1. Upload Resume if selected
      if (file) {
        await uploadResume(file, roleLabel || formData.current_role || 'Primary Resume');
      }

      // 2. Save profile fields to database
      for (const [key, val] of Object.entries(formData)) {
        if (val) {
          await updateProfileField(key, val);
        }
      }

      if (onProfileSaved) {
        onProfileSaved();
      }

      onClose();
    } catch (err) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="neu-card"
        style={{
          maxWidth: 580,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 28,
          borderRadius: 24,
          boxShadow: 'var(--neu-flat)',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              🚀 Complete Your Career Profile
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Drop your resume & answer these 6 quick questions. We will save it to your profile for 1-tap applications.
            </p>
          </div>
          <button
            onClick={onClose}
            className="neu-button"
            style={{ padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── DRAG & DROP RESUME BOX ── */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              📄 Upload Baseline Resume (PDF / DOCX)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              style={{
                border: isDragging ? '2px dashed var(--accent-orange)' : '2px dashed var(--border-subtle)',
                background: isDragging ? 'rgba(240, 94, 45, 0.1)' : 'var(--bg-base)',
                borderRadius: 16,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => document.getElementById('modal-resume-file-input').click()}
            >
              <input
                id="modal-resume-file-input"
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <div style={{ fontSize: 28, marginBottom: 6 }}>📥</div>
              {file ? (
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-green)' }}>
                  ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Drag & Drop your resume here, or click to browse
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Supports PDF, DOCX up to 10MB
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── PREDEFINED QUESTIONNAIRE ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Full Name</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Target Role Title</label>
              <input
                type="text"
                required
                value={formData.current_role}
                onChange={(e) => setFormData({ ...formData, current_role: e.target.value })}
                placeholder="Senior Frontend Engineer"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Location</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="San Francisco, CA or Remote"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Require Visa Sponsorship?</label>
              <select
                value={formData.sponsorship}
                onChange={(e) => setFormData({ ...formData, sponsorship: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Years of Experience</label>
              <select
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                <option value="0-1">0-1 Years (Junior)</option>
                <option value="2-4">2-4 Years (Mid Level)</option>
                <option value="5-8">5-8 Years (Senior)</option>
                <option value="8+">8+ Years (Staff / Lead)</option>
              </select>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              className="neu-button"
              style={{ padding: '10px 18px', borderRadius: 14, fontSize: 13, fontWeight: 700 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="neu-button neu-button-primary"
              style={{ padding: '10px 24px', borderRadius: 14, fontSize: 13, fontWeight: 900 }}
            >
              {saving ? 'Saving Profile...' : '💾 Save Profile & Start Applying'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
