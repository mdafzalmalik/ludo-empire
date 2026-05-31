'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { Player, Token, Color } from '@/lib/gameTypes';
import { COLOR_CLASSES, buildBoardCells } from '@/lib/gameTypes';

interface BoardProps {
  players: Player[];
  myColor: Color | null;
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  killedTokenIds: string[];
  onTokenClick: (tokenId: string) => void;
}

// Solid colours matching Ludo King reference image
const QUAD_COLOR: Record<Color, string> = {
  green:  '#43A047',
  yellow: '#FDD835',
  red:    '#E53935',
  blue:   '#1E88E5',
};

// Lighter tint for home-column strips
const PATH_TINT: Record<Color, string> = {
  green:  '#C8E6C9',
  yellow: '#FFF9C4',
  red:    '#FFCDD2',
  blue:   '#BBDEFB',
};

// Color offsets (must stay in sync with gameTypes.ts)
const OFFSETS: Record<Color, number> = { blue: 1, red: 14, green: 27, yellow: 40 };

// Returns the absolute path index (0-51) for a token on the outer path
function absPos(color: Color, relPos: number): number {
  return (OFFSETS[color] + relPos - 1) % 52;
}

// ─── Token Pin Component ───────────────────────────────────────────
function TokenPiece({ token, isMovable, isKilled, onClick }: {
  token: Token;
  isMovable: boolean;
  isKilled: boolean;
  onClick: () => void;
}) {
  const fill = QUAD_COLOR[token.color];
  const light = COLOR_CLASSES[token.color].light;
  const id = token.id;

  return (
    <motion.div
      onClick={onClick}
      initial={{ scale: 0 }}
      animate={
        isKilled
          ? { scale: [1, 1.5, 0], opacity: [1, 1, 0] }
          : isMovable
          ? { y: [0, -6, 0], opacity: 1, filter: [`drop-shadow(0 0 0px ${light})`, `drop-shadow(0 0 8px ${light})`, `drop-shadow(0 0 0px ${light})`] }
          : { scale: 1, y: 0, opacity: 1 }
      }
      transition={isMovable ? { repeat: Infinity, duration: 0.9 } : isKilled ? { duration: 0.4 } : { type: 'spring', stiffness: 500 }}
      whileHover={isMovable ? { scale: 1.25, zIndex: 50 } : {}}
      whileTap={isMovable ? { scale: 0.9 } : {}}
      className={`w-full h-full relative ${isMovable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <svg viewBox="0 0 100 130" className="w-full h-full" style={{ overflow: 'visible', filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.55))' }}>
        <defs>
          {/* Body radial gradient — bright highlight top-left, full colour toward bottom */}
          <radialGradient id={`body-${id}`} cx="36%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.95)" />
            <stop offset="22%"  stopColor={light} />
            <stop offset="100%" stopColor={fill} />
          </radialGradient>
        </defs>

        {/* Ground shadow ellipse */}
        <ellipse cx="50" cy="127" rx="17" ry="5" fill="rgba(0,0,0,0.32)" />

        {/* ── Main pin / teardrop body ── */}
        <path
          d="M 50,120 C 26,97 7,77 7,45 A 43,43 0 1 1 93,45 C 93,77 74,97 50,120 Z"
          fill={`url(#body-${id})`}
          stroke="rgba(0,0,0,0.75)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Outer dark halo around the circle head */}
        <circle cx="50" cy="45" r="31" fill="none" stroke="rgba(20,20,20,0.55)" strokeWidth="5" />

        {/* White ring */}
        <circle cx="50" cy="45" r="27" fill="white" />

        {/* Dark / shadow ring */}
        <circle cx="50" cy="45" r="22" fill="rgba(15,15,15,0.82)" />

        {/* Coloured inner circle */}
        <circle cx="50" cy="45" r="17" fill={fill} />

        {/* Crescent highlight — upper-left glare */}
        <ellipse
          cx="43" cy="36"
          rx="8" ry="5.5"
          fill="rgba(255,255,255,0.60)"
          transform="rotate(-20 43 36)"
        />

        {/* Tiny bright dot centre-highlight */}
        <circle cx="45" cy="39" r="3" fill="rgba(255,255,255,0.38)" />
      </svg>
    </motion.div>
  );
}

// ─── Helpers to gather tokens on a specific path cell ─────────────
function getTokensOnCell(players: Player[], pathIdx: number): Token[] {
  const result: Token[] = [];
  players.forEach(p => {
    p.tokens.forEach(t => {
      if (t.isHome || t.isFinished || t.position > 51) return;
      if (absPos(p.color, t.position) === pathIdx) result.push(t);
    });
  });
  return result;
}

function CellTokens({ tokens, movableIds, killedIds, onClick }: {
  tokens: Token[];
  movableIds: Set<string>;
  killedIds: string[];
  onClick: (id: string) => void;
}) {
  if (tokens.length === 0) return null;
  const multi = tokens.length > 1;
  const count = Math.min(tokens.length, 4);
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      {tokens.slice(0, 4).map((t, idx) => (
        <div 
          key={t.id} 
          className={`pointer-events-auto ${multi ? 'absolute' : ''}`}
          style={{ 
            width: '75%', 
            height: '75%', 
            zIndex: 10 + idx,
            transform: multi ? `translate(${idx * 12 - (count - 1) * 6}%, ${idx * -12 + (count - 1) * 6}%)` : 'none'
          }}
        >
          <TokenPiece
            token={t}
            isMovable={movableIds.has(t.id)}
            isKilled={killedIds.includes(t.id)}
            onClick={() => onClick(t.id)}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────
export default function Board({
  players, myColor, currentPlayerIndex,
  diceValue, diceRolled, killedTokenIds, onTokenClick,
}: BoardProps) {
  const grid = useMemo(() => buildBoardCells(), []);

  // --- tokenMap: "home-<color>" | "path-<relPos>-<color>" --------
  const tokenMap = useMemo(() => {
    const map = new Map<string, Token[]>();
    players.forEach(p => {
      p.tokens.forEach(t => {
        const key = t.isHome
          ? `home-${p.color}`
          : t.isFinished
          ? 'center'
          : `path-${t.position}-${p.color}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      });
    });
    return map;
  }, [players]);

  // --- movable token ids -----------------------------------------
  const movableIds = useMemo(() => {
    const s = new Set<string>();
    if (!myColor || !diceRolled || diceValue === null) return s;
    const cur = players[currentPlayerIndex];
    if (!cur || cur.color !== myColor) return s;
    cur.tokens.forEach(t => {
      if (t.isFinished) return;
      if (t.isHome && diceValue === 6) { s.add(t.id); return; }
      if (!t.isHome && t.position + diceValue <= 57) s.add(t.id);
    });
    return s;
  }, [players, currentPlayerIndex, myColor, diceValue, diceRolled]);

  const handleClick = (id: string) => { if (movableIds.has(id)) onTokenClick(id); };

  // Start-cell colour map (by path index)
  const startColors: Record<number, Color> = { 1: 'blue', 14: 'red', 27: 'green', 40: 'yellow' };

  // Arrow directions & colours at special path cells
  const arrows: Record<string, { dir: string; color: string }> = {
    '6-0':   { dir: '→', color: QUAD_COLOR['blue'] },   // BLUE   enters going right
    '0-8':   { dir: '↓', color: QUAD_COLOR['red'] },    // RED    enters going down
    '8-14':  { dir: '←', color: QUAD_COLOR['green'] },  // GREEN  enters going left
    '14-6':  { dir: '↑', color: QUAD_COLOR['yellow'] }, // YELLOW enters going up
  };

  return (
    <div className="w-full h-full aspect-square select-none mx-auto" style={{ maxWidth: 800 }}>
      {/* Outer board frame */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ border: '3px solid #888', background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
      >
        {/* ── 15×15 CSS Grid ── */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}
        >
          {grid.flat().map(cell => {
            const { type, row, col } = cell;
            const key = `${row}-${col}`;

            // ── Home quadrant cells (solid colour, no tokens rendered here – overlays below) ──
            if (type.startsWith('home-')) {
              const color = type.replace('home-', '') as Color;
              return <div key={key} style={{ background: QUAD_COLOR[color] }} />;
            }

            // ── Center (covered by SVG overlay) ──
            if (type === 'center') {
              return <div key={key} style={{ background: 'transparent' }} />;
            }

            // ── Coloured home-column strips ──
            if (type.startsWith('path-')) {
              const color = type.replace('path-', '') as Color;
              const tokens = tokenMap.get(`path-${cell.pathIndex}-${color}`) || [];
              return (
                <div key={key} className="relative flex items-center justify-center"
                  style={{ background: PATH_TINT[color], outline: '0.5px solid rgba(0,0,0,0.15)' }}>
                  <CellTokens tokens={tokens} movableIds={movableIds} killedIds={killedTokenIds} onClick={handleClick} />
                </div>
              );
            }

            // ── START cells (solid player colour with white star) ──
            if (type === 'start') {
              const color = startColors[cell.pathIndex!];
              const tokens = color ? getTokensOnCell(players, cell.pathIndex!) : [];
              return (
                <div key={key} className="relative flex items-center justify-center"
                  style={{ background: QUAD_COLOR[color] ?? '#fff', outline: '0.5px solid rgba(0,0,0,0.15)' }}>
                  {tokens.length === 0 && (
                    <svg viewBox="0 0 24 24" className="w-[60%] h-[60%] opacity-80" fill="none" stroke="#fff" strokeWidth="1.5">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  )}
                  <CellTokens tokens={tokens} movableIds={movableIds} killedIds={killedTokenIds} onClick={handleClick} />
                </div>
              );
            }

            // ── STAR cells (white with grey star outline) ──
            if (type === 'star') {
              const tokens = getTokensOnCell(players, cell.pathIndex!);
              return (
                <div key={key} className="relative flex items-center justify-center"
                  style={{ background: '#fff', outline: '0.5px solid rgba(0,0,0,0.15)' }}>
                  {tokens.length === 0 && (
                    <svg viewBox="0 0 24 24" className="w-[60%] h-[60%] opacity-40" fill="none" stroke="#555" strokeWidth="1.5">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  )}
                  <CellTokens tokens={tokens} movableIds={movableIds} killedIds={killedTokenIds} onClick={handleClick} />
                </div>
              );
            }

            // ── Normal PATH cells ──
            if (type === 'path') {
              const tokens = getTokensOnCell(players, cell.pathIndex!);
              const arrow = arrows[key];
              return (
                <div key={key} className="relative flex items-center justify-center"
                  style={{ background: '#fff', outline: '0.5px solid rgba(0,0,0,0.15)' }}>
                  {tokens.length === 0 && arrow && (
                    <span className="font-black select-none pointer-events-none"
                      style={{ color: arrow.color, fontSize: '55%', textShadow: '0 1px 2px rgba(0,0,0,0.3)', lineHeight: 1 }}>
                      {arrow.dir}
                    </span>
                  )}
                  <CellTokens tokens={tokens} movableIds={movableIds} killedIds={killedTokenIds} onClick={handleClick} />
                </div>
              );
            }

            // Fallback (should not be reached)
            return <div key={key} style={{ background: '#fff' }} />;
          })}
        </div>

        {/* ── Home Base Overlays (positioned over the 6×6 corner areas) ─── */}
        {/* Each home base is exactly 6/15 = 40% of the board */}
        {(['green', 'yellow', 'red', 'blue'] as Color[]).map(color => {
          const homeTokens = tokenMap.get(`home-${color}`) || [];
          const positions: Record<Color, React.CSSProperties> = {
            blue:   { top: 0, left: 0 },
            red:    { top: 0, right: 0 },
            yellow: { bottom: 0, left: 0 },
            green:  { bottom: 0, right: 0 },
          };
          return (
            <div key={color} className="absolute z-10 flex items-center justify-center"
              style={{ ...positions[color], width: '40%', height: '40%', background: QUAD_COLOR[color] }}>
              {/* White inner square (65% of home area) */}
              <div className="flex flex-wrap" style={{ width: '65%', height: '65%', background: '#fff', padding: '5%' }}>
                {[0, 1, 2, 3].map(i => {
                  const token = homeTokens[i];
                  return (
                    <div key={i} className="relative flex items-center justify-center"
                      style={{ width: '50%', height: '50%', padding: '8%' }}>
                      {/* Circle placeholder */}
                      <div className="absolute inset-[8%] rounded-full" style={{ border: `5px solid ${QUAD_COLOR[color]}` }} />
                      {/* Token */}
                      {token && (
                        <div className="relative z-10 w-[130%] h-[130%] -translate-y-[10%]">
                          <TokenPiece
                            token={token}
                            isMovable={movableIds.has(token.id)}
                            isKilled={killedTokenIds.includes(token.id)}
                            onClick={() => handleClick(token.id)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Center Triangle SVG & Finished Tokens ── */}
        {/* Positioned over the center 3×3 = rows/cols 6-8 = 40% to 60% */}
        <div className="absolute z-20 pointer-events-none"
          style={{ top: '40%', left: '40%', width: '20%', height: '20%' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full" style={{ display: 'block' }}>
            {/* 4 triangles pointing inward from each edge */}
            {/* Top triangle → RED */}
            <polygon points="0,0 100,0 50,50" fill={QUAD_COLOR['red']} />
            {/* Right triangle → GREEN */}
            <polygon points="100,0 100,100 50,50" fill={QUAD_COLOR['green']} />
            {/* Bottom triangle → YELLOW */}
            <polygon points="100,100 0,100 50,50" fill={QUAD_COLOR['yellow']} />
            {/* Left triangle → BLUE */}
            <polygon points="0,100 0,0 50,50" fill={QUAD_COLOR['blue']} />
            {/* Border lines */}
            <line x1="0" y1="0" x2="50" y2="50" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
            <line x1="100" y1="0" x2="50" y2="50" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
            <line x1="100" y1="100" x2="50" y2="50" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
            <line x1="0" y1="100" x2="50" y2="50" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
          </svg>
          
          {/* Finished Tokens */}
          <div className="absolute inset-0 pointer-events-auto">
            {(['red', 'green', 'yellow', 'blue'] as Color[]).map(color => {
              const centerTokens = tokenMap.get('center') || [];
              const toks = centerTokens.filter(t => t.color === color);
              if (toks.length === 0) return null;
              
              const centerPositions: Record<Color, React.CSSProperties> = {
                red: { top: '22%', left: '50%', transform: 'translate(-50%, -50%)' },
                green: { top: '50%', left: '78%', transform: 'translate(-50%, -50%)' },
                yellow: { top: '78%', left: '50%', transform: 'translate(-50%, -50%)' },
                blue: { top: '50%', left: '22%', transform: 'translate(-50%, -50%)' },
              };

              return (
                <div key={color} className="absolute flex flex-wrap items-center justify-center"
                  style={{ ...centerPositions[color], width: '35%', height: '35%' }}>
                  {toks.map((t, idx) => (
                    <div key={idx} style={{ width: '45%', height: '45%', margin: '1%' }}>
                      <TokenPiece
                        token={t}
                        isMovable={false}
                        isKilled={false}
                        onClick={() => {}}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
