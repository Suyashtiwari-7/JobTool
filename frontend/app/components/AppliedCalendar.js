'use client';

import { useEffect, useState } from 'react';
import { getCalendarApplications } from '../lib/api';

/**
 * AppliedCalendar — Page 3: Applied Companies Table + Interactive Interview Calendar.
 * Shows real interview/response dates from the database instead of hardcoded demo data.
 */
export default function AppliedCalendar({
  applications,
  stats,
  onDeleteApplication,
  onTogglePin,
  onStatusChange,
  onNavigateToSchedules,
}) {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'applied'
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadCalendarEvents();
  }, []);

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

  // Applied applications list (status = applied, response_received, interview)
  const appliedList = applications.filter(
    (a) => ['applied', 'response_received', 'interview'].includes(a.status)
  );
  const filteredApplied = appliedSearch
    ? appliedList.filter((a) =>
        (a.job?.company || '').toLowerCase().includes(appliedSearch.toLowerCase()) ||
        (a.job?.title || '').toLowerCase().includes(appliedSearch.toLowerCase())
      )
    : appliedList;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* View Mode Toggle */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`neu-button ${viewMode === 'calendar' ? 'neu-button-primary' : ''}`}
          style={{ flex: 1, padding: '12px', fontSize: 14, fontWeight: 700, justifyContent: 'center' }}
        >
          📅 Interview Calendar
        </button>
        <button
          type="button"
          onClick={() => setViewMode('applied')}
          className={`neu-button ${viewMode === 'applied' ? 'neu-button-primary' : ''}`}
          style={{ flex: 1, padding: '12px', fontSize: 14, fontWeight: 700, justifyContent: 'center' }}
        >
          ✅ Applied Companies ({appliedList.length})
        </button>
      </div>

      {/* ═══ CALENDAR VIEW ═══ */}
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

          {calendarEvents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
              No scheduled interviews yet. When recruiters respond, dates will appear here automatically.
            </div>
          )}

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8 }}>
                {day}
              </div>
            ))}

            {/* Empty cells for days before the first of the month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 80 }} />
            ))}

            {/* Actual day cells */}
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
                    minHeight: 80,
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
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        color: ev.status === 'interview' ? 'var(--accent-purple)' : 'var(--accent-green)',
                        background: 'var(--bg-card)',
                        padding: '3px 6px',
                        borderRadius: 6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ev.status === 'interview' ? '📞' : '📩'} {ev.company}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ APPLIED COMPANIES TABLE VIEW ═══ */}
      {viewMode === 'applied' && (
        <div className="neu-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>✅ Applied Organizations & Applications</h3>
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
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              No applications found matching your search.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Company</th>
                    <th style={{ padding: '10px 12px' }}>Role & Source</th>
                    <th style={{ padding: '10px 12px' }}>🎯 Match</th>
                    <th style={{ padding: '10px 12px' }}>Applied Date</th>
                    <th style={{ padding: '10px 12px' }}>Retention</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplied.map((app) => {
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
                          <span style={{
                            fontSize: 12, fontWeight: 800,
                            color: (app.match_score || 0) >= 80 ? 'var(--accent-green)' : 'var(--text-accent)',
                            background: (app.match_score || 0) >= 80 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                            padding: '4px 10px', borderRadius: 12,
                          }}>
                            {Math.round(app.match_score || 0)}%
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {isNaN(appDate) ? 'Recently' : appDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: daysRemaining <= 7 ? 'var(--accent-red)' : 'var(--text-muted)',
                          }}>
                            {daysRemaining}d left
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                            color: app.status === 'interview' ? 'var(--accent-purple)' : app.status === 'applied' ? 'var(--accent-green)' : 'var(--text-secondary)',
                          }}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {app.job?.url && (
                              <a
                                href={app.job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="neu-button"
                                style={{ padding: '4px 8px', fontSize: 11, textDecoration: 'none' }}
                              >
                                🌐
                              </a>
                            )}
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
                              title="Delete"
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
    </div>
  );
}
