'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Monitor, Users, UserPlus, Zap, Shield, Swords } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';

export default function PremiumHomePage() {
  const [mounted, setMounted] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <main className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[#06060a] text-white py-8">
      <ParticleBackground count={40} />

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-700/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-60" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-4 sm:px-6 gap-10 md:gap-14">

        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          {/* Dice icon row */}
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="text-5xl md:text-6xl mb-3 drop-shadow-[0_0_20px_rgba(167,139,250,0.6)]"
          >
            🎲
          </motion.div>

          <div className="relative">
            <h1 className="font-game text-6xl md:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-violet-300 via-white to-cyan-300 drop-shadow-2xl select-none">
              LUDO
            </h1>
            {/* Glow behind text */}
            <div className="absolute inset-0 text-6xl md:text-8xl font-black tracking-tight text-violet-500/30 blur-xl select-none font-game">
              LUDO
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-violet-400/60" />
            <p className="font-game text-sm md:text-base tracking-[0.35em] text-violet-300/80 uppercase font-semibold">
              Blitz Arena
            </p>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-violet-400/60" />
          </div>

          <p className="text-gray-400 text-xs md:text-sm mt-3 tracking-wide max-w-xs text-center">
            Fast-paced Ludo battles. Roll. Capture. Dominate.
          </p>
        </motion.div>

        {/* Game Modes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-4xl">

          {/* COMPUTER */}
          <Link href="/game/computer" className="group">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onHoverStart={() => setHoveredCard('computer')}
              onHoverEnd={() => setHoveredCard(null)}
              className="relative h-full cursor-pointer rounded-2xl md:rounded-3xl p-[1.5px] overflow-hidden"
              style={{
                background: hoveredCard === 'computer'
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6)'
                  : 'linear-gradient(135deg, #3b82f620, #8b5cf620)',
              }}
            >
              <div className="h-full rounded-[calc(1.5rem-1.5px)] bg-[#0d0d18] p-5 md:p-8 flex flex-col items-center text-center gap-3 md:gap-5">
                <div className="relative">
                  <div className="w-14 h-14 md:w-18 md:h-18 rounded-2xl bg-gradient-to-br from-blue-500/30 to-violet-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 group-hover:scale-110 transition-transform duration-300">
                    <Monitor className="w-7 h-7 md:w-8 md:h-8" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-game text-xl md:text-2xl font-bold tracking-wide text-white mb-1">VS COMPUTER</h3>
                  <p className="text-[11px] md:text-sm text-gray-400 leading-snug">Challenge smart AI bots in an offline battle.</p>
                </div>
                <div className="mt-auto w-full flex items-center justify-center gap-1.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold tracking-widest uppercase">
                  Play Now <span className="text-base">→</span>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* TEAM UP (disabled) */}
          <div className="group cursor-not-allowed">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="relative h-full rounded-2xl md:rounded-3xl p-[1.5px] overflow-hidden opacity-50"
              style={{ background: 'linear-gradient(135deg, #a855f720, #ec489920)' }}
            >
              <div className="h-full rounded-[calc(1.5rem-1.5px)] bg-[#0d0d18] p-5 md:p-8 flex flex-col items-center text-center gap-3 md:gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-400/20 flex items-center justify-center text-purple-400/60">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-game text-xl md:text-2xl font-bold tracking-wide text-gray-500 mb-1">ONLINE</h3>
                  <p className="text-[11px] md:text-sm text-gray-500 italic leading-snug">Multiplayer rooms — coming soon.</p>
                </div>
                <div className="mt-auto">
                  <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400/60 text-[10px] font-semibold tracking-widest uppercase">
                    Soon
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* PASS N PLAY */}
          <Link href="/game/pass-n-play" className="group">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onHoverStart={() => setHoveredCard('pass')}
              onHoverEnd={() => setHoveredCard(null)}
              className="relative h-full cursor-pointer rounded-2xl md:rounded-3xl p-[1.5px] overflow-hidden"
              style={{
                background: hoveredCard === 'pass'
                  ? 'linear-gradient(135deg, #10b981, #06b6d4, #10b981)'
                  : 'linear-gradient(135deg, #10b98120, #06b6d420)',
              }}
            >
              <div className="h-full rounded-[calc(1.5rem-1.5px)] bg-[#0d0d18] p-5 md:p-8 flex flex-col items-center text-center gap-3 md:gap-5">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform duration-300">
                    <UserPlus className="w-7 h-7" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Swords className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-game text-xl md:text-2xl font-bold tracking-wide text-white mb-1">PASS & PLAY</h3>
                  <p className="text-[11px] md:text-sm text-gray-400 leading-snug">Local battles with friends on one device.</p>
                </div>
                <div className="mt-auto w-full flex items-center justify-center gap-1.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold tracking-widest uppercase">
                  Play Now <span className="text-base">→</span>
                </div>
              </div>
            </motion.div>
          </Link>

        </div>

        {/* Footer tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center gap-2 text-gray-600 text-xs tracking-widest uppercase"
        >
          <Shield className="w-3 h-3" />
          <span>Fair Play &bull; Smart AI &bull; Zero Ads</span>
          <Shield className="w-3 h-3" />
        </motion.div>

      </div>

      {/* Decorative bottom border */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40" />
    </main>
  );
}
