'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        background: 'var(--bg-card)',
        boxShadow: 'var(--neu-flat)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--accent-blue-gradient)',
            boxShadow: 'var(--neu-flat)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 18,
            color: '#fff',
          }}
        >
          JT
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>JobTool</div>
          <div style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 600 }}>🟢 Cloud Connected</div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link
          href="/"
          className={`neu-button ${pathname === '/' ? 'active' : ''}`}
          style={{
            width: '100%',
            justify: 'flex-start',
            padding: '12px 16px',
            background: pathname === '/' ? 'var(--accent-blue-gradient)' : 'var(--bg-card)',
            color: pathname === '/' ? '#fff' : 'var(--text-primary)',
          }}
        >
          <span>🎛️</span>
          <span>Control Center</span>
        </Link>
      </nav>

      <div style={{ marginTop: 'auto', padding: 12, borderRadius: 14, background: 'var(--bg-neu-base)', boxShadow: 'var(--neu-pressed)', fontSize: 11, color: 'var(--text-muted)' }}>
        <div>⚡ <strong>Status:</strong> Cloud Engine</div>
        <div style={{ marginTop: 4 }}>Auto-Sourcing: <strong>Active</strong></div>
      </div>
    </aside>
  );
}
