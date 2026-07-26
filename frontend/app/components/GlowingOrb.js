'use client';

import { useEffect, useRef } from 'react';

/**
 * GlowingOrb — 3D Matrix Particle Sphere Orb component rendered via HTML5 Canvas.
 * Creates an animated rotating particle sphere with neon aura glows and interactive state.
 */
export default function GlowingOrb({ onClick, isListening, activePrompt }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Canvas size
    const width = 260;
    const height = 260;
    canvas.width = width;
    canvas.height = height;

    const cx = width / 2;
    const cy = height / 2;
    const radius = 95;

    // Generate 3D sphere particles
    const particleCount = 280;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      // Golden ratio spiral placement on 3D sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particles.push({ x, y, z, baseR: Math.random() * 1.6 + 1 });
    }

    let angleX = 0;
    let angleY = 0;

    function render() {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle core glow behind particle sphere
      const coreGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius * 1.1);
      if (isListening) {
        coreGlow.addColorStop(0, 'rgba(240, 94, 45, 0.45)');
        coreGlow.addColorStop(0.5, 'rgba(139, 92, 246, 0.25)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        coreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        coreGlow.addColorStop(0.6, 'rgba(240, 94, 45, 0.12)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Rotation angles
      angleY += 0.008;
      angleX += 0.003;

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
        const scale = 260 / (260 + z2);
        const px = cx + x1 * scale;
        const py = cy + y1 * scale;
        const size = Math.max(0.6, p.baseR * scale);

        // Particle alpha based on Z depth
        const alpha = Math.min(1, Math.max(0.15, (z2 + radius) / (radius * 2)));

        ctx.fillStyle = isListening
          ? `rgba(240, 94, 45, ${alpha})`
          : `rgba(255, 255, 255, ${alpha * 0.95})`;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div
        onClick={onClick}
        style={{
          position: 'relative',
          cursor: 'pointer',
          borderRadius: '50%',
          padding: 8,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={isListening ? 'pulse-active' : ''}
        title="Click Glowing Particle Orb to talk or command AI Co-Pilot"
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            borderRadius: '50%',
            filter: isListening
              ? 'drop-shadow(0 0 25px rgba(240, 94, 45, 0.8))'
              : 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.15))',
          }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
          {isListening ? '🎙️ AI Voice Active — Listening to Commands...' : '✨ Click Particle Sphere to Command AI Co-Pilot'}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {activePrompt || 'Try: "Target Big Tech Apprenticeships everyday from 8am to 10am"'}
        </p>
      </div>
    </div>
  );
}
