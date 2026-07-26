'use client';

export default function GlowingOrb({ onClick, isListening, activePrompt }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <button
        type="button"
        onClick={onClick}
        className={`neu-button ${isListening ? 'pulse-active' : ''}`}
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f05e2d 0%, #d14115 100%)',
          boxShadow: isListening
            ? '0 0 25px rgba(240, 94, 45, 0.8), 10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light)'
            : '8px 8px 18px var(--neu-shadow-dark), -8px -8px 18px var(--neu-shadow-light)',
          border: '3px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
        title="Click to speak or type to AI Career Co-Pilot"
      >
        <span style={{ fontSize: 38, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🔮</span>
      </button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
          {isListening ? '🎙️ Listening / Ready for Commands...' : 'Click Glowing Orb to Command Co-Pilot'}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {activePrompt || 'Try: "Apply for Big Tech Apprenticeships everyday from 8am to 10am"'}
        </p>
      </div>
    </div>
  );
}
