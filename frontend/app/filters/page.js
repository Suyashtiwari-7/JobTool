'use client';

import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { getActiveFilter, createFilter, getCountries, getExperienceLevels } from '../lib/api';

export default function FiltersPage() {
  const [countries, setCountries] = useState({});
  const [levels, setLevels] = useState([]);
  const [form, setForm] = useState({
    name: 'Default Filter',
    countries: ['in', 'us'],
    keywords: ['software engineer', 'ai'],
    domain: '',
    experience_level: '',
    target_count: 20,
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [countriesData, levelsData, existingFilter] = await Promise.all([
        getCountries(),
        getExperienceLevels(),
        getActiveFilter().catch(() => null),
      ]);
      setCountries(countriesData.countries || {});
      setLevels(levelsData.levels || []);
      if (existingFilter) {
        setForm({
          name: existingFilter.name,
          countries: existingFilter.countries || [],
          keywords: existingFilter.keywords || [],
          domain: existingFilter.domain || '',
          experience_level: existingFilter.experience_level || '',
          target_count: existingFilter.target_count,
        });
      }
    } catch (err) {
      console.error('Failed to load filter data:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleCountry(code) {
    setForm(prev => ({
      ...prev,
      countries: prev.countries.includes(code)
        ? prev.countries.filter(c => c !== code)
        : [...prev.countries, code],
    }));
  }

  function addKeyword(e) {
    e.preventDefault();
    const kw = keywordInput.trim();
    if (kw && !form.keywords.includes(kw)) {
      setForm(prev => ({ ...prev, keywords: [...prev.keywords, kw] }));
      setKeywordInput('');
    }
  }

  function removeKeyword(kw) {
    setForm(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== kw),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await createFilter({
        ...form,
        domain: form.domain || null,
        experience_level: form.experience_level || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save filter: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout>
      <div className="page-header">
        <h1 className="page-title">Search Filters</h1>
        <p className="page-subtitle">Configure what jobs the pipeline should look for</p>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Loading filters...</span>
        </div>
      ) : (
        <div style={{ maxWidth: 700 }}>
          {/* Filter Name */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="filter-name">Filter Name</label>
              <input
                id="filter-name"
                className="form-input"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., AI Roles - Global"
              />
            </div>
          </div>

          {/* Countries */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>🌍 Countries</h3>
            <p className="card-subtitle" style={{ marginBottom: 16 }}>Select countries to search for jobs in</p>
            <div className="chip-container">
              {Object.entries(countries).map(([code, name]) => (
                <button
                  key={code}
                  className={`chip ${form.countries.includes(code) ? 'selected' : ''}`}
                  onClick={() => toggleCountry(code)}
                >
                  {name} ({code.toUpperCase()})
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>🔑 Role Keywords</h3>
            <p className="card-subtitle" style={{ marginBottom: 16 }}>Add keywords for the positions you&apos;re looking for</p>
            <form onSubmit={addKeyword} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="form-input"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="e.g., machine learning engineer"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">Add</button>
            </form>
            <div className="chip-container">
              {form.keywords.map((kw) => (
                <span key={kw} className="chip selected">
                  {kw}
                  <span className="chip-remove" onClick={() => removeKeyword(kw)}>×</span>
                </span>
              ))}
            </div>
          </div>

          {/* Domain + Experience */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="domain">Domain / Industry</label>
                <input
                  id="domain"
                  className="form-input"
                  value={form.domain}
                  onChange={(e) => setForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="e.g., Technology, Finance"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="experience">Experience Level</label>
                <select
                  id="experience"
                  className="form-select"
                  value={form.experience_level}
                  onChange={(e) => setForm(prev => ({ ...prev, experience_level: e.target.value }))}
                >
                  <option value="">Any level</option>
                  {levels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Target Count */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="target-count">
                Number of Jobs to Target: <strong style={{ color: 'var(--text-accent)' }}>{form.target_count}</strong>
              </label>
              <input
                id="target-count"
                type="range"
                min="5"
                max="200"
                step="5"
                value={form.target_count}
                onChange={(e) => setForm(prev => ({ ...prev, target_count: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>5</span>
                <span>200</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSave}
            disabled={saving || form.keywords.length === 0 || form.countries.length === 0}
            style={{ width: '100%' }}
          >
            {saving ? (
              <>
                <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                Saving...
              </>
            ) : saved ? (
              '✅ Filter Saved!'
            ) : (
              '💾 Save Filter'
            )}
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
