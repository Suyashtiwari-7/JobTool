'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { getCompanies, seedCompanies, getLLMStatus } from '../lib/api';

export default function SettingsPage() {
  const [companies, setCompanies] = useState([]);
  const [llmStatus, setLLMStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeSource, setActiveSource] = useState('greenhouse');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [c, l] = await Promise.all([
        getCompanies().catch(() => []),
        getLLMStatus().catch(() => null),
      ]);
      setCompanies(c || []);
      setLLMStatus(l);
    } catch (err) {
      console.error('Settings load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedCompanies();
      const c = await getCompanies();
      setCompanies(c || []);
    } catch (err) {
      alert('Failed to seed companies: ' + err.message);
    } finally {
      setSeeding(false);
    }
  }

  const filteredCompanies = companies.filter(c => c.source === activeSource);
  const sources = ['greenhouse', 'lever', 'ashby'];

  return (
    <AuthLayout>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure company lists and check system status</p>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading settings...</span>
        </div>
      ) : (
        <>
          {/* LLM Provider Status */}
          {llmStatus && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 className="card-title" style={{ marginBottom: 16 }}>🤖 LLM Providers</h3>
              <div className="stats-grid" style={{ marginBottom: 0 }}>
                <ProviderStatus name="Google Gemini" configured={llmStatus.gemini} />
                <ProviderStatus name="Groq" configured={llmStatus.groq} />
                <ProviderStatus name="DeepSeek" configured={llmStatus.deepseek} />
              </div>
            </div>
          )}

          {/* Company Lists */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">🏢 Company Lists</h3>
                <p className="card-subtitle" style={{ marginTop: 4 }}>
                  Companies to search on Greenhouse, Lever, and Ashby
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSeed}
                disabled={seeding}
              >
                {seeding ? 'Seeding...' : '🌱 Seed Defaults'}
              </button>
            </div>

            {/* Source Tabs */}
            <div className="tabs" style={{ maxWidth: 400, marginBottom: 16 }}>
              {sources.map(s => (
                <button
                  key={s}
                  className={`tab ${activeSource === s ? 'active' : ''}`}
                  onClick={() => setActiveSource(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({companies.filter(c => c.source === s).length})
                </button>
              ))}
            </div>

            {filteredCompanies.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <p className="empty-state-text">
                  No companies configured for {activeSource}. Click &quot;Seed Defaults&quot; to add popular tech companies.
                </p>
              </div>
            ) : (
              <div className="chip-container">
                {filteredCompanies.map((c) => (
                  <span
                    key={c.id || c.slug}
                    className={`chip ${c.is_enabled ? 'selected' : ''}`}
                    title={c.slug}
                  >
                    {c.name || c.slug}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Deployment Info */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>🚀 Deployment Info</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <p><strong>Backend:</strong> FastAPI on Render (free tier)</p>
              <p><strong>Frontend:</strong> Next.js on Vercel (free tier)</p>
              <p><strong>Database:</strong> PostgreSQL on Neon (free tier)</p>
              <p><strong>Cron:</strong> Set up cron-job.org to hit <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>/api/pipeline/run/cron</code> daily</p>
            </div>
          </div>
        </>
      )}
    </AuthLayout>
  );
}

function ProviderStatus({ name, configured }) {
  return (
    <div className="stat-card" style={{
      borderColor: configured ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{configured ? '✅' : '⚠️'}</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{name}</span>
      </div>
      <div style={{
        fontSize: 12,
        color: configured ? 'var(--accent-green)' : 'var(--accent-amber)',
      }}>
        {configured ? 'API key configured' : 'Not configured'}
      </div>
    </div>
  );
}
