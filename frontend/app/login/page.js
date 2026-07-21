'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(password);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 20,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        className="neu-card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img
            src="/logo.png"
            alt="JobTool Logo"
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              objectFit: 'cover',
              boxShadow: 'var(--neu-flat)',
            }}
          />
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: 6,
            letterSpacing: '-0.5px',
          }}
        >
          Welcome to JobTool
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 32,
          }}
        >
          AI-Powered Job Application Pipeline
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Access Password
            </label>
            <input
              id="password"
              type="password"
              className="neu-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your security password"
              autoFocus
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div
              className="neu-inset"
              style={{
                color: 'var(--accent-red)',
                fontSize: 13,
                padding: '10px 14px',
                borderRadius: 10,
                marginBottom: 20,
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="neu-button neu-button-primary"
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 14,
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
