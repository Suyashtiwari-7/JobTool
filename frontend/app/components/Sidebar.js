'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Filters', path: '/filters', icon: '🔍' },
  { label: 'Resume', path: '/resume', icon: '📄' },
];

const NAV_REVIEW = [
  { label: 'Review Queue', path: '/applications', icon: '📋' },
  { label: 'Pipeline', path: '/pipeline', icon: '⚡' },
];

const NAV_CONFIG = [
  { label: 'Settings', path: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">JT</div>
        <span className="sidebar-logo-text">JobTool</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Overview</div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sidebar-link ${pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-label">Applications</div>
        {NAV_REVIEW.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sidebar-link ${pathname.startsWith(item.path) ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-label">Configuration</div>
        {NAV_CONFIG.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sidebar-link ${pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
