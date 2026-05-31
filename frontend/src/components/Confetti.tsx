'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ConfettiProps {
  active: boolean;
}

const COLORS = ['#ff4d4d', '#2979ff', '#00c853', '#ffd600', '#c026d3', '#f59e0b', '#06b6d4', '#84cc16'];

interface Piece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  shape: 'rect' | 'circle' | 'triangle';
  rotate: number;
}

export default function Confetti({ active }: ConfettiProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 1.5,
      duration: Math.random() * 2 + 2,
      size: Math.random() * 10 + 6,
      shape: (['rect', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)],
      rotate: Math.random() > 0.5 ? 720 : -720,
    })));
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: '110vh', opacity: [1, 1, 0], rotate: p.rotate, scale: [1, 0.8, 0.5] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            top: 0,
            width: p.size,
            height: p.shape === 'rect' ? p.size * 0.5 : p.size,
            backgroundColor: p.shape !== 'triangle' ? p.color : 'transparent',
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '0',
            borderLeft: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : 'none',
            borderRight: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : 'none',
            borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}
