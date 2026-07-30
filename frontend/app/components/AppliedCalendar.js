'use client';

import { useEffect, useState } from 'react';
import { getCalendarApplications, getResumePdfUrl, getCoverLetterPdfUrl, getAssistantSchedules, createAssistantSchedule, toggleAssistantSchedule, deleteAssistantSchedule } from '../lib/api';

/**
 * AppliedCalendar — Neumorphic Capsule Switch Workspace:
 * Features a sleek capsule toggle switch (matching exact user screenshot).
 * Option 1: Queued Applications (Live Progress Table)
 * Option 2: Applied (Companies, Resume View/Download, Cover Letter View/Download, Match %, 60-day Timer)
 * Option 3: Scheduled Interviews (Interactive Calendar with Video Link, Interviewer Name, Credentials)
 */
export default function AppliedCalendar({
  applications = [],
  stats,
  onDeleteApplication,
  onTogglePin,
  onStatusChange,
  initialView = 'calendar',
  hideCapsule = false,
}) {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [viewMode, setViewMode] = useState(initialView); // 'queued' | 'applied' | 'calendar' | 'tasks'
  const [appliedSearch, setAppliedSearch] = useState('');
  
  // Scheduled Tasks state
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', start_time: '08:00', end_time: '10:00',
    days_of_week: ['Mon', 'Tue', 'Wed'], repeat_type: 'daily', target_count: 10, keywords: ''
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // PDF Viewer Modal state
  const [pdfModalDoc, setPdfModalDoc] = useState(null); // { title: string, url: string }
  // Interview Credentials Modal state
  const [selectedInterview, setSelectedInterview] = useState(null);

  useEffect(() => {
    loadCalendarEvents();
    loadScheduledTasks();
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

  async function loadScheduledTasks() {
    try {
      const tasks = await getAssistantSchedules();
      setScheduledTasks(tasks || []);
    } catch (err) {
      console.error('Failed to load scheduled tasks:', err);
    }
  }

  async function handleCreateTask() {
    try {
      const payload = {
        ...newTask,
        keywords: newTask.keywords ? newTask.keywords.split(',').map(k => k.trim()).filter(Boolean) : null,
      };
      await createAssistantSchedule(payload);
      setShowCreateTask(false);
      setNewTask({ title: '', start_time: '08:00', end_time: '10:00', days_of_week: ['Mon', 'Tue', 'Wed'], repeat_type: 'daily', target_count: 10, keywords: '' });
      await loadScheduledTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }

  async function handleToggleTask(id) {
    try {
      await toggleAssistantSchedule(id);
      await loadScheduledTasks();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  }

  async function handleDeleteTask(id) {
    try {
      await deleteAssistantSchedule(id);
      await loadScheduledTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
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
      
      {/* ── CAPSULE SWITCHER (SCHEDULED INTERVIEWS & SCHEDULED TASKS) ── */}
      {!hideCapsule && (
        <div
          className="neu-card"
          style={{
            display: 'flex',
            padding: 6,
            borderRadius: 30,
            background: 'var(--bg-base)',
            boxShadow: 'var(--neu-pressed)',
            maxWidth: 620,
            margin: '0 auto 24px auto',
          }}
        >
          {/* Segment 1: Scheduled Interviews */}
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 24,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              background: viewMode === 'calendar' ? 'var(--bg-card)' : 'transparent',
              boxShadow: viewMode === 'calendar' ? 'var(--neu-flat)' : 'none',
              color: viewMode === 'calendar' ? 'var(--accent-purple)' : 'var(--text-muted)',
            }}
          >
            <span>📅 Scheduled Interviews</span>
            <span style={{ fontSize: 11, background: viewMode === 'calendar' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 12 }}>
              {calendarEvents.length}
            </span>
          </button>

          {/* Segment 2: Scheduled Tasks */}
          <button
            type="button"
            onClick={() => setViewMode('tasks')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 24,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              background: viewMode === 'tasks' ? 'var(--bg-card)' : 'transparent',
              boxShadow: viewMode === 'tasks' ? 'var(--neu-flat)' : 'none',
              color: viewMode === 'tasks' ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}
          >
            <span>⏰ Scheduled Tasks</span>
            <span style={{ fontSize: 11, background: viewMode === 'tasks' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 12 }}>
              {scheduledTasks.filter(t => t.status === 'active').length}
            </span>
          </button>
        </div>
      )}

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
                        {(() => {
                          const createdTime = new Date(app.created_at || Date.now()).getTime();
                          const nowTime = Date.now();
                          const diffMinutes = Math.floor((nowTime - createdTime) / (1000 * 60));
                          const inGracePeriod = diffMinutes < 30;
                          const remainingMins = Math.max(0, 30 - diffMinutes);

                          return (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {inGracePeriod && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-orange)', background: 'rgba(245, 158, 11, 0.15)', padding: '3px 8px', borderRadius: 10 }}>
                                  ⏱️ Review Grace Period ({remainingMins}m)
                                </span>
                              )}
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
                                title={inGracePeriod ? "Cancel before submission" : "Remove application"}
                              >
                                🗑️ {inGracePeriod ? 'Cancel' : 'Delete'}
                              </button>
                            </div>
                          );
                        })()}
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

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* VIEW 4: SCHEDULED AUTOMATION TASKS                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {viewMode === 'tasks' && (
        <div className="neu-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>⏰ Scheduled Automation Tasks</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Set recurring tasks that run automatically. 💡 <em>Tip: Applications submitted Mon-Wed mornings get 2x more recruiter views.</em>
              </p>
            </div>
            <button
              onClick={() => setShowCreateTask(!showCreateTask)}
              className="neu-button neu-button-primary"
              style={{ padding: '10px 18px', fontSize: 18, borderRadius: '50%', width: 44, height: 44 }}
              title="Create New Scheduled Task"
            >
              {showCreateTask ? '✕' : '+'}
            </button>
          </div>

          {/* Create New Task Form */}
          {showCreateTask && (
            <div className="neu-inset" style={{ padding: 24, borderRadius: 16, marginBottom: 24, border: '1px solid var(--accent-blue)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-blue)', marginBottom: 16, margin: '0 0 16px 0' }}>📝 New Scheduled Task</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Task Title</label>
                  <input className="neu-input" type="text" placeholder="e.g. Morning AI Role Applications" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} style={{ width: '100%', fontSize: 13, padding: '10px 14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Start Time</label>
                  <input className="neu-input" type="time" value={newTask.start_time} onChange={(e) => setNewTask({ ...newTask, start_time: e.target.value })} style={{ width: '100%', fontSize: 13, padding: '10px 14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>End Time</label>
                  <input className="neu-input" type="time" value={newTask.end_time} onChange={(e) => setNewTask({ ...newTask, end_time: e.target.value })} style={{ width: '100%', fontSize: 13, padding: '10px 14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Target Apps Per Run</label>
                  <input className="neu-input" type="number" min="1" max="100" value={newTask.target_count} onChange={(e) => setNewTask({ ...newTask, target_count: parseInt(e.target.value) || 10 })} style={{ width: '100%', fontSize: 13, padding: '10px 14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Repeat</label>
                  <select className="neu-input" value={newTask.repeat_type} onChange={(e) => setNewTask({ ...newTask, repeat_type: e.target.value })} style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom Days</option>
                    <option value="once">Run Once</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Days of Week</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                      const isSelected = (newTask.days_of_week || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const current = newTask.days_of_week || [];
                            setNewTask({
                              ...newTask,
                              days_of_week: isSelected ? current.filter(d => d !== day) : [...current, day]
                            });
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 800,
                            background: isSelected ? 'var(--accent-blue)' : 'var(--bg-neu-inset)',
                            color: isSelected ? '#fff' : 'var(--text-muted)',
                            boxShadow: isSelected ? 'var(--neu-flat)' : 'var(--neu-pressed)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Keywords (comma separated)</label>
                  <input className="neu-input" type="text" placeholder="e.g. AI Engineer, ML Engineer, Data Scientist" value={newTask.keywords} onChange={(e) => setNewTask({ ...newTask, keywords: e.target.value })} style={{ width: '100%', fontSize: 13, padding: '10px 14px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
                <button onClick={() => setShowCreateTask(false)} className="neu-button" style={{ padding: '10px 20px', fontSize: 13, borderRadius: 16 }}>Cancel</button>
                <button onClick={handleCreateTask} className="neu-button neu-button-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 16 }} disabled={!newTask.title}>
                  🚀 Create Task
                </button>
              </div>
            </div>
          )}

          {/* Task List */}
          {scheduledTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              No scheduled tasks yet. Click the <strong>+</strong> button above to create your first automated job application schedule!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {scheduledTasks.map(task => (
                <div key={task.id} className="neu-card" style={{ padding: '16px 20px', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: task.status === 'active' ? 'var(--accent-green)' : task.status === 'paused' ? 'var(--accent-orange)' : 'var(--text-muted)',
                        display: 'inline-block',
                      }} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{task.title}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        background: task.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: task.status === 'active' ? 'var(--accent-green)' : 'var(--accent-orange)',
                        padding: '2px 8px', borderRadius: 8,
                      }}>
                        {task.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>🕐 {task.start_time} – {task.end_time}</span>
                      <span>🔄 {task.repeat_type}</span>
                      <span>🎯 {task.target_count || 10} apps/run</span>
                      {task.days_of_week && <span>📅 {task.days_of_week.join(', ')}</span>}
                      <span>📊 {task.total_runs || 0} runs completed</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleToggleTask(task.id)} className="neu-button" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 12 }}>
                      {task.status === 'active' ? '⏸️' : '▶️'}
                    </button>
                    <button onClick={() => handleDeleteTask(task.id)} className="neu-button" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 12, color: 'var(--accent-red)' }}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
