'use client';

import { useEffect, useRef } from 'react';

/**
 * GlowingOrb — 3D Matrix Particle Sphere Orb component rendered via HTML5 Canvas.
 * Accepts optional 'size' parameter (default 280, or 48 for avatar mode).
 * Theme awareness: Black particles in Light theme, White particles in Dark theme.
 */
export default function GlowingOrb({ onClick, isListening, theme = 'dark', size = 280 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Canvas size
    canvas.width = size;
    canvas.height = size;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.38;

    // Generate 3D sphere particles
    const particleCount = size < 100 ? 120 : 320;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      // Golden ratio spiral placement on 3D sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particles.push({ x, y, z, baseR: size < 100 ? (Math.random() * 1.2 + 0.8) : (Math.random() * 1.6 + 1) });
    }

    let angleX = 0;
    let angleY = 0;

    function render() {
      ctx.clearRect(0, 0, size, size);

      // Check current theme dynamically from prop or DOM
      const isLightTheme =
        theme === 'light' ||
        (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

      // Draw core glow behind particle sphere
      const coreGlow = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius * 1.15);
      if (isListening) {
        coreGlow.addColorStop(0, 'rgba(240, 94, 45, 0.55)');
        coreGlow.addColorStop(0.5, 'rgba(139, 92, 246, 0.35)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isLightTheme) {
        coreGlow.addColorStop(0, 'rgba(15, 23, 42, 0.25)');
        coreGlow.addColorStop(0.6, 'rgba(240, 94, 45, 0.15)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        coreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
        coreGlow.addColorStop(0.6, 'rgba(240, 94, 45, 0.15)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Rotation angles
      angleY += 0.009;
      angleX += 0.004;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Render dots
      particles.forEach((p) => {
        // Rotate Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;

        // Rotate X
        let y1 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        // 3D Perspective projection
        const scale = size / (size + z2);
        const px = cx + x1 * scale;
        const py = cy + y1 * scale;
        const pSize = Math.max(0.5, p.baseR * scale);

        // Particle alpha based on Z depth
        const alpha = Math.min(1, Math.max(0.15, (z2 + radius) / (radius * 2)));

        if (isListening) {
          ctx.fillStyle = `rgba(240, 94, 45, ${alpha})`;
        } else if (isLightTheme) {
          ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.95})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
        }

        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, theme, size]);

  const isLightTheme =
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: '50%',
        padding: size < 100 ? 0 : 4,
        display: 'inline-block',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: size,
        height: size,
      }}
      className={isListening ? 'pulse-active' : ''}
      title="AI Career Co-Pilot Particle Orb"
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          borderRadius: '50%',
          width: size,
          height: size,
          filter: isListening
            ? 'drop-shadow(0 0 20px rgba(240, 94, 45, 0.85))'
            : isLightTheme
            ? 'drop-shadow(0 0 12px rgba(15, 23, 42, 0.25))'
            : 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.2))',
        }}
      />
    </div>
  );
}
