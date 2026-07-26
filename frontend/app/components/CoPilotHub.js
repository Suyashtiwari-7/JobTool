'use client';

import { useEffect, useRef, useState } from 'react';
import GlowingOrb from './GlowingOrb';

/**
 * CoPilotHub — Page 1: Particle Orb + Dual Neon Input Bar workspace.
 * Theme aware (Black particles in light mode, White particles in dark mode).
 * Repositioned significantly higher up on screen for max visibility.
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

  // Check if chat has started (user sent a message or submitted)
  const chatStarted = userHasSubmitted || assistantChatHistory.length > 1;

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

  // Render the Input Bar Component for reusability
  const renderInputBar = () => (
    <div
      style={{
        width: '100%',
        borderRadius: 24,
        background: 'var(--bg-neu-inset)',
        padding: '14px 18px',
        boxShadow: '0 0 35px rgba(240, 94, 45, 0.2), 0 0 35px rgba(139, 92, 246, 0.2), inset 0 2px 4px rgba(255,255,255,0.05)',
        border: '1.5px solid transparent',
        backgroundImage: 'linear-gradient(var(--bg-neu-inset), var(--bg-neu-inset)), linear-gradient(135deg, #f05e2d 0%, #3b82f6 50%, #8b5cf6 100%)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
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
        placeholder="Ask anything or command Co-Pilot..."
        style={{
          width: '100%',
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

      {/* Bottom Toolbar inside Input Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {/* Left Action Pills */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="neu-button"
            style={{ width: 30, height: 30, padding: 0, borderRadius: '50%', fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Add attachment or resume context"
          >
            ＋
          </button>

          {[
            '⚡ Enhance Prompt',
            '🎯 Target Scope',
            '🎓 Apprenticeships',
            '🏛️ Big Tech Only',
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(`Set preference: ${chip.replace(/^[^\s]+\s/, '')}`)}
              className="neu-pill"
              style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)' }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`neu-button ${isVoiceActive ? 'active' : ''}`}
            style={{
              padding: '5px 10px',
              borderRadius: 18,
              fontSize: 11,
              fontWeight: 700,
              color: isVoiceActive ? 'var(--accent-orange)' : 'var(--text-secondary)',
              border: isVoiceActive ? '1px solid var(--accent-orange)' : '1px solid var(--border-subtle)',
              background: isVoiceActive ? 'rgba(240, 94, 45, 0.15)' : 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Toggle Voice Mic Mode"
          >
            🎙️ {isVoiceActive ? 'Voice ON' : 'Voice'}
          </button>

          {/* Glowing Send Button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={sendingChat}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.5)',
              transition: 'all 0.2s ease',
            }}
            title="Send Command"
          >
            {sendingChat ? '...' : '🚀'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)', maxWidth: 920, margin: '0 auto', width: '100%', position: 'relative' }}>
      
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* STATE 1: INITIAL HERO VIEW (MOVED SIGNIFICANTLY HIGHER UP)       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {!chatStarted ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, gap: 20, animation: 'fadeIn 0.4s ease' }}>
          {/* Particle Orb (High Upper Position with Theme Awareness) */}
          <div style={{ transform: 'scale(0.95)' }}>
            <GlowingOrb
              onClick={() => {
                setUserHasSubmitted(true);
                setIsChatOpen(!isChatOpen);
              }}
              isListening={sendingChat || isVoiceActive}
              theme={theme}
            />
          </div>

          {/* Dual Neon Chat Input Bar (Lifted Up directly below Orb) */}
          <div style={{ width: '100%', maxWidth: 840 }}>
            {renderInputBar()}
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════ */
        /* STATE 2: ACTIVE CHAT STREAM WORKSPACE (AFTER COMMAND)            */
        /* ════════════════════════════════════════════════════════════════ */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUpFade 0.4s ease-out', justifyContent: 'space-between' }}>
          {/* Top Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ transform: 'scale(0.38)', transformOrigin: 'left center', width: 100, height: 45, display: 'flex', alignItems: 'center' }}>
                <GlowingOrb
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  isListening={sendingChat || isVoiceActive}
                  theme={theme}
                />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  JobTool AI Co-Pilot
                </h2>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, marginTop: 1 }}>
                  Conversational Mode Active
                </p>
              </div>
            </div>

            {/* View Tab Switcher */}
            <div className="neu-inset" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14 }}>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`neu-button ${activeTab === 'chat' ? 'neu-button-primary' : ''}`}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10 }}
              >
                💬 Chat Stream ({assistantChatHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('memories')}
                className={`neu-button ${activeTab === 'memories' ? 'neu-button-primary' : ''}`}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10 }}
              >
                🧠 Stored Memory ({assistantMemories.length})
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
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    width: '100%',
                  }}
                >
                  {/* Message Bubble */}
                  <div
                    style={{
                      maxWidth: '80%',
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
