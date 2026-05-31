'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { useComputerGame } from '@/hooks/useComputerGame';
import { usePassNPlayGame } from '@/hooks/usePassNPlayGame';
import { useGameStore } from '@/store/useGameStore';
import Board from '@/components/Board';
import Dice from '@/components/Dice';
import PlayerPanel from '@/components/PlayerPanel';
import Confetti from '@/components/Confetti';
import ParticleBackground from '@/components/ParticleBackground';
import { Timer, LogOut, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { COLOR_CLASSES, THEMES } from '@/lib/gameTypes';
import { audioManager } from '@/lib/audio';
import Link from 'next/link';

const TURN_TIME = 100; // seconds per turn
const AFK_TIMEOUT = 60 * 1000; // 60 seconds

interface SocketOps {
  rollDice: (roomId: string) => void;
  moveToken: (roomId: string, tokenId: string) => void;
  sendChat: (roomId: string, text: string) => void;
  sendEmoji: (roomId: string, emoji: string) => void;
}

function GameUI({ roomId, socketOps }: { roomId: string; socketOps: SocketOps }) {
  const router = useRouter();
  const { rollDice, moveToken } = socketOps;
  const {
    room, myColor, mySocketId, myName,
    lastDiceRoll, isRolling, killedTokenIds,
    emojiReaction, notification, setNotification,
    theme,
  } = useGameStore();

  const [muted, setMuted] = useState(false);
  const [turnTimer, setTurnTimer] = useState(TURN_TIME);
  const [showWinner, setShowWinner] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [isAFK, setIsAFK] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(0);

  // Initialize Audio
  useEffect(() => {
    const handleInteraction = () => {
      audioManager.initContext();
      lastInteractionRef.current = Date.now();
      if (isAFK) setIsAFK(false);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [isAFK]);

  // Audio Toggle
  useEffect(() => {
    audioManager.setMuted(muted);
    audioManager.toggleBGM(!muted);
  }, [muted]);

  // AFK Checker
  useEffect(() => {
    lastInteractionRef.current = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - lastInteractionRef.current > AFK_TIMEOUT) {
        setIsAFK(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // If no room in store, try to join from URL (page refresh case)
  useEffect(() => {
    if (!room && roomId !== 'computer' && roomId !== 'pass-n-play') {
      if (!myName) router.push('/lobby');
    }
  }, [room, roomId, myName, router]);

  // Turn timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTurnTimer(TURN_TIME);

    timerRef.current = setInterval(() => {
      setTurnTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [room?.currentPlayerIndex, room?.status, room?.diceRolled]);

  // Handle auto-roll when timer hits 0
  useEffect(() => {
    if (turnTimer === 0 && room?.status === 'playing') {
      const currentPlayer = room.players[room.currentPlayerIndex];
      const isMyTurn = currentPlayer?.socketId === mySocketId;
      if (isMyTurn && !room.diceRolled && !isRolling) {
        rollDice(roomId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnTimer, room?.status, room?.currentPlayerIndex, room?.diceRolled, isRolling, mySocketId, roomId]);

  // Show confetti on finish
  useEffect(() => {
    if (room?.status === 'finished') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWinner(true);
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 5000);
    }
  }, [room?.status]);

  // Dismiss notification after 3s
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification, setNotification]);

  if (!room && roomId !== 'computer' && roomId !== 'pass-n-play') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0820]">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🎮</div>
          <p className="text-gray-300 mb-4">Loading game...</p>
          <Link href="/lobby" className="btn-primary text-sm px-4 py-2">← Back to Lobby</Link>
        </div>
      </div>
    );
  }

  const currentPlayer = room?.players[room.currentPlayerIndex];
  const isMyTurn = currentPlayer?.socketId === mySocketId;
  const canRoll = isMyTurn && !room?.diceRolled && room?.status === 'playing';
  const themeConfig = THEMES[theme];

  return (
    <main className="relative h-[100dvh] overflow-hidden flex flex-col transition-colors duration-1000" style={{ background: themeConfig.background }}>
      <ParticleBackground count={10} />
      <Confetti active={confettiActive} />

      {/* Top Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 glass-dark border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1">
            <LogOut size={14} />
          </Link>
          <div className="font-mono text-sm font-bold text-green-400 tracking-widest glass px-3 py-1 rounded-lg border border-green-500/30">
            {roomId === 'computer' ? 'VS COMPUTER' : roomId}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Turn Timer */}
          {room?.status === 'playing' && (
            <div className={`flex items-center gap-1.5 glass px-3 py-1.5 rounded-xl text-sm font-bold ${turnTimer <= 20 ? 'text-red-400' : 'text-gray-300'}`}>
              <Timer size={14} />
              <span>{turnTimer}s</span>
              {/* Timer bar */}
              <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${turnTimer <= 20 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${(turnTimer / TURN_TIME) * 100}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          )}

          <button onClick={() => setMuted(m => !m)} className="glass p-2 rounded-xl text-gray-400 hover:text-white transition-colors">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </header>

      {/* AFK Warning */}
      <AnimatePresence>
        {isAFK && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-dark border border-yellow-500/30 p-8 rounded-3xl text-center shadow-2xl">
              <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={48} />
              <h2 className="text-2xl font-bold text-white mb-2">Are you still there?</h2>
              <p className="text-gray-400 mb-6">You&apos;ve been inactive for a while.</p>
              <button onClick={() => setIsAFK(false)} className="btn-primary px-8 py-3 w-full">I&apos;m Here</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification banner removed as requested */}

      {/* Emoji reaction overlay */}
      <AnimatePresence>
        {emojiReaction && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 0 }}
            animate={{ scale: [0.5, 1.5, 1.2], opacity: [0, 1, 1], y: -60 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 1.5 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 text-6xl pointer-events-none drop-shadow-2xl"
          >
            {emojiReaction.emoji}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Area (Single Frame, No Scroll) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-2 max-w-5xl mx-auto w-full min-h-0 overflow-hidden">
        
        {(() => {
          const topLeftPlayer = room?.players.find(p => p.color === 'blue');
          const topRightPlayer = room?.players.find(p => p.color === 'red');
          const bottomLeftPlayer = room?.players.find(p => p.color === 'yellow');
          const bottomRightPlayer = room?.players.find(p => p.color === 'green');

          const renderPlayerBox = (player: NonNullable<typeof room>['players'][0] | undefined, position: 'top-left'|'top-right'|'bottom-left'|'bottom-right') => {
            if (!player) return <div className="w-[120px] h-16 sm:w-48 sm:h-20" />;
            const isCurrent = room?.currentPlayerIndex === room?.players.indexOf(player);
            const isMe = player.socketId === mySocketId;
            const isLeft = position.includes('left');

            return (
              <div className={`relative flex flex-col ${isLeft ? 'items-start' : 'items-end'} z-30`}>
                <PlayerPanel 
                  player={player} 
                  isCurrentTurn={isCurrent} 
                  isMe={isMe} 
                  diceNode={
                    isCurrent ? (
                      <div className="relative flex flex-col items-center justify-center">
                        {lastDiceRoll && !isRolling && (
                          <div className="absolute -top-6 whitespace-nowrap text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full pointer-events-none">
                            {lastDiceRoll === 6 ? '🎯 6!' : `Rolled ${lastDiceRoll}`}
                          </div>
                        )}
                        <div className={`p-1 rounded-xl shadow-lg ${isMyTurn ? 'border-2 border-yellow-400' : 'border-2 border-transparent'}`} style={{ background: 'linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%)' }}>
                          <Dice
                            value={lastDiceRoll || 1}
                            onRoll={() => {
                              audioManager.playClick();
                              if (canRoll) rollDice(roomId);
                            }}
                            disabled={!canRoll}
                            isRolling={isRolling}
                            size={44}
                          />
                        </div>
                        {(canRoll || (isMyTurn && room?.diceRolled)) && (
                          <div className="absolute -bottom-5 text-[9px] text-yellow-300 font-bold text-center whitespace-nowrap drop-shadow-md">
                            {canRoll ? 'TAP TO ROLL' : 'MOVE TOKEN'}
                          </div>
                        )}
                      </div>
                    ) : undefined
                  }
                />
              </div>
            );
          };

          return (
            <>
              {/* Top Row Players */}
              <div className="w-full flex justify-between items-end shrink-0 mb-2">
                {renderPlayerBox(topLeftPlayer, 'top-left')}
                {renderPlayerBox(topRightPlayer, 'top-right')}
              </div>

              {/* Center Board (Scales to fit) */}
              <div className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-visible z-10">
                <div
                  className="relative flex items-center justify-center mx-auto"
                  style={{ aspectRatio: '1/1', width: 'min(100%, 100dvh - 280px)', maxHeight: '100%' }}
                >
                  <div className="w-full h-full absolute inset-0">
                    {room ? (
                      <Board
                        players={room.players}
                        myColor={myColor}
                        currentPlayerIndex={room.currentPlayerIndex}
                        diceValue={lastDiceRoll}
                        diceRolled={room.diceRolled}
                        killedTokenIds={killedTokenIds}
                        onTokenClick={(tokenId) => {
                          audioManager.playClick();
                          moveToken(roomId, tokenId);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full glass rounded-2xl flex items-center justify-center text-gray-500 text-lg">
                        Connect to a room to play
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row Players */}
              <div className="w-full flex justify-between items-start shrink-0 mt-2">
                {renderPlayerBox(bottomLeftPlayer, 'bottom-left')}
                {renderPlayerBox(bottomRightPlayer, 'bottom-right')}
              </div>
            </>
          );
        })()}
      </div>



      {/* Winner Modal */}
      <AnimatePresence>
        {showWinner && room?.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="glass rounded-3xl p-8 max-w-md w-full text-center border border-yellow-500/30"
              style={{ boxShadow: '0 0 60px rgba(255,214,0,0.3)' }}
            >
              <div className="text-7xl mb-4">🏆</div>
              <h2 className="font-game text-4xl font-bold text-yellow-400 mb-2 glow-text-yellow">GAME OVER!</h2>
              <div className="space-y-3 my-6">
                {room.players
                  .filter(p => p.rank)
                  .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                  .map(p => (
                    <div key={p.socketId} className="flex items-center gap-3 glass-dark px-4 py-3 rounded-2xl">
                      <span className="text-2xl">{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : '4️⃣'}</span>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className={`text-xs ${COLOR_CLASSES[p.color].text}`}>{p.color}</div>
                      </div>
                      {p.socketId === mySocketId && <span className="text-xs text-gray-400">(You)</span>}
                    </div>
                  ))
                }
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.location.reload()} className="flex-1 btn-primary text-center text-sm py-3">
                  Play Again
                </button>
                <Link href="/" className="flex-1 glass border border-white/15 rounded-2xl text-center text-sm py-3 text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ComputerWrapper() {
  const ops = useComputerGame();
  return <GameUI roomId="computer" socketOps={ops} />;
}

function SocketWrapper({ roomId }: { roomId: string }) {
  const ops = useSocket();
  return <GameUI roomId={roomId} socketOps={ops} />;
}

function PassNPlayWrapper() {
  const [numPlayers, setNumPlayers] = useState<number | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<'count' | 'names' | 'play'>('count');
  
  if (setupStep === 'count') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4">
        <div className="glass-dark rounded-3xl p-8 max-w-md w-full text-center border border-emerald-500/30">
          <h2 className="font-game text-3xl font-bold text-emerald-400 mb-6 drop-shadow-lg">Select Players</h2>
          <div className="flex flex-col gap-4">
            {[2, 3, 4].map(n => (
              <button 
                key={n} 
                onClick={() => {
                  setNumPlayers(n);
                  setPlayerNames(Array(n).fill('').map((_, i) => `Player ${i + 1}`));
                  setSetupStep('names');
                }}
                className="glass hover:bg-emerald-500/20 text-white font-bold py-4 px-6 rounded-2xl transition-all hover:scale-105"
              >
                {n} Players
              </button>
            ))}
          </div>
          <Link href="/" className="inline-block mt-6 text-gray-400 hover:text-white transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    );
  }

  if (setupStep === 'names' && numPlayers) {
    const colors = numPlayers === 2 ? ['blue', 'green'] : numPlayers === 3 ? ['blue', 'red', 'green'] : ['blue', 'red', 'green', 'yellow'];
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4">
        <div className="glass-dark rounded-3xl p-8 max-w-md w-full text-center border border-emerald-500/30">
          <h2 className="font-game text-3xl font-bold text-emerald-400 mb-6 drop-shadow-lg">Player Names</h2>
          <div className="flex flex-col gap-4">
            {Array.from({ length: numPlayers }).map((_, i) => {
              const color = colors[i] as keyof typeof COLOR_CLASSES;
              return (
                <div key={i} className="flex flex-col text-left">
                  <label className={`text-sm font-bold mb-1 ${COLOR_CLASSES[color].text} uppercase`}>{color} Player</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={playerNames[i]}
                    onChange={e => {
                      const newNames = [...playerNames];
                      newNames[i] = e.target.value;
                      setPlayerNames(newNames);
                    }}
                    className="w-full glass bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-8">
            <button 
              onClick={() => setSetupStep('count')}
              className="flex-1 glass text-gray-300 hover:text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              Back
            </button>
            <button 
              onClick={() => {
                // Ensure no empty names
                setPlayerNames(names => names.map((n, i) => n.trim() || `Player ${i + 1}`));
                setSetupStep('play');
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return <PassNPlayGameRunner numPlayers={numPlayers!} playerNames={playerNames} />;
}

function PassNPlayGameRunner({ numPlayers, playerNames }: { numPlayers: number, playerNames: string[] }) {
  const ops = usePassNPlayGame(numPlayers, playerNames);
  return <GameUI roomId="pass-n-play" socketOps={ops} />;
}

export default function GameRoom() {
  const params = useParams();
  const roomId = params.roomId as string;
  
  if (roomId === 'computer') {
    return <ComputerWrapper />;
  }
  if (roomId === 'pass-n-play') {
    return <PassNPlayWrapper />;
  }
  return <SocketWrapper roomId={roomId} />;
}
