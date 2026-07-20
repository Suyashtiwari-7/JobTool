'use client';

import { useEffect, useState, useRef } from 'react';
import AuthLayout from '../components/AuthLayout';
import { getResume, uploadResume } from '../lib/api';

export default function ResumePage() {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    loadResume();
  }, []);

  async function loadResume() {
    try {
      const data = await getResume();
      setResume(data);
    } catch (err) {
      // No resume uploaded yet — that's fine
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const data = await uploadResume(file);
      setResume(data);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleUpload(file);
  }

  const parsed = resume?.parsed_json;

  return (
    <AuthLayout>
      <div className="page-header">
        <h1 className="page-title">Resume</h1>
        <p className="page-subtitle">Upload your resume once — it will be used for all applications</p>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading resume...</span>
        </div>
      ) : (
        <>
          {/* Upload Area */}
          <div
            className={`upload-area ${dragging ? 'dragging' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ marginBottom: 24 }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => handleUpload(e.target.files[0])}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <>
                <div className="loading-spinner" style={{ width: 40, height: 40, marginBottom: 16 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  Parsing resume with AI... This may take a moment.
                </p>
              </>
            ) : (
              <>
                <div className="upload-icon">📄</div>
                <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {resume ? 'Upload a new resume' : 'Drop your resume here or click to browse'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Supports PDF and DOCX (max 10 MB)
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent-red)' }}>
              <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>❌ {error}</p>
            </div>
          )}

          {/* Parsed Resume Preview */}
          {parsed && (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <h2 className="card-title">👤 {parsed.name || 'Unknown'}</h2>
                  <span className="status-badge status-applied">Parsed</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {parsed.email && <span>📧 {parsed.email}</span>}
                  {parsed.phone && <span>📱 {parsed.phone}</span>}
                  {parsed.location && <span>📍 {parsed.location}</span>}
                </div>
                {parsed.summary && (
                  <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {parsed.summary}
                  </p>
                )}
              </div>

              {/* Skills */}
              {parsed.skills && parsed.skills.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 className="card-title" style={{ marginBottom: 12 }}>🛠️ Skills</h3>
                  <div className="chip-container">
                    {parsed.skills.map((skill, i) => (
                      <span key={i} className="chip selected">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {parsed.experience && parsed.experience.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 className="card-title" style={{ marginBottom: 16 }}>💼 Experience</h3>
                  {parsed.experience.map((exp, i) => (
                    <div key={i} style={{ marginBottom: i < parsed.experience.length - 1 ? 20 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{exp.title}</span>
                          <span style={{ color: 'var(--text-accent)', marginLeft: 8, fontSize: 13 }}>{exp.company}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {exp.start_date} — {exp.end_date}
                        </span>
                      </div>
                      {exp.bullets && (
                        <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                          {exp.bullets.map((bullet, j) => (
                            <li key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {parsed.education && parsed.education.length > 0 && (
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: 12 }}>🎓 Education</h3>
                  {parsed.education.map((edu, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{edu.degree}</span>
                      {edu.field && <span style={{ color: 'var(--text-secondary)' }}> in {edu.field}</span>}
                      <br />
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {edu.institution} {edu.year && `(${edu.year})`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </AuthLayout>
  );
}
