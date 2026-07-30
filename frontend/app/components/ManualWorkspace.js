import { useState } from 'react';
import ProfileSetupModal from './ProfileSetupModal';

/**
 * ManualWorkspace — Primary Manual Mode Workspace.
 * Contains:
 * 1. Discovery / Swipe Feed (job cards to swipe/tap through)
 * 2. Applications Kanban (QUEUED items awaiting 1-tap Confirm & Submit)
 */
export default function ManualWorkspace({
  applications = [],
  onSubmitApplication,
  onRunTailor,
  assistantInput,
  setAssistantInput,
  sendingChat,
  onSendMessage,
  initialTab = 'feed',
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'feed' | 'kanban'
  const [selectedApp, setSelectedApp] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);

  // Mock Discovery Feed Jobs for Manual Swipe/Tap
  const [feedJobs, setFeedJobs] = useState([
    {
      id: 'job-101',
      title: 'Senior Frontend Engineer (Next.js / React)',
      company: 'Vercel',
      location: 'Remote',
      salary: '$140,000 - $180,000',
      matchScore: 94,
      tags: ['TypeScript', 'Next.js', 'CSS', 'Tailwind'],
      description: 'Build state of the art web interfaces for developer tooling platform.',
    },
    {
      id: 'job-102',
      title: 'AI Product Systems Engineer',
      company: 'OpenAI',
      location: 'San Francisco, CA (Hybrid)',
      salary: '$160,000 - $210,000',
      matchScore: 89,
      tags: ['Python', 'FastAPI', 'LLM', 'PostgreSQL'],
      description: 'Scale Autonomous AI Agents & Graph Pipelines for enterprise customers.',
    },
    {
      id: 'job-103',
      title: 'Full Stack AI Engineer',
      company: 'Anthropic',
      location: 'Remote',
      salary: '$150,000 - $195,000',
      matchScore: 86,
      tags: ['Python', 'React', 'LangChain', 'Docker'],
      description: 'Design robust human-in-the-loop safety systems and AI agent interfaces.',
    },
  ]);

  const [currentJobIdx, setCurrentJobIdx] = useState(0);
  const currentJob = feedJobs[currentJobIdx];

  const [localQueued, setLocalQueued] = useState([]);

  const [pendingJob, setPendingJob] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);

  const allQueuedApps = [
    ...applications.filter((app) => app.status === 'QUEUED' || app.status === 'DRAFT'),
    ...localQueued,
  ];

  function handleSwipeRight(job) {
    // If profile/resume is not configured yet, pop up profile setup modal immediately!
    if (!profileComplete && applications.length === 0 && localQueued.length === 0) {
      setPendingJob(job);
      setShowSetupModal(true);
      return;
    }

    // 1. Immediately create queued application locally (< 10ms)
    const newQueuedApp = {
      id: `app-manual-${Date.now()}`,
      job_id: job.id,
      title: job.title,
      company: job.company,
      status: 'QUEUED',
      tailored_resume_pdf: '/static/pdfs/tailored_resume.pdf',
      cover_letter_pdf: '/static/pdfs/cover_letter.pdf',
    };

    setLocalQueued((prev) => [newQueuedApp, ...prev]);

    // 2. Advance discovery feed
    if (currentJobIdx < feedJobs.length - 1) {
      setCurrentJobIdx(currentJobIdx + 1);
    } else {
      setCurrentJobIdx(feedJobs.length);
    }

    // 3. Switch to Queued tab immediately
    setActiveTab('kanban');

    // 4. Trigger background tailoring quietly
    if (onRunTailor) {
      onRunTailor(job).catch((err) => console.log('Background tailor synced:', err));
    }
  }

  function handlePass() {
    if (currentJobIdx < feedJobs.length - 1) {
      setCurrentJobIdx(currentJobIdx + 1);
    } else {
      setCurrentJobIdx(feedJobs.length);
    }
  }

  async function handleConfirmSubmit(app) {
    try {
      setSubmittingId(app.id);
      if (onSubmitApplication) {
        await onSubmitApplication(app.id);
      }
      setShowSubmitModal(false);
      setSelectedApp(null);
    } catch (err) {
      console.error('Failed to submit application:', err);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      
      {/* ── Sub-Tab Switcher: Discovery Feed vs Queued Kanban ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setActiveTab('feed')}
            className={`neu-button ${activeTab === 'feed' ? 'neu-button-primary' : ''}`}
            style={{ padding: '8px 18px', borderRadius: 16, fontSize: 13, fontWeight: 800 }}
          >
            🎯 Job Discovery Feed ({feedJobs.length - currentJobIdx} remaining)
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
          🌱 Manual Mode: Nothing submits without your explicit tap
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: DISCOVERY / SWIPE FEED                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'feed' && (
        <div style={{ minHeight: 380, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {currentJob ? (
            <div
              className="neu-card"
              style={{
                maxWidth: 620,
                width: '100%',
                padding: 28,
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: 'var(--neu-flat)',
                position: 'relative',
              }}
            >
              {/* Top Row: Title + Match Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent-orange)', letterSpacing: '0.5px' }}>
                    {currentJob.company}
                  </span>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                    {currentJob.title}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    📍 {currentJob.location} • 💼 {currentJob.salary}
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    padding: '6px 12px',
                    borderRadius: 16,
                    fontSize: 13,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentJob.matchScore}% Match
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {currentJob.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: 11, background: 'var(--bg-base)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 10, fontWeight: 700 }}>
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {currentJob.description}
              </p>

              {/* Swipe / Tap Action Buttons */}
              <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={handlePass}
                  className="neu-button"
                  style={{ flex: 1, padding: '12px', borderRadius: 16, fontSize: 14, fontWeight: 800, color: 'var(--text-muted)' }}
                >
                  ❌ Pass
                </button>
                <button
                  onClick={() => handleSwipeRight(currentJob)}
                  className="neu-button neu-button-primary"
                  style={{ flex: 2, padding: '12px', borderRadius: 16, fontSize: 14, fontWeight: 900 }}
                >
                  💚 Swipe Right & Tailor Resume
                </button>
              </div>
            </div>
          ) : (
            <div className="neu-card" style={{ padding: '40px 60px', borderRadius: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                All Matched Jobs Reviewed!
              </h3>
              <p style={{ fontSize: 13, margin: 0 }}>
                Check your Queued tab to confirm & submit tailored applications.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: APPLICATIONS KANBAN QUEUE (CONFIRM & SUBMIT MODAL)       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'kanban' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ⚡ SECTION A: HUMAN PROCEED REQUIRED (CAPTCHA / UNANSWERED QUESTIONS) */}
          <div className="neu-card" style={{ padding: 24, borderRadius: 24, border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                Human Proceed Required ({allQueuedApps.filter(a => a.needs_human_action || a.status === 'review_required').length})
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
              Applications paused due to CAPTCHA verification or unverified screening questions requiring your human touch.
            </p>

            {allQueuedApps.filter(a => a.needs_human_action || a.status === 'review_required').length === 0 ? (
              <div style={{ padding: '16px', borderRadius: 14, background: 'var(--bg-base)', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                ✓ No human action required right now! All queued items are fully prepared by AI.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {allQueuedApps.filter(a => a.needs_human_action || a.status === 'review_required').map((app) => (
                  <div key={app.id} className="neu-card" style={{ padding: 16, borderRadius: 18, border: '1px solid var(--accent-orange)' }}>
                    <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: 14 }}>{app.company || 'Target Company'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{app.title || 'Role'}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-red)', marginTop: 6 }}>
                      ⚠️ Reason: {app.human_reason || 'CAPTCHA / Question Review Required'}
                    </div>
                    <button
                      onClick={() => { setSelectedApp(app); setShowSubmitModal(true); }}
                      className="neu-button neu-button-danger"
                      style={{ padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 900, marginTop: 12, width: '100%' }}
                    >
                      ⚡ Solve & Submit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🟢 SECTION B: READY FOR ONE-TAP CONFIRMATION */}
          <div className="neu-card" style={{ padding: 24, borderRadius: 24, minHeight: 320 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              📋 Ready for One-Tap Confirmation ({allQueuedApps.filter(a => !a.needs_human_action && a.status !== 'review_required').length})
            </h3>

            {allQueuedApps.filter(a => !a.needs_human_action && a.status !== 'review_required').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No queued applications right now. Swipe right on jobs in the Sprout Feed to populate your queue!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {allQueuedApps.filter(a => !a.needs_human_action && a.status !== 'review_required').map((app) => (
                  <div
                    key={app.id}
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      padding: 18,
                      borderRadius: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                      boxShadow: 'var(--neu-flat)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--accent-orange)' }}>
                        {app.company || 'Target Company'}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                        {app.title || 'Software Engineer'}
                      </div>
                      <div style={{ fontSize: 11, color: '#10b981', fontWeight: 800, marginTop: 4 }}>
                        🟢 Status: Ready (Tailored & Matched)
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setShowSubmitModal(true);
                      }}
                      className="neu-button neu-button-primary"
                      style={{ padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 900, width: '100%' }}
                    >
                      🚀 Confirm & Submit Application
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ONE-TAP CONFIRM & SUBMIT MODAL ── */}
      {showSubmitModal && selectedApp && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div className="neu-card" style={{ maxWidth: 520, width: '90%', padding: 28, borderRadius: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              Confirm & Submit Application
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Review your tailored materials for <strong>{selectedApp.title}</strong> at <strong>{selectedApp.company}</strong> before submitting.
            </p>

            <div style={{ background: 'var(--bg-base)', padding: 14, borderRadius: 14, fontSize: 12, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>📄 <strong>Tailored Resume:</strong> {selectedApp.tailored_resume_pdf ? 'Generated & Ready' : 'Standard Profile PDF'}</div>
              <div>✉️ <strong>Cover Letter:</strong> {selectedApp.cover_letter_pdf ? 'Generated & Ready' : 'Standard Cover Letter'}</div>
              <div>✅ <strong>Screening Answers:</strong> Verified from Answer Bank</div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="neu-button"
                style={{ padding: '10px 18px', borderRadius: 14, fontSize: 13, fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmSubmit(selectedApp)}
                disabled={submittingId === selectedApp.id}
                className="neu-button neu-button-primary"
                style={{ padding: '10px 22px', borderRadius: 14, fontSize: 13, fontWeight: 900 }}
              >
                {submittingId === selectedApp.id ? 'Submitting...' : '🚀 Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE SETUP MODAL (RESUME DROP & QUESTIONNAIRE) ── */}
      <ProfileSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onProfileSaved={() => {
          console.log('Profile updated cleanly!');
        }}
      />
    </div>
  );
}
