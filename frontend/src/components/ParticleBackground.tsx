'use client';

import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

const COLORS = ['#ff4d4d', '#2979ff', '#00c853', '#ffd600', '#c026d3', '#7c3aed', '#f59e0b'];

export default function ParticleBackground({ count = 20 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const ps: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 4 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 8,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(ps);
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}
      {/* Ambient orbs */}
      <div className="orb w-96 h-96 bg-purple-600 opacity-20" style={{ top: '10%', left: '10%', animationDelay: '0s' }} />
      <div className="orb w-80 h-80 bg-blue-600 opacity-20"   style={{ top: '60%', right: '10%', animationDelay: '2s' }} />
      <div className="orb w-64 h-64 bg-pink-600 opacity-15"   style={{ bottom: '10%', left: '40%', animationDelay: '4s' }} />
    </div>
  );
}
