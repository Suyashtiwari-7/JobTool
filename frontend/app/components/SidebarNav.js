'use client';

/**
 * SidebarNav — Floating Capsule Vertical Navigation Bar.
 * Cuts off right after the last navigation button with rounded capsule borders.
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
        width: 68,
        height: 'fit-content',
        alignSelf: 'flex-start',
        margin: '24px 0 24px 24px',
        padding: '16px 8px 20px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        borderRadius: 28,
        zIndex: 10,
        boxShadow: 'var(--neu-flat)',
      }}
    >
      {/* VS Code Style Branding Symbol */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'var(--accent-blue-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: 20,
          boxShadow: 'var(--neu-flat)',
          marginBottom: 4,
        }}
        title="JobTool AI Engine"
      >
        ⚡
      </div>

      {/* Nav Icons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={`neu-button ${isActive ? 'active' : ''}`}
              style={{
                width: 44,
                height: 44,
                padding: 0,
                borderRadius: 14,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
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
