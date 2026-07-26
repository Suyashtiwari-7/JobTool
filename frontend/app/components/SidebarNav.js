'use client';

/**
 * SidebarNav — Floating Capsule Vertical Navigation Bar.
 * Strictly limited to the last button with zero extra tail or stretching.
 */
export default function SidebarNav({ activePage, setActivePage }) {
  const navItems = [
    { id: 'hub', label: 'Co-Pilot Hub', icon: '🔮' },
    { id: 'schedules', label: 'Automation & Queue', icon: '🎛️' },
    { id: 'calendar', label: 'Applied & Calendar', icon: '📅' },
  ];

  return (
    <aside
      className="neu-card"
      style={{
        width: 66,
        height: 'auto',
        maxHeight: 'fit-content',
        alignSelf: 'flex-start',
        margin: '24px 0 0 20px',
        padding: '14px 6px 16px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        borderRadius: 28,
        zIndex: 100,
        boxShadow: 'var(--neu-flat)',
        flexShrink: 0,
      }}
    >
      {/* VS Code Style Branding Symbol */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          background: 'var(--accent-blue-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: 18,
          boxShadow: 'var(--neu-flat)',
          marginBottom: 2,
        }}
        title="JobTool AI Engine"
      >
        ⚡
      </div>

      {/* Nav Icons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={`neu-button ${isActive ? 'active' : ''}`}
              style={{
                width: 42,
                height: 42,
                padding: 0,
                borderRadius: 14,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                background: isActive ? 'rgba(240, 94, 45, 0.15)' : 'var(--bg-card)',
                border: isActive ? '1px solid var(--accent-orange)' : '1px solid var(--border-subtle)',
                color: isActive ? 'var(--text-accent)' : 'var(--text-primary)',
              }}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
