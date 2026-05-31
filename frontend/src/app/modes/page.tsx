'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import ParticleBackground from '@/components/ParticleBackground';

const MODES = [
  {
    id: '2p',
    emoji: '⚔️',
    title: '2 Player',
    desc: 'Classic 1v1 battle',
    sub: 'Red vs Blue',
    color: '#2979ff',
    border: 'rgba(41,121,255,0.4)',
    glow: 'rgba(41,121,255,0.2)',
    href: '/lobby',
    params: '?max=2',
    badge: null,
  },
  {
    id: '4p',
    emoji: '🎮',
    title: '4 Player',
    desc: 'Full chaos mode',
    sub: 'All four colors',
    color: '#c026d3',
    border: 'rgba(192,38,211,0.4)',
    glow: 'rgba(192,38,211,0.2)',
    href: '/lobby',
    params: '?max=4',
    badge: 'POPULAR',
  },
  {
    id: 'comp',
    emoji: '🤖',
    title: 'vs Computer',
    desc: 'Practice offline',
    sub: 'Single player',
    color: '#00c853',
    border: 'rgba(0,200,83,0.4)',
    glow: 'rgba(0,200,83,0.2)',
    href: '/game/computer',
    params: '',
    badge: null,
  },
  {
    id: 'quick',
    emoji: '⚡',
    title: 'Quick Match',
    desc: 'Join any open room',
    sub: 'Random players',
    color: '#ffd600',
    border: 'rgba(255,214,0,0.4)',
    glow: 'rgba(255,214,0,0.2)',
    href: '/lobby',
    params: '',
    badge: 'NEW',
  },
  {
    id: 'team',
    emoji: '🛡️',
    title: 'Team Mode',
    desc: 'Red+Green vs Blue+Yellow',
    sub: '2v2 battles',
    color: '#ff4d4d',
    border: 'rgba(255,77,77,0.4)',
    glow: 'rgba(255,77,77,0.2)',
    href: '/lobby',
    params: '?mode=team',
    badge: 'SOON',
  },
  {
    id: 'tourney',
    emoji: '🏆',
    title: 'Tournament',
    desc: 'Bracket competition',
    sub: '8-16 players',
    color: '#f59e0b',
    border: 'rgba(245,158,11,0.4)',
    glow: 'rgba(245,158,11,0.2)',
    href: '/lobby',
    params: '?mode=tournament',
    badge: 'SOON',
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200 } },
};

export default function ModesPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <ParticleBackground count={12} />

      <Link href="/" className="absolute top-4 left-4 z-20 glass px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
        ← Home
      </Link>

      <div className="z-10 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-game text-6xl font-bold gradient-text mb-3">GAME MODES</h1>
          <p className="text-gray-400">Choose your battle</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {MODES.map((mode) => {
            const isSoon = mode.badge === 'SOON';
            const Card = (
              <motion.div
                variants={cardVariants}
                whileHover={!isSoon ? { scale: 1.04, y: -4 } : {}}
                whileTap={!isSoon ? { scale: 0.97 } : {}}
                className={`glass rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden ${isSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ border: `1px solid ${mode.border}`, boxShadow: `0 0 30px ${mode.glow}` }}
              >
                {/* Badge */}
                {mode.badge && (
                  <div
                    className="absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: mode.badge === 'SOON' ? 'rgba(255,255,255,0.1)' : mode.color + 'cc',
                      color: mode.badge === 'SOON' ? '#666' : '#000',
                    }}
                  >
                    {mode.badge}
                  </div>
                )}

                {/* Glow orb bg */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{ background: `radial-gradient(circle at 20% 80%, ${mode.color}, transparent 70%)` }}
                />

                <div className="text-4xl">{mode.emoji}</div>
                <div>
                  <h2 className="font-game text-2xl font-bold text-white tracking-wide">{mode.title}</h2>
                  <p className="text-gray-300 text-sm mt-1">{mode.desc}</p>
                  <p className="text-xs mt-0.5" style={{ color: mode.color }}>{mode.sub}</p>
                </div>

                {!isSoon && (
                  <div
                    className="mt-auto text-sm font-bold py-2 px-4 rounded-xl text-center transition-all"
                    style={{ background: mode.color + '33', color: mode.color, border: `1px solid ${mode.color}55` }}
                  >
                    Play Now →
                  </div>
                )}
                {isSoon && (
                  <div className="mt-auto text-sm text-gray-600 py-2 px-4 rounded-xl text-center border border-white/5">
                    Coming Soon
                  </div>
                )}
              </motion.div>
            );

            if (isSoon) return <div key={mode.id}>{Card}</div>;
            return (
              <Link key={mode.id} href={mode.href + mode.params}>
                {Card}
              </Link>
            );
          })}
        </motion.div>
      </div>
    </main>
  );
}
