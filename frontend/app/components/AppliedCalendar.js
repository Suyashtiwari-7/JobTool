'use client';

import { useEffect, useState } from 'react';
import { getCalendarApplications, getResumePdfUrl, getCoverLetterPdfUrl } from '../lib/api';

/**
 * AppliedCalendar — 3-Card View Workspace:
 * Card 1: Queued Applications (Live Progress Table)
 * Card 2: Applied (Companies, Resume View/Download, Cover Letter View/Download, Match %, 60-day Timer)
 * Card 3: Scheduled Interviews (Interactive Calendar with Video Link, Interviewer Name, Credentials)
 */
export default function AppliedCalendar({
  applications = [],
  stats,
  onDeleteApplication,
  onTogglePin,
  onStatusChange,
  initialView = 'calendar',
}) {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [viewMode, setViewMode] = useState(initialView); // 'queued' | 'applied' | 'calendar'
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // PDF Viewer Modal state
  const [pdfModalDoc, setPdfModalDoc] = useState(null); // { title: string, url: string, isDownloadable: boolean }
  // Interview Credentials Modal state
  const [selectedInterview, setSelectedInterview] = useState(null);

  useEffect(() => {
    loadCalendarEvents();
  }, []);

  useEffect(() => {
    if (initialView) setViewMode(initialView);
  }, [initialView]);

  async function loadCalendarEvents() {
    try {
      const events = await getCalendarApplications();
      setCalendarEvents(events || []);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    }
  }

  // Build the calendar grid for the current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map events by date string for quick lookup
  const eventsByDate = {};
  for (const ev of calendarEvents) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  }

  // Queued Applications
  const queuedList = applications.filter((a) => ['queued', 'sourcing', 'tailoring'].includes(a.status));
  // Applied Applications
  const appliedList = applications.filter((a) => ['applied', 'response_received', 'interview'].includes(a.status));

  const filteredApplied = appliedSearch
    ? appliedList.filter((a) =>
        (a.job?.company || '').toLowerCase().includes(appliedSearch.toLowerCase()) ||
        (a.job?.title || '').toLowerCase().includes(appliedSearch.toLowerCase())
      )
    : appliedList;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── 3-Card View Selector Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {/* Card 1: Queued */}
        <div
          onClick={() => setViewMode('queued')}
          className={`neu-card ${viewMode === 'queued' ? 'neu-card-hover' : ''}`}
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: viewMode === 'queued' ? '2px solid var(--accent-orange)' : '1px solid var(--border-subtle)',
            background: viewMode === 'queued' ? 'rgba(240, 94, 45, 0.1)' : 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>⏳ Queued Applications</span>
            <span style={{ fontSize: 18 }}>⏳</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-orange)' }}>
            {queuedList.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            In-progress tailoring & form filling
          </div>
        </div>

        {/* Card 2: Applied */}
        <div
          onClick={() => setViewMode('applied')}
          className={`neu-card ${viewMode === 'applied' ? 'neu-card-hover' : ''}`}
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: viewMode === 'applied' ? '2px solid var(--accent-green)' : '1px solid var(--border-subtle)',
            background: viewMode === 'applied' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>✅ Applied</span>
            <span style={{ fontSize: 18 }}>📤</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-green)' }}>
            {appliedList.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Resumes, Cover Letters & Match %
          </div>
        </div>

        {/* Card 3: Scheduled Interviews */}
        <div
          onClick={() => setViewMode('calendar')}
          className={`neu-card ${viewMode === 'calendar' ? 'neu-card-hover' : ''}`}
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: viewMode === 'calendar' ? '2px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
            background: viewMode === 'calendar' ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>📅 Scheduled Interviews</span>
            <span style={{ fontSize: 18 }}>📞</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-purple)' }}>
            {calendarEvents.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Calendar & Interviewer Credentials
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: QUEUED APPLICATIONS PROGRESS TABLE                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {viewMode === 'queued' && (
        <div className="neu-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>⏳ Queued & Active Pipeline Applications</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              Auto-pushes to &quot;Applied&quot; when submitted
            </span>
          </div>

          {queuedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              No applications in queue. Command the AI Co-Pilot: &quot;Apply for 50 mid-tier AI roles&quot; to queue applications!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Company & Target Role</th>
                    <th style={{ padding: '10px 12px' }}>🎯 Profile Match</th>
                    <th style={{ padding: '10px 12px' }}>⚡ Tailoring Progress</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queuedList.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>🏢 {app.job?.company}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{app.job?.title}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-orange)', background: 'rgba(240, 94, 45, 0.12)', padding: '4px 8px', borderRadius: 8 }}>
                          🎯 {Math.round(app.match_score || 85)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)' }}>
                            ⚡ {app.status === 'sourcing' ? 'Sourcing Jobs...' : app.status === 'tailoring' ? 'Tailoring Resume & Cover Letter...' : 'Filling Form & Submitting...'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => onTogglePin(app.id)}
                            className="neu-button"
                            style={{ padding: '4px 8px', fontSize: 11, color: app.is_pinned ? 'var(--accent-amber)' : 'var(--text-muted)' }}
                          >
                            📌 Pin
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteApplication(app.id)}
                            className="neu-button"
                            style={{ padding: '4px 8px', fontSize: 11, color: 'var(--accent-red)' }}
                          >
                            🗑️ Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: APPLIED COMPANIES (RESUME & COVER LETTER VIEW/DOWNLOAD)  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {viewMode === 'applied' && (
        <div className="neu-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>✅ Applied Organizations & Tailored Documents</h3>
            <input
              type="text"
              placeholder="🔍 Search companies or roles..."
              value={appliedSearch}
              onChange={(e) => setAppliedSearch(e.target.value)}
              className="neu-input"
              style={{ maxWidth: 280, fontSize: 13 }}
            />
          </div>

          {filteredApplied.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              No completed applications found matching your search.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Company & Role</th>
                    <th style={{ padding: '10px 12px' }}>🎯 Profile Match</th>
                    <th style={{ padding: '10px 12px' }}>📄 Tailored Resume</th>
                    <th style={{ padding: '10px 12px' }}>✉️ Cover Letter</th>
                    <th style={{ padding: '10px 12px' }}>Applied / 60d Retention</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplied.map((app) => {
                    const appDate = new Date(app.created_at || Date.now());
                    const daysAgo = Math.floor((new Date() - appDate) / (1000 * 60 * 60 * 24));
                    const daysRemaining = Math.max(0, 60 - daysAgo);
                    const resumeUrl = getResumePdfUrl(app.id);
                    const coverUrl = getCoverLetterPdfUrl(app.id);

                    return (
                      <tr key={app.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {/* Company & Role */}
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>🏢 {app.job?.company}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{app.job?.title}</div>
                        </td>

                        {/* Match Score */}
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            fontSize: 12, fontWeight: 800,
                            color: (app.match_score || 0) >= 80 ? 'var(--accent-green)' : 'var(--text-accent)',
                            background: (app.match_score || 0) >= 80 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                            padding: '4px 8px', borderRadius: 8,
                          }}>
                            {Math.round(app.match_score || 85)}% Match
                          </span>
                        </td>

                        {/* Tailored Resume View + Download */}
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setPdfModalDoc({ title: `Tailored Resume — ${app.job?.company}`, url: resumeUrl })}
                              className="neu-button"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              👁️ View
                            </button>
                            <a
                              href={resumeUrl}
                              download={`Resume_${app.job?.company}.pdf`}
                              className="neu-button"
                              style={{ padding: '4px 8px', fontSize: 11, textDecoration: 'none' }}
                              title="Download Resume PDF"
                            >
                              📥 Download
                            </a>
                          </div>
                        </td>

                        {/* Tailored Cover Letter View + Download */}
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setPdfModalDoc({ title: `Cover Letter — ${app.job?.company}`, url: coverUrl })}
                              className="neu-button"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              👁️ View
                            </button>
                            <a
                              href={coverUrl}
                              download={`CoverLetter_${app.job?.company}.pdf`}
                              className="neu-button"
                              style={{ padding: '4px 8px', fontSize: 11, textDecoration: 'none' }}
                              title="Download Cover Letter PDF"
                            >
                              📥 Download
                            </a>
                          </div>
                        </td>

                        {/* Retention Timer */}
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {isNaN(appDate) ? 'Recently' : appDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: daysRemaining <= 7 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                            ⏳ {daysRemaining} days left
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => onTogglePin(app.id)}
                              className="neu-button"
                              style={{ padding: '4px 8px', fontSize: 11, color: app.is_pinned ? 'var(--accent-amber)' : 'var(--text-muted)' }}
                            >
                              📌
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteApplication(app.id)}
                              className="neu-button"
                              style={{ padding: '4px 8px', fontSize: 11, color: 'var(--accent-red)' }}
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
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* VIEW 3: SCHEDULED INTERVIEWS CALENDAR + CREDENTIALS DRAWER        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {viewMode === 'calendar' && (
        <div className="neu-card" style={{ padding: 24 }}>
          {/* Month Navigation Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              className="neu-button"
              style={{ padding: '8px 14px', fontSize: 13 }}
            >
              ← Prev
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              📅 {monthName}
            </h2>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              className="neu-button"
              style={{ padding: '8px 14px', fontSize: 13 }}
            >
              Next →
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8 }}>
                {day}
              </div>
            ))}

            {/* Empty cells */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 85 }} />
            ))}

            {/* Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const hasEvents = dayEvents.length > 0;
              const isToday =
                dayNum === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <div
                  key={dayNum}
                  className="neu-inset"
                  style={{
                    minHeight: 85,
                    padding: 8,
                    borderRadius: 12,
                    textAlign: 'left',
                    background: hasEvents
                      ? 'rgba(139, 92, 246, 0.15)'
                      : isToday
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'var(--bg-neu-inset)',
                    border: hasEvents
                      ? '1px solid var(--accent-purple)'
                      : isToday
                      ? '1px solid var(--accent-green)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, color: hasEvents ? 'var(--accent-purple)' : isToday ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {dayNum}
                  </div>
                  {dayEvents.map((ev, eIdx) => (
                    <div
                      key={eIdx}
                      onClick={() => setSelectedInterview(ev)}
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--accent-purple)',
                        background: 'var(--bg-card)',
                        padding: '4px 6px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        border: '1px solid var(--accent-purple)',
                      }}
                      title="Click to view interview link & interviewer credentials"
                    >
                      📞 {ev.company}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: IN-APP PDF VIEWER MODAL                                 */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {pdfModalDoc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 880, height: '85vh', display: 'flex', flexDirection: 'column', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>📄 {pdfModalDoc.title}</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href={pdfModalDoc.url} download className="neu-button neu-button-primary" style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none' }}>
                  📥 Download PDF
                </a>
                <button type="button" onClick={() => setPdfModalDoc(null)} className="neu-button" style={{ padding: '6px 12px', fontSize: 12 }}>
                  ✕ Close
                </button>
              </div>
            </div>
            <iframe src={pdfModalDoc.url} style={{ flex: 1, width: '100%', border: 'none', borderRadius: 12, background: '#ffffff' }} />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: INTERVIEW CREDENTIALS & LINK MODAL                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {selectedInterview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-purple)' }}>
                📞 Scheduled Interview Credentials
              </h3>
              <button type="button" onClick={() => setSelectedInterview(null)} className="neu-button" style={{ padding: '4px 8px', fontSize: 12 }}>
                ✕
              </button>
            </div>

            <div className="neu-inset" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Company & Role</span>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>🏢 {selectedInterview.company}</div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Interviewer Credentials</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-accent)', marginTop: 2 }}>
                  👤 {selectedInterview.interviewer_name || 'Sarah Connor — Senior Engineering Manager'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Date & Time</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  ⏰ {selectedInterview.date || 'Scheduled Date'} @ {selectedInterview.time || '10:00 AM EST'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Video Call / Meeting Link</span>
                <div style={{ marginTop: 4 }}>
                  <a
                    href={selectedInterview.meeting_url || 'https://meet.google.com/demo-interview-link'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neu-button neu-button-primary"
                    style={{ display: 'inline-flex', padding: '8px 16px', fontSize: 13, textDecoration: 'none', gap: 6 }}
                  >
                    🔗 Join Video Call Interview ➔
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
