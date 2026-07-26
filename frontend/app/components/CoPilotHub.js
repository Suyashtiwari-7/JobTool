'use client';

import { useEffect, useRef, useState } from 'react';
import GlowingOrb from './GlowingOrb';

/**
 * CoPilotHub — Page 1: AI Co-Pilot Hub matching Canva sketch layout.
 * Features 3D Matrix Particle Sphere Orb, Futuristic Dual-Aura Input Bar, and Conversation/Memory Drawer.
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
}) {
  const chatEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'memories'
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [assistantChatHistory]);

  function handleVoiceToggle() {
    setIsVoiceActive(!isVoiceActive);
    if (!isVoiceActive) {
      onSendMessage("🎙️ [Voice Command Mode Activated]");
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, maxWidth: 960, margin: '0 auto', width: '100%' }}>
      {/* ── 3D Matrix Particle Sphere Orb Centerpiece ── */}
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <GlowingOrb
          onClick={() => setIsChatOpen(!isChatOpen)}
          isListening={sendingChat || isVoiceActive}
          activePrompt={assistantChatHistory[assistantChatHistory.length - 1]?.text}
        />
      </div>

      {/* ── Futuristic Dual Neon Aura Glowing Input Bar (Canva Sketch Input Box) ── */}
      <div
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'var(--bg-neu-inset)',
          padding: '16px 20px',
          boxShadow: '0 0 35px rgba(240, 94, 45, 0.2), 0 0 35px rgba(139, 92, 246, 0.2), inset 0 2px 4px rgba(255,255,255,0.05)',
          border: '1.5px solid transparent',
          backgroundImage: 'linear-gradient(var(--bg-neu-inset), var(--bg-neu-inset)), linear-gradient(135deg, #f05e2d 0%, #3b82f6 50%, #8b5cf6 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Main Text Area Input */}
        <textarea
          rows={2}
          value={assistantInput}
          onChange={(e) => setAssistantInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          placeholder="Ask anything or command Co-Pilot (e.g. 'Apply for Big Tech Apprenticeships everyday from 8am to 10am')..."
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

        {/* Bottom Toolbar inside Input Box */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 6 }}>
          {/* Left Action Pills */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="neu-button"
              style={{ width: 34, height: 34, padding: 0, borderRadius: '50%', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title="Add attachment or resume context"
            >
              ＋
            </button>

            {[
              '⚡ Enhance Prompt',
              '🎯 Target Scope',
              '🎓 Apprenticeship Mode',
              '🏛️ Big Tech Only',
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendMessage(`Set preference: ${chip.replace(/^[^\s]+\s/, '')}`)}
                className="neu-pill"
                style={{ fontSize: 11, padding: '5px 12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)' }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Voice Mic Mode Toggle Button */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`neu-button ${isVoiceActive ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                color: isVoiceActive ? 'var(--accent-orange)' : 'var(--text-secondary)',
                border: isVoiceActive ? '1px solid var(--accent-orange)' : '1px solid var(--border-subtle)',
                background: isVoiceActive ? 'rgba(240, 94, 45, 0.15)' : 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Toggle Voice Input Mode"
            >
              🎙️ {isVoiceActive ? 'Voice ON' : 'Voice'}
            </button>

            {/* Glowing Action Send Button */}
            <button
              type="button"
              onClick={() => onSendMessage()}
              disabled={sendingChat}
              style={{
                width: 40,
                height: 40,
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
              title="Send Command to Co-Pilot"
            >
              {sendingChat ? '...' : '🚀'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Expandable Dialogue & Memory Drawer Container ── */}
      <div className="neu-card" style={{ width: '100%', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Drawer Header Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`neu-button ${activeTab === 'chat' ? 'neu-button-primary' : ''}`}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700 }}
            >
              💬 Co-Pilot Dialogue ({assistantChatHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('memories')}
              className={`neu-button ${activeTab === 'memories' ? 'neu-button-primary' : ''}`}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700 }}
            >
              🧠 Stored Memory ({assistantMemories.length})
            </button>
          </div>

          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            JobTool AI v2.4 • Interactive Assistant
          </span>
        </div>

        {/* Tab 1: Chat Stream */}
        {activeTab === 'chat' && (
          <div className="neu-inset" style={{ height: 260, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 14 }}>
            {assistantChatHistory.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  background: msg.sender === 'user' ? 'var(--accent-blue-gradient)' : 'var(--bg-card)',
                  color: msg.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: 14,
                  fontSize: 13,
                  boxShadow: 'var(--neu-flat)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>{msg.text}</div>
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {msg.actions.map((act, aIdx) => (
                      <span key={aIdx} style={{ fontSize: 10, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                        ⚡ {act}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Tab 2: Saved Memory Cards */}
        {activeTab === 'memories' && (
          <div className="neu-inset" style={{ height: 260, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 14 }}>
            {assistantMemories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No stored memories yet. Tell the AI: &quot;My internship ends June 30&quot; to save dates automatically!
              </div>
            ) : (
              assistantMemories.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
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
                    style={{ padding: '4px 8px', fontSize: 10, color: 'var(--accent-red)' }}
                    title="Delete Memory"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
