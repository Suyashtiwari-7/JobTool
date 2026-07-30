'use client';

/**
 * SidebarNav — Ultra-Sleek Expanded Neumorphic Navigation Sidebar.
 * Displays icons, clear text labels, and glowing active indicators.
 */
export default function SidebarNav({ activePage, setActivePage }) {
  const navItems = [
    { id: 'queued', label: '📋 Queued', subtitle: 'Awaiting 1-Tap Submit', icon: '📋' },
    { id: 'calendar', label: '📅 Calendar', subtitle: 'Application Timeline', icon: '📅' },
    { id: 'applied', label: '✅ Applied', subtitle: 'Submitted Records', icon: '✅' },
    { id: 'profile', label: '👤 Profile', subtitle: 'Master Career Profile', icon: '👤' },
  ];

  return (
    <aside
      className="neu-card"
      style={{
        width: 230,
        height: 'auto',
        maxHeight: 'fit-content',
        alignSelf: 'flex-start',
        margin: '24px 0 0 20px',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        borderRadius: 24,
        zIndex: 100,
        boxShadow: 'var(--neu-flat)',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '0 8px 6px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.8px' }}>
          Navigation
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={`neu-button ${isActive ? 'active' : ''}`}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                background: isActive ? 'rgba(240, 94, 45, 0.15)' : 'var(--bg-card)',
                border: isActive ? '1px solid var(--accent-orange)' : '1px solid var(--border-subtle)',
                color: isActive ? 'var(--text-accent)' : 'var(--text-primary)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>{item.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap' }}>{item.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
