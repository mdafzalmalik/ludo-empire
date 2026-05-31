export type Color = 'red' | 'blue' | 'green' | 'yellow';
export type Theme = 'Classic' | 'Neon' | 'Space' | 'Jungle' | 'Royal' | 'Candy' | 'Cyberpunk';

export interface Token {
  id: string;
  color: Color;
  position: number;   // -1=home base, 1..56=path, 57=finished
  isHome: boolean;
  isFinished: boolean;
}

export interface Player {
  socketId: string;
  name: string;
  color: Color;
  tokens: Token[];
  rank: number | null;
  connected: boolean;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  color: Color;
  text: string;
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  hostId: string;
  settings: { maxPlayers: 2 | 3 | 4 };
  consecutiveSixes?: number;
  chat: ChatMessage[];
}

// Board position mappings
// BLUE is TOP-LEFT  → enters at path index 1 (left side going right)
// RED is TOP-RIGHT → enters at path index 14 (top going down)
// GREEN is BOTTOM-RIGHT → enters at path index 27 (right side going left)
// YELLOW is BOTTOM-LEFT  → enters at path index 40 (bottom going up)
export const COLOR_OFFSETS: Record<Color, number> = {
  blue: 1, red: 14, green: 27, yellow: 40,
};

export const SAFE_POSITIONS = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

// Maps relative position (1-52) to absolute board square (0-51)
export function getAbsolutePosition(color: Color, relPos: number): number {
  if (relPos <= 0 || relPos > 51) return -1;
  return (COLOR_OFFSETS[color] + relPos - 1) % 52;
}

export const COLOR_CLASSES: Record<Color, { bg: string; text: string; border: string; glow: string; light: string; dark: string }> = {
  red:    { bg: 'bg-red-500',    text: 'text-red-400',    border: 'border-red-500',    glow: 'neon-red',    light: '#ef5350', dark: '#b71c1c' },
  blue:   { bg: 'bg-blue-500',   text: 'text-blue-400',   border: 'border-blue-500',   glow: 'neon-blue',   light: '#42a5f5', dark: '#0d47a1' },
  green:  { bg: 'bg-green-500',  text: 'text-green-400',  border: 'border-green-500',  glow: 'neon-green',  light: '#66bb6a', dark: '#1b5e20' },
  yellow: { bg: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-yellow-400', glow: 'neon-yellow', light: '#ffee58', dark: '#f57f17' },
};

export const COLOR_NAMES: Record<Color, string> = {
  red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow',
};

export interface ThemeConfig {
  name: Theme;
  background: string;
  boardBg: string;
  pathBg: string;
}

export const THEMES: Record<Theme, ThemeConfig> = {
  Classic:   { name: 'Classic',   background: '#0d0820', boardBg: 'linear-gradient(135deg, #1a0a30 0%, #0d1a3a 100%)', pathBg: '#ffffff' },
  Neon:      { name: 'Neon',      background: '#000000', boardBg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)', pathBg: '#222222' },
  Space:     { name: 'Space',     background: '#050510', boardBg: 'linear-gradient(135deg, #0b0b1a 0%, #1a1a3a 100%)', pathBg: '#e0e0e0' },
  Jungle:    { name: 'Jungle',    background: '#0b1a0b', boardBg: 'linear-gradient(135deg, #1a3a1a 0%, #0a200a 100%)', pathBg: '#e6f2e6' },
  Royal:     { name: 'Royal',     background: '#2a0a2a', boardBg: 'linear-gradient(135deg, #4a1a4a 0%, #2a0a2a 100%)', pathBg: '#f9f0e6' },
  Candy:     { name: 'Candy',     background: '#ffebf0', boardBg: 'linear-gradient(135deg, #ffcce6 0%, #ffe6ff 100%)', pathBg: '#ffffff' },
  Cyberpunk: { name: 'Cyberpunk', background: '#120424', boardBg: 'linear-gradient(135deg, #240444 0%, #001220 100%)', pathBg: '#fbf010' },
};

// 15x15 board cell definitions
export type CellType =
  | 'home-red' | 'home-blue' | 'home-green' | 'home-yellow'
  | 'center' | 'path' | 'start' | 'star'
  | 'path-red' | 'path-blue' | 'path-green' | 'path-yellow'
  | 'safe' | 'empty';

export interface BoardCell {
  row: number;
  col: number;
  type: CellType;
  pathIndex?: number;
  safeFor?: Color;
}

/**
 * Builds the 15x15 Ludo board.
 *
 * Layout (matching the reference Ludo King image):
 *   TOP-LEFT    (rows 0-5, cols 0-5)  = GREEN  home
 *   TOP-RIGHT   (rows 0-5, cols 9-14) = YELLOW home
 *   BOTTOM-LEFT (rows 9-14, cols 0-5) = RED    home
 *   BOTTOM-RIGHT(rows 9-14, cols 9-14)= BLUE   home
 *
 * Path (52 squares, clockwise):
 *   GREEN  enters at index  0  = (6,0)   going →
 *   YELLOW enters at index 13  = (0,8)   going ↓
 *   BLUE   enters at index 26  = (8,14)  going ←
 *   RED    enters at index 39  = (14,6)  going ↑
 *
 * Stars (safe non-start squares) at indices 8, 21, 34, 47:
 *   8  → (3,6)   left vertical path
 *  21  → (6,11)  right horizontal path
 *  34  → (11,8)  bottom vertical path
 *  47  → (8,3)   left horizontal path (bottom)
 *
 * Home columns (colored strips leading to center):
 *   GREEN  home col: row 7, cols 1-5  (going →)
 *   YELLOW home col: col 7, rows 1-5  (going ↓)
 *   BLUE   home col: row 7, cols 9-13 (going ←)
 *   RED    home col: col 7, rows 9-13 (going ↑)
 */
export function buildBoardCells(): BoardCell[][] {
  const grid: BoardCell[][] = Array.from({ length: 15 }, (_, r) =>
    Array.from({ length: 15 }, (_, c) => ({ row: r, col: c, type: 'empty' as CellType }))
  );

  // ── Home quadrants ──────────────────────────────────────────────
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++) grid[r][c].type = 'home-blue';   // TOP-LEFT

  for (let r = 0; r < 6; r++)
    for (let c = 9; c < 15; c++) grid[r][c].type = 'home-red'; // TOP-RIGHT

  for (let r = 9; r < 15; r++)
    for (let c = 0; c < 6; c++) grid[r][c].type = 'home-yellow';     // BOTTOM-LEFT

  for (let r = 9; r < 15; r++)
    for (let c = 9; c < 15; c++) grid[r][c].type = 'home-green';   // BOTTOM-RIGHT

  // ── Center 3×3 ─────────────────────────────────────────────────
  for (let r = 6; r < 9; r++)
    for (let c = 6; c < 9; c++) grid[r][c].type = 'center';

  // ── Outer path (52 squares, clockwise) ─────────────────────────
  const pathSquares: [number, number][] = [
    // GREEN enters here (index 0) and goes RIGHT along row 6
    [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],
    // Turn UP along col 6
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
    // Top passage
    [0,7],
    // YELLOW enters here (index 13) and goes DOWN along col 8
    [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
    // Goes RIGHT along row 6
    [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
    // Turn DOWN
    [7,14],
    // BLUE enters here (index 26) and goes LEFT along row 8
    [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
    // Goes DOWN along col 8
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
    // Bottom passage
    [14,7],
    // RED enters here (index 39) and goes UP along col 6
    [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
    // Goes LEFT along row 8
    [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
    // Turn UP
    [7,0],
  ];

  pathSquares.forEach(([r, c], i) => {
    const cell = grid[r][c];
    // Start squares (colored, no star): indices 1, 14, 27, 40
    if ([1, 14, 27, 40].includes(i)) {
      cell.type = 'start';
    // Star squares (safe, show star): indices 9, 22, 35, 48
    } else if ([9, 22, 35, 48].includes(i)) {
      cell.type = 'star';
    } else {
      cell.type = 'path';
    }
    cell.pathIndex = i;
  });

  // ── Home columns (colored strips to center) ─────────────────────
  // BLUE  home col: row 7, cols 1-5 (→)
  for (let c = 1; c <= 5; c++) {
    grid[7][c].type = 'path-blue';
    grid[7][c].pathIndex = 51 + c;
    grid[7][c].safeFor = 'blue';
  }
  // RED home col: col 7, rows 1-5 (↓)
  for (let r = 1; r <= 5; r++) {
    grid[r][7].type = 'path-red';
    grid[r][7].pathIndex = 51 + r;
    grid[r][7].safeFor = 'red';
  }
  // GREEN   home col: row 7, cols 9-13 (←)
  for (let c = 9; c <= 13; c++) {
    grid[7][c].type = 'path-green';
    grid[7][c].pathIndex = 51 + (14 - c);
    grid[7][c].safeFor = 'green';
  }
  // YELLOW    home col: col 7, rows 9-13 (↑)
  for (let r = 9; r <= 13; r++) {
    grid[r][7].type = 'path-yellow';
    grid[r][7].pathIndex = 51 + (14 - r);
    grid[r][7].safeFor = 'yellow';
  }

  return grid;
}
