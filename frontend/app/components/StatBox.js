'use client';

/**
 * StatBox — Neumorphic stat card used in the dashboard stats bar.
 * Supports optional click handler, highlight color, and badge text.
 */
export default function StatBox({ label, value, icon, highlight, onClick, badge }) {
  return (
    <div
      className={`neu-card ${onClick ? 'neu-card-hover' : ''}`}
      style={{ padding: '18px 20px', cursor: onClick ? 'pointer' : 'default', position: 'relative' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: highlight || 'var(--text-primary)' }}>
          {value}
        </div>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, color: highlight || 'var(--text-accent)', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: 10 }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
