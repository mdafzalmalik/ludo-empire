'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Copy, Check, Users, Loader2, ArrowRight, Play, Crown, Wifi } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/useGameStore';
import ParticleBackground from '@/components/ParticleBackground';
import { COLOR_CLASSES } from '@/lib/gameTypes';
import type { Color } from '@/lib/gameTypes';
import Link from 'next/link';

const COLOR_LIGHT: Record<Color, string> = {
  red: '#ff4d4d', blue: '#2979ff', green: '#00c853', yellow: '#ffd600'
};

export default function LobbyPage() {
  const router = useRouter();
  const { createRoom, joinRoom, startGame, isConnected } = useSocket();
  const { room, myPlayerIndex, setMyColor, setMyPlayerIndex, setMyName } = useGameStore();

  const [joinCode, setJoinCode] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState<2 | 4>(4);
  const [view, setView] = useState<'home' | 'create' | 'join' | 'waiting'>('home');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (room) setView('waiting');
  }, [room]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) { setError('Please enter your name'); return; }
    setLoading(true); setError('');
    createRoom(nameInput.trim(), maxPlayers, (res) => {
      setLoading(false);
      if (res.success && res.color && res.playerIndex !== undefined) {
        setMyName(nameInput.trim());
        setMyColor(res.color);
        setMyPlayerIndex(res.playerIndex);
        setView('waiting');
      } else { setError(res.error || 'Failed to create room'); }
    });
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) { setError('Please enter your name'); return; }
    if (joinCode.length < 6) { setError('Enter a valid 6-character room code'); return; }
    setLoading(true); setError('');
    joinRoom(joinCode.toUpperCase(), nameInput.trim(), (res) => {
      setLoading(false);
      if (res.success && res.color && res.playerIndex !== undefined) {
        setMyName(nameInput.trim());
        setMyColor(res.color);
        setMyPlayerIndex(res.playerIndex);
        setView('waiting');
      } else { setError(res.error || 'Failed to join room'); }
    });
  };

  const handleStart = () => {
    if (!room) return;
    startGame(room.roomId, (res) => {
      if (res?.success) router.push(`/game/${room.roomId}`);
    });
  };

  const handleCopy = () => {
    if (!room?.roomId) return;
    navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = room && myPlayerIndex === 0;

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <ParticleBackground count={15} />

      {/* Back button */}
      <Link href="/" className="absolute top-4 left-4 z-20 glass px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
        ← Back
      </Link>

      {/* Connection indicator */}
      <div className={`absolute top-4 right-4 z-20 flex items-center gap-2 glass px-3 py-1.5 rounded-full text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
        <Wifi size={12} />
        {isConnected ? 'Connected' : 'Connecting...'}
      </div>

      <AnimatePresence mode="wait">

        {/* HOME: Choose create or join */}
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-3xl p-8 w-full max-w-md z-10 text-center"
            style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 0 60px rgba(100,0,255,0.2)' }}
          >
            <div className="text-5xl mb-4">🎮</div>
            <h1 className="font-game text-4xl font-bold gradient-text mb-2">LOBBY</h1>
            <p className="text-gray-400 text-sm mb-8">Play with friends in realtime</p>

            <div className="space-y-4">
              <motion.button
                onClick={() => setView('create')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full btn-primary flex items-center justify-center gap-3"
              >
                <Users size={20} /> Create New Room
              </motion.button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative text-center"><span className="glass px-3 py-1 text-xs text-gray-500 rounded-full">or</span></div>
              </div>

              <motion.button
                onClick={() => setView('join')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full glass border border-white/15 py-3.5 px-6 rounded-2xl font-bold text-gray-300 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-3"
              >
                <ArrowRight size={20} /> Join with Code
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* CREATE ROOM */}
        {view === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="glass rounded-3xl p-8 w-full max-w-md z-10"
            style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 0 60px rgba(100,0,255,0.2)' }}
          >
            <button onClick={() => setView('home')} className="text-gray-500 hover:text-white mb-4 text-sm flex items-center gap-1">← Back</button>
            <div className="text-4xl mb-2 text-center">🏠</div>
            <h2 className="font-game text-3xl font-bold text-center gradient-text mb-6">CREATE ROOM</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Your Name</label>
                <input
                  type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                  placeholder="Enter your name..." maxLength={20}
                  className="w-full glass-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Max Players</label>
                <div className="flex gap-3">
                  {([2, 4] as const).map(n => (
                    <button type="button" key={n} onClick={() => setMaxPlayers(n)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all border ${maxPlayers === n ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40' : 'glass-dark border-white/10 text-gray-400'}`}>
                      {n} Players
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <motion.button
                type="submit" disabled={loading || !isConnected}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Users size={20} />}
                {loading ? 'Creating...' : 'Create Room'}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* JOIN ROOM */}
        {view === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="glass rounded-3xl p-8 w-full max-w-md z-10"
            style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 0 60px rgba(100,0,255,0.2)' }}
          >
            <button onClick={() => setView('home')} className="text-gray-500 hover:text-white mb-4 text-sm flex items-center gap-1">← Back</button>
            <div className="text-4xl mb-2 text-center">🔑</div>
            <h2 className="font-game text-3xl font-bold text-center gradient-text mb-6">JOIN ROOM</h2>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Your Name</label>
                <input
                  type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                  placeholder="Enter your name..." maxLength={20}
                  className="w-full glass-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Room Code</label>
                <input
                  type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123" maxLength={6}
                  className="w-full glass-dark border border-white/10 rounded-xl px-4 py-3 text-center text-3xl font-mono tracking-[0.4em] text-white placeholder-gray-700 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <motion.button
                type="submit" disabled={loading || !isConnected}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                {loading ? 'Joining...' : 'Join Room'}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* WAITING ROOM */}
        {view === 'waiting' && room && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="glass rounded-3xl p-6 w-full max-w-lg z-10"
            style={{ border: '1px solid rgba(0,200,83,0.3)', boxShadow: '0 0 60px rgba(0,200,83,0.15)' }}
          >
            {/* Room Code */}
            <div className="text-center mb-6">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Room Code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-4xl font-black tracking-[0.3em] text-green-400" style={{ textShadow: '0 0 20px rgba(0,200,83,0.6)' }}>
                  {room.roomId}
                </span>
                <motion.button
                  onClick={handleCopy}
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  className="p-2 glass rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                </motion.button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Share this code with friends</p>
            </div>

            {/* Players List */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Players</h3>
                <span className="text-xs glass px-2 py-1 rounded-full text-gray-400">{room.players.length}/{room.settings.maxPlayers}</span>
              </div>
              <div className="space-y-2">
                {room.players.map((player, i) => {
                  const c = COLOR_CLASSES[player.color];
                  return (
                    <motion.div
                      key={player.socketId}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-dark flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/5"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
                        style={{ background: `radial-gradient(circle, ${COLOR_LIGHT[player.color]}66, ${COLOR_LIGHT[player.color]}22)`, border: `2px solid ${COLOR_LIGHT[player.color]}66`, boxShadow: `0 0 10px ${COLOR_LIGHT[player.color]}44` }}>
                        {i === 0 ? '🦁' : i === 1 ? '🐯' : i === 2 ? '🦊' : '🐺'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                          {player.name}
                          {i === 0 && <Crown size={12} className="text-yellow-400" />}
                          {player.socketId === useGameStore.getState().mySocketId && <span className="text-xs text-gray-500">(You)</span>}
                        </div>
                        <div className={`text-xs ${c.text} capitalize`}>{player.color} · {i === 0 ? 'Host' : 'Player'}</div>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    </motion.div>
                  );
                })}

                {/* Empty slots */}
                {Array.from({ length: room.settings.maxPlayers - room.players.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="glass-dark border border-white/5 border-dashed flex items-center gap-3 px-4 py-3 rounded-2xl opacity-40">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Loader2 size={16} className="text-gray-600 animate-spin" />
                    </div>
                    <span className="text-sm text-gray-600 italic">Waiting for player...</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Start button */}
            {isHost ? (
              <motion.button
                onClick={handleStart}
                disabled={room.players.length < 2}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full btn-success flex items-center justify-center gap-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play fill="currentColor" size={20} />
                {room.players.length < 2 ? 'Waiting for players...' : 'Start Game!'}
              </motion.button>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-3 text-gray-400 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Waiting for host to start the game...
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
