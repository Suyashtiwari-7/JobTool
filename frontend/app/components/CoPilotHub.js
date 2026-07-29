'use client';

import { useEffect, useRef, useState } from 'react';
import GlowingOrb from './GlowingOrb';
import { getAgentStatus, pauseAgent, resumeAgent } from '../lib/api';

/**
 * CoPilotHub — Page 1: Ultra-clean Instagram DM & ChatGPT style AI Co-Pilot workspace.
 * Minimalist input bar with voice button and glowing send action button.
 */
export default function CoPilotHub({
  assistantChatHistory,
  assistantInput,
  setAssistantInput,
  assistantMemories,
  sendingChat,
  onSendMessage,
  onDeleteMemory,
  isChatOpen,
  setIsChatOpen,
  theme = 'dark',
}) {
  const chatEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'memories'
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [userHasSubmitted, setUserHasSubmitted] = useState(false);
  const [showStream, setShowStream] = useState(false);

  // Agent Kill Switch State
  const [agentStatus, setAgentStatus] = useState({ is_running: false, paused_reason: '' });
  const [loadingAgentStatus, setLoadingAgentStatus] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchAgentStatus() {
    try {
      const res = await getAgentStatus();
      setAgentStatus(res);
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
      setAgentStatus({ is_running: false, paused_reason: 'Status unknown (Backend unreachable)' });
    } finally {
      setLoadingAgentStatus(false);
    }
  }

  async function handlePauseClick() {
    try {
      setTogglingStatus(true);
      const res = await pauseAgent('User initiated pause from Kill Switch');
      setAgentStatus(res);
    } catch (err) {
      console.error('Failed to pause agent:', err);
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleConfirmResume() {
    try {
      setTogglingStatus(true);
      const res = await resumeAgent();
      setAgentStatus(res);
      setShowResumeModal(false);
    } catch (err) {
      console.error('Failed to resume agent:', err);
    } finally {
      setTogglingStatus(false);
    }
  }

  // Check if chat has started (user sent a message or manually expanded stream)
  const chatStarted = userHasSubmitted || showStream;

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && chatStarted) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [assistantChatHistory, chatStarted]);

  function handleVoiceToggle() {
    setIsVoiceActive(!isVoiceActive);
    if (!isVoiceActive) {
      setUserHasSubmitted(true);
      onSendMessage('🎙️ [Voice Command Mode Activated]');
    }
  }

  function handleSend(customText) {
    setUserHasSubmitted(true);
    onSendMessage(customText);
  }

  function handleCopyText(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  // Render the Clean Docked Input Bar Component
  const renderInputBar = () => (
    <div
      style={{
        width: '100%',
        borderRadius: 24,
        background: 'var(--bg-neu-inset)',
        padding: '14px 18px',
        boxShadow: 'var(--neu-pressed)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Main Text Input */}
      <textarea
        rows={1}
        value={assistantInput}
        onChange={(e) => setAssistantInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Ask Co-Pilot to search jobs or prepare applications..."
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontWeight: 500,
          resize: 'none',
          fontFamily: 'inherit',
        }}
      />

      {/* Glowing Send Button */}
      <button
        type="button"
        onClick={() => handleSend()}
        disabled={sendingChat}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #f05e2d 0%, #3b82f6 100%)',
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: 'var(--neu-flat)',
          transition: 'all 0.2s ease',
        }}
        title="Send Command"
      >
        {sendingChat ? '...' : '🚀'}
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)', maxWidth: 920, margin: '0 auto', width: '100%', position: 'relative' }}>
      
      {/* ── AGENT STATUS BAR & KILL SWITCH ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', borderRadius: 20, marginBottom: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--neu-flat)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            background: agentStatus.is_running ? '#10b981' : '#f59e0b',
            boxShadow: agentStatus.is_running ? '0 0 10px #10b981' : '0 0 10px #f59e0b'
          }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
              {loadingAgentStatus ? 'Checking Agent Status...' : (agentStatus.is_running ? '🟢 Agent Live & Autonomous' : '⏸ Agent Paused (Kill Switch Active)')}
            </span>
            {agentStatus.paused_reason && !agentStatus.is_running && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                ({agentStatus.paused_reason})
              </span>
            )}
          </div>
        </div>

        <div>
          {agentStatus.is_running ? (
            <button
              onClick={handlePauseClick}
              disabled={togglingStatus}
              className="neu-button"
              style={{ padding: '6px 14px', borderRadius: 14, fontSize: 12, fontWeight: 800, color: 'var(--accent-red)' }}
            >
              {togglingStatus ? 'Pausing...' : '⏸ Pause Agent'}
            </button>
          ) : (
            <button
              onClick={() => setShowResumeModal(true)}
              disabled={togglingStatus}
              className="neu-button neu-button-primary"
              style={{ padding: '6px 14px', borderRadius: 14, fontSize: 12, fontWeight: 800 }}
            >
              ▶ Resume Agent
            </button>
          )}
        </div>
      </div>

      {/* ── RESUME CONFIRMATION MODAL ── */}
      {showResumeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="neu-card" style={{ maxWidth: 440, width: '90%', padding: 28, borderRadius: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              Confirm Autonomous Resume
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Resuming will allow the AI Agent to autonomously source, score, tailor, and create job applications in the background according to your guardrails.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowResumeModal(false)}
                className="neu-button"
                style={{ padding: '10px 20px', borderRadius: 16, fontSize: 13, fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResume}
                disabled={togglingStatus}
                className="neu-button neu-button-primary"
                style={{ padding: '10px 24px', borderRadius: 16, fontSize: 13, fontWeight: 800 }}
              >
                {togglingStatus ? 'Resuming...' : '✅ Yes, Confirm Resume'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* STATE 1: INITIAL HERO VIEW (ORB UP + CLEAN CHAT BAR AT CENTER)   */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {!chatStarted ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, gap: 24, animation: 'fadeIn 0.4s ease' }}>
          {/* Particle Orb */}
          <div style={{ transform: 'scale(0.95)' }}>
            <GlowingOrb
              onClick={() => {
                setShowStream(true);
              }}
              isListening={sendingChat || isVoiceActive}
              theme={theme}
              size={260}
            />
          </div>

          {/* Dual Neon Chat Input Bar */}
          <div style={{ width: '100%', maxWidth: 840, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {renderInputBar()}

            {assistantChatHistory && assistantChatHistory.length > 1 && (
              <button
                type="button"
                onClick={() => setShowStream(true)}
                className="neu-button"
                style={{ padding: '8px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}
              >
                💬 View Conversation Stream ({assistantChatHistory.length} messages) ➔
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════ */
        /* STATE 2: INSTAGRAM DM STYLE ACTIVE CHAT WORKSPACE                */
        /* ════════════════════════════════════════════════════════════════ */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUpFade 0.4s ease-out', justifyContent: 'space-between' }}>
          
          {/* ── Instagram DM Style Chat Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '6px 12px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--neu-flat)', flexShrink: 0 }}>
            {/* Instagram Style Profile Avatar + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <GlowingOrb
                onClick={() => setIsChatOpen(!isChatOpen)}
                isListening={sendingChat || isVoiceActive}
                theme={theme}
                size={44}
              />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  JobTool AI Co-Pilot
                </h2>
                <p style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 700, margin: 0, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>🟢 Active Co-Pilot</span>
                </p>
              </div>
            </div>

            {/* View Tab Switcher */}
            <div className="neu-inset" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12 }}>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`neu-button ${activeTab === 'chat' ? 'neu-button-primary' : ''}`}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10 }}
              >
                💬 Chat ({assistantChatHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('memories')}
                className={`neu-button ${activeTab === 'memories' ? 'neu-button-primary' : ''}`}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10 }}
              >
                🧠 Memory ({assistantMemories.length})
              </button>
            </div>
          </div>

          {/* Central Chat Stream */}
          {activeTab === 'chat' && (
            <div
              className="neu-card"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                marginBottom: 16,
                borderRadius: 20,
                background: 'var(--bg-neu-base)',
              }}
            >
              {assistantChatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  {/* Instagram DM Assistant Message Avatar */}
                  {msg.sender === 'assistant' && (
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      <GlowingOrb
                        isListening={sendingChat}
                        theme={theme}
                        size={32}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                    {/* Message Bubble */}
                    <div
                      style={{
                        background: msg.sender === 'user' ? 'var(--accent-blue-gradient)' : 'var(--bg-card)',
                        color: msg.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
                        padding: '14px 18px',
                        borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                        fontSize: 14,
                        lineHeight: 1.6,
                        boxShadow: 'var(--neu-flat)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                      {/* Actions Taken Badges */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          {msg.actions.map((act, aIdx) => (
                            <span key={aIdx} style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                              ⚡ {act}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assistant Message Actions Toolbar (Copy / Retry) */}
                    {msg.sender === 'assistant' && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 6, paddingLeft: 4, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.text, idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Copy response text"
                        >
                          {copiedIdx === idx ? '✓ Copied' : '📋 Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSend("Retry previous request")}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Regenerate response"
                        >
                          🔄 Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Stored Memory Tab */}
          {activeTab === 'memories' && (
            <div
              className="neu-card"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 16,
                borderRadius: 20,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🧠 Stored Career Memory ({assistantMemories.length})</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-retrieved during pipeline execution</span>
              </div>

              {assistantMemories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No stored memories yet. Tell the AI: &quot;My internship ends June 30&quot; to save key dates automatically!
                </div>
              ) : (
                assistantMemories.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-neu-inset)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)', textTransform: 'capitalize' }}>
                        {m.memory_key} ({m.category})
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
                        {m.memory_value}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteMemory(m.id)}
                      className="neu-button"
                      style={{ padding: '6px 10px', fontSize: 11, color: 'var(--accent-red)' }}
                      title="Forget Memory"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Bottom-Pinned Input Bar for Active Chat Mode */}
          <div style={{ flexShrink: 0 }}>
            {renderInputBar()}
          </div>
        </div>
      )}
    </div>
  );
}
