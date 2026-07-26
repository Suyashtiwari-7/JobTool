'use client';

import { useEffect, useRef } from 'react';
import GlowingOrb from './GlowingOrb';

/**
 * CoPilotHub — Page 1: AI Co-Pilot Hub with Glowing Orb, Chat Drawer, and Memory Panel.
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [assistantChatHistory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Glowing AI Orb Section */}
      <div className="neu-card" style={{ padding: '36px 24px', textAlign: 'center', background: 'var(--bg-neu-base)', position: 'relative' }}>
        <GlowingOrb
          onClick={() => setIsChatOpen(!isChatOpen)}
          isListening={sendingChat}
          activePrompt={assistantChatHistory[assistantChatHistory.length - 1]?.text}
        />

        {/* Quick Suggestion Prompt Chips */}
        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            '🎓 Target Big Tech Apprenticeships',
            '⏰ Apply everyday 8am-10am',
            '🚀 Target AI & Machine Learning roles',
            '🧠 My internship ends June 30',
          ].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(prompt)}
              className="neu-pill"
              style={{ fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* AI Co-Pilot Conversation & Memory Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        {/* Chat Drawer Panel */}
        <div className="neu-card" style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            💬 AI Assistant Dialogue
          </div>
          <div className="neu-inset" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            {assistantChatHistory.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSendMessage();
            }}
            style={{ display: 'flex', gap: 10 }}
          >
            <input
              type="text"
              placeholder="Type a command to your Co-Pilot..."
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              className="neu-input"
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={sendingChat} className="neu-button neu-button-primary">
              {sendingChat ? '...' : 'Send ➔'}
            </button>
          </form>
        </div>

        {/* Saved Memories Panel */}
        <div className="neu-card" style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🧠 Saved Profile Memory</span>
            <span style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 600 }}>{assistantMemories.length} Items</span>
          </div>
          <div className="neu-inset" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assistantMemories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No career memories stored yet.<br />Tell the Co-Pilot: &quot;My internship ends June 30&quot; to save dates!
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
                    title="Forget this memory"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
