'use client';

import { useEffect, useRef, useState } from 'react';
import GlowingOrb from './GlowingOrb';

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

  // Render the Clean Minimalist Input Bar Component
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
        placeholder="Ask anything or command Co-Pilot..."
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

      {/* Action Buttons: Voice + Send */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {/* Voice Mic Button */}
        <button
          type="button"
          onClick={handleVoiceToggle}
          className={`neu-button ${isVoiceActive ? 'active' : ''}`}
          style={{
            padding: '6px 12px',
            borderRadius: 18,
            fontSize: 12,
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
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.5)',
            transition: 'all 0.2s ease',
          }}
          title="Send Command"
        >
          {sendingChat ? '...' : '🚀'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)', maxWidth: 920, margin: '0 auto', width: '100%', position: 'relative' }}>
      
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
