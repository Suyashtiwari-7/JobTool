'use client';

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
        width: 72,
        minHeight: 'calc(100vh - 48px)',
        margin: '24px 0 24px 24px',
        padding: '24px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        borderRadius: 'var(--radius-lg)',
        zIndex: 10,
      }}
    >
      {/* VS Code Style Branding Symbol */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'var(--accent-blue-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: 20,
          boxShadow: 'var(--neu-flat)',
          marginBottom: 12,
        }}
        title="JobTool AI Engine"
      >
        ⚡
      </div>

      {/* Nav Icons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={`neu-button ${isActive ? 'active' : ''}`}
              style={{
                width: 46,
                height: 46,
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
