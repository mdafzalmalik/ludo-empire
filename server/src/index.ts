import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const FRONTEND_URL = process.env.FRONTEND_URL || '*';

const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
});

// ── Types ──────────────────────────────────────────────────────────────────────
type Color = 'red' | 'blue' | 'green' | 'yellow';

interface Token {
  id: string; // e.g. "red-0"
  color: Color;
  position: number; // -1 = home base, 0-56 = board path, 57 = finished
  isHome: boolean;
  isFinished: boolean;
}

interface Player {
  socketId: string;
  name: string;
  color: Color;
  tokens: Token[];
  rank: number | null;
  connected: boolean;
}

interface ChatMessage {
  playerId: string;
  playerName: string;
  color: Color;
  text: string;
  timestamp: number;
}

interface GameState {
  roomId: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  consecutiveSixes: number;
  chat: ChatMessage[];
  winnersCount: number;
  settings: { maxPlayers: 2 | 4 };
  hostId: string;
  isAnimating?: boolean;
  pityTimers?: Record<string, number>;
}

// ── In-memory store ────────────────────────────────────────────────────────────
const rooms = new Map<string, GameState>();
const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];

// ── Helper functions ───────────────────────────────────────────────────────────
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createTokens(color: Color): Token[] {
  return [0, 1, 2, 3].map(i => ({
    id: `${color}-${i}`,
    color,
    position: -1,
    isHome: true,
    isFinished: false,
  }));
}

// Standard Ludo board path offsets per color
// Each color enters the board at a specific square
const COLOR_START: Record<Color, number> = { blue: 1, red: 14, green: 27, yellow: 40 };
const SAFE_SQUARES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

/** Returns all "ideal" dice values (1-6) for the current player given the board state. */
function getIdealNumbers(player: Player, allPlayers: Player[]): number[] {
  const ideal: number[] = [];
  const offset = COLOR_START[player.color];

  player.tokens.forEach(token => {
    if (token.isFinished) return;

    // Opening move: need a 6
    if (token.isHome) {
      ideal.push(6);
      return;
    }

    const relPos = token.position;

    // Reach home: need exact steps to 57
    const stepsToHome = 57 - relPos;
    if (stepsToHome >= 1 && stepsToHome <= 6) {
      ideal.push(stepsToHome);
    }

    // Kill an opponent: check each step 1-6
    for (let dice = 1; dice <= 6; dice++) {
      const targetRel = relPos + dice;
      if (targetRel > 51) continue; // entering home column
      const targetAbs = (offset + targetRel - 1) % 52;
      if (SAFE_SQUARES.has(targetAbs)) continue; // safe square

      for (const opponent of allPlayers) {
        if (opponent.color === player.color) continue;
        const oppOffset = COLOR_START[opponent.color];
        const killable = opponent.tokens.some(t => {
          if (t.isHome || t.isFinished || t.position > 51) return false;
          const oppAbs = (oppOffset + t.position - 1) % 52;
          return oppAbs === targetAbs;
        });
        if (killable) {
          ideal.push(dice);
          break;
        }
      }
    }
  });

  return ideal;
}

function smartRoll(ideal: number[]): number {
  // Fair dice roll: 1-6
  return Math.floor(Math.random() * 6) + 1;
}

function getAbsolutePosition(color: Color, relativePos: number): number {
  // relativePos: 1 = first board square for this color, 51-56 = home column
  const start = COLOR_START[color];
  if (relativePos <= 0) return -1;
  if (relativePos >= 57) return 57;
  return (start + relativePos - 1) % 52;
}


function canMoveToken(token: Token, dice: number, players: Player[]): boolean {
  if (token.isFinished) return false;
  if (token.isHome && dice !== 6) return false;
  if (token.isHome && dice === 6) return true;
  // relative position
  const relPos = token.position;
  if (relPos + dice > 57) return false; // overshoot home

  return true;
}



function checkKill(board: GameState, movedToken: Token): string[] {
  const killedIds: string[] = [];
  const absPos = getAbsolutePosition(movedToken.color, movedToken.position);
  if (movedToken.position > 51 || movedToken.isFinished) return killedIds;
  if (SAFE_SQUARES.has(absPos)) return killedIds;

  board.players.forEach(player => {
    if (player.color === movedToken.color) return;
    // Count how many of this opponent's tokens are on this square
    const tokensOnCell = player.tokens.filter(t => !t.isHome && !t.isFinished && getAbsolutePosition(t.color, t.position) === absPos);
    // STACKING RULE: 2+ same-color tokens = block; cannot be killed
    if (tokensOnCell.length >= 2) return;
    tokensOnCell.forEach(token => {
      killedIds.push(token.id);
    });
  });
  return killedIds;
}

function applyKills(board: GameState, killedIds: string[]): void {
  killedIds.forEach(id => {
    const [color] = id.split('-') as [Color, string];
    const player = board.players.find(p => p.color === color);
    if (!player) return;
    const token = player.tokens.find(t => t.id === id);
    if (!token) return;
    token.position = -1;
    token.isHome = true;
  });
}

function checkPlayerWon(player: Player): boolean {
  return player.tokens.every(t => t.isFinished);
}

function advanceTurn(board: GameState): void {
  board.diceRolled = false;
  board.diceValue = null;
  board.consecutiveSixes = 0;
  let next = (board.currentPlayerIndex + 1) % board.players.length;
  let safety = 0;
  while (safety < board.players.length) {
    const p = board.players[next];
    if (p.rank === null) break; // still playing
    next = (next + 1) % board.players.length;
    safety++;
  }
  board.currentPlayerIndex = next;
}

function getProgressScore(player: Player): number {
  return player.tokens.reduce((sum, t) => {
    if (t.isFinished) return sum + 57;
    if (t.isHome) return sum + 0;
    return sum + t.position;
  }, 0);
}

function biasedRoll(
  currentPlayer: Player,
  allPlayers: Player[],
  ideal: number[],
  blockSix: boolean,
  pityRoll: boolean
): number {
  const isAman = currentPlayer.name.trim().toLowerCase() === 'aman';
  const activePlayers = allPlayers.filter(p => p.rank === null);
  const activeCount = activePlayers.length;

  const amanLastDanger =
    isAman && activeCount === 2 && activePlayers.some(p => p.name.trim().toLowerCase() === 'aman');

  const scores = activePlayers.map(p => ({ color: p.color, score: getProgressScore(p) }));
  scores.sort((a, b) => a.score - b.score);
  const amanIsLast = isAman && scores.length > 0 && scores[0].color === currentPlayer.color;

  let roll = Math.floor(Math.random() * 6) + 1;

  if (pityRoll) {
    return blockSix ? Math.floor(Math.random() * 5) + 1 : 6;
  }

  const universalBiasChance = 0.22;
  if (ideal.length > 0 && Math.random() < universalBiasChance) {
    const candidate = ideal[Math.floor(Math.random() * ideal.length)];
    if (!blockSix || candidate !== 6) roll = candidate;
  }

  if (isAman && ideal.length > 0) {
    let amanExtraChance = 0.20;

    if (amanIsLast) amanExtraChance = 0.30;

    if (amanLastDanger) amanExtraChance = 0.50;

    if (Math.random() < amanExtraChance) {
      const candidate = ideal[Math.floor(Math.random() * ideal.length)];
      if (!blockSix || candidate !== 6) roll = candidate;
    }
  }

  if (!isAman && amanLastDanger) {
    if (ideal.includes(roll) && Math.random() < 0.35) {
      const reroll = Math.floor(Math.random() * 6) + 1;
      if (!ideal.includes(reroll) || Math.random() < 0.4) {
        roll = reroll;
      }
    }
    if (roll === 6 && Math.random() < 0.40) {
      roll = Math.floor(Math.random() * 5) + 1;
    }
  }

  if (blockSix && roll === 6) {
    roll = Math.floor(Math.random() * 5) + 1;
  }

  return roll;
}

function roomSummary(board: GameState) {
  return {
    roomId: board.roomId,
    players: board.players.map(p => ({
      socketId: p.socketId,
      name: p.name,
      color: p.color,
      tokens: p.tokens,
      rank: p.rank,
      connected: p.connected,
    })),
    status: board.status,
    currentPlayerIndex: board.currentPlayerIndex,
    diceValue: board.diceValue,
    diceRolled: board.diceRolled,
    hostId: board.hostId,
    settings: board.settings,
    chat: board.chat.slice(-50),
  };
}

// ── Socket handlers ────────────────────────────────────────────────────────────
io.on('connection', (socket: Socket) => {

  // CREATE ROOM
  socket.on('create_room', ({ name, maxPlayers }: { name: string; maxPlayers: 2 | 4 }, cb: Function) => {
    const roomId = generateRoomId();
    const color = COLORS[0];
    const player: Player = {
      socketId: socket.id,
      name: name || 'Player 1',
      color,
      tokens: createTokens(color),
      rank: null,
      connected: true,
    };
    const state: GameState = {
      roomId,
      players: [player],
      status: 'waiting',
      currentPlayerIndex: 0,
      diceValue: null,
      diceRolled: false,
      consecutiveSixes: 0,
      chat: [],
      winnersCount: 0,
      settings: { maxPlayers: maxPlayers || 4 },
      hostId: socket.id,
    };
    rooms.set(roomId, state);
    socket.join(roomId);
    cb({ success: true, roomId, color, playerIndex: 0 });
    io.to(roomId).emit('room_state', roomSummary(state));

  });

  // JOIN ROOM
  socket.on('join_room', ({ roomId, name }: { roomId: string; name: string }, cb: Function) => {
    const state = rooms.get(roomId);
    if (!state) return cb({ success: false, error: 'Room not found' });
    if (state.status === 'playing') {
      // Reconnect logic
      const existing = state.players.find(p => p.name === name && !p.connected);
      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        socket.join(roomId);
        cb({ success: true, roomId, color: existing.color, playerIndex: state.players.indexOf(existing), reconnected: true });
        io.to(roomId).emit('room_state', roomSummary(state));
        return;
      }
      return cb({ success: false, error: 'Game already in progress' });
    }
    if (state.players.length >= state.settings.maxPlayers) {
      return cb({ success: false, error: 'Room is full' });
    }
    const color = COLORS[state.players.length];
    const player: Player = {
      socketId: socket.id,
      name: name || `Player ${state.players.length + 1}`,
      color,
      tokens: createTokens(color),
      rank: null,
      connected: true,
    };
    state.players.push(player);
    socket.join(roomId);
    cb({ success: true, roomId, color, playerIndex: state.players.length - 1 });
    io.to(roomId).emit('room_state', roomSummary(state));
  });

  // START GAME
  socket.on('start_game', ({ roomId }: { roomId: string }, cb: Function) => {
    const state = rooms.get(roomId);
    if (!state) return cb?.({ success: false, error: 'Room not found' });
    if (state.hostId !== socket.id) return cb?.({ success: false, error: 'Not the host' });
    if (state.players.length < 2) return cb?.({ success: false, error: 'Need at least 2 players' });
    state.status = 'playing';
    state.currentPlayerIndex = 0;
    io.to(roomId).emit('game_started', roomSummary(state));
    cb?.({ success: true });
  });

  // ROLL DICE
  socket.on('roll_dice', ({ roomId }: { roomId: string }, cb: Function) => {
    const state = rooms.get(roomId);
    if (!state || state.status !== 'playing') return;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.socketId !== socket.id) return;
    if (state.diceRolled || state.isAnimating) return;

    if (!state.pityTimers) state.pityTimers = {};
    const withoutSix = state.pityTimers[socket.id] || 0;
    const ideal = getIdealNumbers(currentPlayer, state.players);
    const blockSix = state.consecutiveSixes >= 2;

    // Pity: if player hasn't seen a 6 in 10+ rolls, guarantee one (unless blockSix)
    const pityFired = withoutSix >= 10 && !blockSix;

    // Use the unified biasedRoll function — handles all nudges for Aman and other players
    let dice = biasedRoll(currentPlayer, state.players, ideal.filter(n => blockSix ? n !== 6 : true), blockSix, pityFired);

    // Update pity counter
    if (dice === 6) {
      state.pityTimers[socket.id] = 0;
    } else {
      state.pityTimers[socket.id] = pityFired ? 0 : withoutSix + 1;
    }

    // Final blockSix safety net
    if (blockSix && dice === 6) dice = Math.floor(Math.random() * 5) + 1;

    state.diceValue = dice;
    state.diceRolled = true;

    if (dice === 6) state.consecutiveSixes++;
    else state.consecutiveSixes = 0;

    // Check if any move is possible
    const movableTokens = currentPlayer.tokens.filter(t => canMoveToken(t, dice, state.players));
    const canMove = movableTokens.length > 0;
    if (!canMove) {
      // Auto-advance turn after a short delay so clients can show the roll
      setTimeout(() => {
        advanceTurn(state);
        io.to(roomId).emit('room_state', roomSummary(state));
      }, 1500);
    }

    io.to(roomId).emit('dice_rolled', { dice, playerId: socket.id, penalty: false, canMove, movableCount: movableTokens.length, state: roomSummary(state) });
    cb?.({ success: true, dice });
  });

  // MOVE TOKEN
  socket.on('move_token', ({ roomId, tokenId }: { roomId: string; tokenId: string }, cb: Function) => {
    const state = rooms.get(roomId);
    if (!state || state.status !== 'playing') return;
    const currentPlayerIdx = state.currentPlayerIndex;
    const currentPlayer = state.players[currentPlayerIdx];
    if (currentPlayer.socketId !== socket.id) return;
    if (!state.diceRolled || state.diceValue === null || state.isAnimating) return;

    const tokenIdx = currentPlayer.tokens.findIndex(t => t.id === tokenId);
    if (tokenIdx === -1) return;
    const token = currentPlayer.tokens[tokenIdx];
    const dice = state.diceValue;
    if (!canMoveToken(token, dice, state.players)) return cb?.({ success: false, error: 'Invalid move' });

    state.isAnimating = true;

    // Disable diceRolled so no other token can be moved during animation
    state.diceRolled = false;
    state.diceValue = null; // Clear dice value so it doesn't get used again

    const startPos = token.position;
    const isGettingOut = token.isHome && dice === 6;
    const endPos = isGettingOut ? 1 : token.position + dice;

    // --- Check kills ahead of time on final pos ---
    const updatedToken = { ...token, position: endPos, isHome: false, isFinished: endPos === 57 };
    const killedIds = checkKill(state, updatedToken);
    const gotKill = killedIds.length > 0;

    const finishMove = () => {
      // Set final position
      token.position = endPos;
      token.isHome = false;
      if (endPos === 57) token.isFinished = true;

      // Apply kills
      applyKills(state, killedIds);

      // Check win
      let playerWon = false;
      if (checkPlayerWon(currentPlayer)) {
        state.winnersCount++;
        currentPlayer.rank = state.winnersCount;
        playerWon = true;
        io.to(roomId).emit('player_won', { color: currentPlayer.color, name: currentPlayer.name, rank: currentPlayer.rank });
      }

      // Check game over
      const activePlayers = state.players.filter(p => p.rank === null);
      if (activePlayers.length <= 1) {
        state.status = 'finished';
        if (activePlayers.length === 1) {
          activePlayers[0].rank = state.winnersCount + 1;
        }
        io.to(roomId).emit('game_finished', roomSummary(state));
        return;
      }

      // Extra turn on 6, kill, or token reaching home
      const tokenFinished = endPos === 57;
      const extraTurn = dice === 6 || gotKill || tokenFinished;
      if (!extraTurn || playerWon) {
        advanceTurn(state);
      } else {
        // give turn back to the player, wait for roll
        state.diceRolled = false;
        state.diceValue = null;
      }

      io.to(roomId).emit('token_moved', {
        tokenId,
        killedIds,
        gotKill,
        extraTurn: !playerWon && extraTurn,
        playerWon,
        state: roomSummary(state),
      });
      state.isAnimating = false;
      cb?.({ success: true });
    };

    if (isGettingOut) {
      token.position = 1;
      token.isHome = false;
      io.to(roomId).emit('room_state', roomSummary(state));
      setTimeout(finishMove, 300);
    } else {
      let currentStep = startPos + 1;
      const stepInterval = setInterval(() => {
        token.position = currentStep;
        io.to(roomId).emit('room_state', roomSummary(state));
        
        if (currentStep >= endPos) {
          clearInterval(stepInterval);
          setTimeout(finishMove, 300);
        } else {
          currentStep++;
        }
      }, 250);
    }
  });

  // CHAT
  socket.on('chat_message', ({ roomId, text }: { roomId: string; text: string }) => {
    const state = rooms.get(roomId);
    if (!state) return;
    const player = state.players.find(p => p.socketId === socket.id);
    if (!player) return;
    const msg: ChatMessage = {
      playerId: socket.id,
      playerName: player.name,
      color: player.color,
      text: text.slice(0, 200),
      timestamp: Date.now(),
    };
    state.chat.push(msg);
    if (state.chat.length > 100) state.chat.shift();
    io.to(roomId).emit('chat_message', msg);
  });

  // EMOJI REACTION
  socket.on('emoji_reaction', ({ roomId, emoji }: { roomId: string; emoji: string }) => {
    const state = rooms.get(roomId);
    if (!state) return;
    const player = state.players.find(p => p.socketId === socket.id);
    if (!player) return;
    io.to(roomId).emit('emoji_reaction', { emoji, color: player.color, name: player.name });
  });

  // DISCONNECT
  socket.on('disconnect', () => {

    rooms.forEach((state, roomId) => {
      const player = state.players.find(p => p.socketId === socket.id);
      if (!player) return;
      player.connected = false;
      io.to(roomId).emit('player_disconnected', { color: player.color, name: player.name });
      io.to(roomId).emit('room_state', roomSummary(state));
      // Remove empty waiting rooms
      if (state.status === 'waiting' && state.players.every(p => !p.connected)) {
        rooms.delete(roomId);
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`🎲 Ludo Empire Server on :${PORT}`));
