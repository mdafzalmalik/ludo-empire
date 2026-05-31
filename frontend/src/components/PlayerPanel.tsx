'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '@/lib/gameTypes';
import { COLOR_CLASSES } from '@/lib/gameTypes';
import { Trophy } from 'lucide-react';

interface PlayerPanelProps {
  player: Player;
  isCurrentTurn: boolean;
  isMe: boolean;
  diceNode?: React.ReactNode;
}

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🐻', '🦅', '🐉', '🦄'];

export default function PlayerPanel({ player, isCurrentTurn, isMe, diceNode }: PlayerPanelProps) {
  const c = COLOR_CLASSES[player.color];
  const avatar = AVATARS[['red', 'blue', 'green', 'yellow'].indexOf(player.color)];
  const finished = player.tokens.filter(t => t.isFinished).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-2xl p-3 transition-all duration-300 ${
        isCurrentTurn
          ? 'glass border border-white/20 shadow-lg'
          : 'glass-dark border border-white/5'
      }`}
      style={isCurrentTurn ? { boxShadow: `0 0 20px ${c.light}44, 0 0 40px ${c.light}22` } : {}}
    >
      {/* Turn indicator pulse */}
      <AnimatePresence>
        {isCurrentTurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${c.light}15, transparent)` }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex items-center gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{
              background: `radial-gradient(circle, ${c.light}66, ${c.light}33)`,
              border: `2px solid ${c.light}88`,
              boxShadow: isCurrentTurn ? `0 0 15px ${c.light}66` : 'none',
            }}
          >
            {avatar}
          </div>
          {/* Online indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center ${player.connected ? 'bg-green-400' : 'bg-gray-500'}`}>
          </div>
          {/* Crown for rank 1 */}
          {player.rank === 1 && (
            <div className="absolute -top-3 -right-1 text-yellow-400 text-lg">👑</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-white truncate">{player.name}</span>
            {isMe && <span className="text-xs text-gray-400">(You)</span>}
          </div>
          <div className={`text-xs font-medium ${c.text}`}>{c.text.includes('red') ? '🔴' : c.text.includes('blue') ? '🔵' : c.text.includes('green') ? '🟢' : '🟡'} {player.color.charAt(0).toUpperCase() + player.color.slice(1)}</div>
          {/* Token progress dots */}
          <div className="flex gap-1 mt-1">
            {player.tokens.map((t, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full border border-white/20"
                style={{
                  background: t.isFinished ? c.light : t.isHome ? 'rgba(255,255,255,0.1)' : c.light + '88',
                  boxShadow: t.isFinished ? `0 0 6px ${c.light}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Turn / Rank badge */}
        <div className="flex-shrink-0 flex items-center justify-center ml-2">
          {player.rank ? (
            <div className="flex flex-col items-center">
              <Trophy size={18} className="text-yellow-400" />
              <span className="text-xs text-yellow-400 font-bold">#{player.rank}</span>
            </div>
          ) : isCurrentTurn ? (
            diceNode ? (
              <div className="relative z-50 pl-2">
                 {diceNode}
              </div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: c.light, boxShadow: `0 0 12px ${c.light}` }}
              >
                🎲
              </motion.div>
            )
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-xs">
              {finished}/4
            </div>
          )}
        </div>
      </div>

      {/* Turn label */}
      <AnimatePresence>
        {isCurrentTurn && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 text-center"
          >
            <span
              className="text-xs font-bold px-3 py-0.5 rounded-full"
              style={{ background: c.light + '33', color: c.light, border: `1px solid ${c.light}55` }}
            >
              {isMe ? '⚡ YOUR TURN' : '⏳ PLAYING...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
