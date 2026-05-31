'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getSocket } from '@/lib/socket';
import type { RoomState, Color, Token, Player } from '@/lib/gameTypes';
import { SAFE_POSITIONS, getAbsolutePosition } from '@/lib/gameTypes';
import { audioManager } from '@/lib/audio';
import { hapticFeedback } from '@/lib/haptics';
import { getIdealNumbers, smartRoll } from '@/lib/diceLogic';

const BOT_NAMES = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'];
const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];

function createTokens(color: Color): Token[] {
  return [0, 1, 2, 3].map(i => ({
    id: `${color}-${i}`,
    color,
    position: -1,
    isHome: true,
    isFinished: false,
  }));
}

const canMoveToken = (token: Token, dice: number, players: Player[]) => {
  if (token.isFinished) return false;
  if (token.isHome && dice !== 6) return false;
  if (token.isHome && dice === 6) return true;
  if (token.position + dice > 57) return false;

  return true;
};

export function useComputerGame() {
  const currentPlayerIndex = useGameStore(s => s.room?.currentPlayerIndex);
  const diceRolled = useGameStore(s => s.room?.diceRolled);
  const isConnected = useGameStore(s => s.isConnected);

  const initialized = useRef(false);
  const aiTimeout = useRef<NodeJS.Timeout | null>(null);
  const isAnimating = useRef(false);
  const pityTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    // Disconnect global socket to stop background polling errors
    const socket = getSocket();
    socket.disconnect();

    const store = useGameStore.getState();

    // Initialize local game
    store.setConnected(true);
    store.setMySocketId('local-player');
    
    const myColor: Color = 'red';
    store.setMyColor(myColor);
    store.setMyName('You');

    const players: Player[] = [
      { socketId: 'local-player', name: 'You', color: myColor, tokens: createTokens(myColor), rank: null, connected: true },
      { socketId: 'bot-1', name: BOT_NAMES[0], color: 'blue', tokens: createTokens('blue'), rank: null, connected: true },
      { socketId: 'bot-2', name: BOT_NAMES[1], color: 'green', tokens: createTokens('green'), rank: null, connected: true },
      { socketId: 'bot-3', name: BOT_NAMES[2], color: 'yellow', tokens: createTokens('yellow'), rank: null, connected: true },
    ];

    const initialState: RoomState = {
      roomId: 'computer',
      players,
      status: 'playing',
      currentPlayerIndex: 0,
      diceValue: null,
      diceRolled: false,
      hostId: 'local-player',
      settings: { maxPlayers: 4 },
      chat: [],
    };

    store.setRoom(initialState);
    store.setNotification('🎲 Game Started vs Computer!');

    return () => {
      initialized.current = false;
      if (aiTimeout.current) clearTimeout(aiTimeout.current);
    };
  }, []);

  const moveToken = useCallback((tokenId: string) => {
    const store = useGameStore.getState();
    const state = store.room;
    if (!state || state.status !== 'playing') return;
    
    const currentPlayerIdx = state.currentPlayerIndex;
    const currentPlayer = state.players[currentPlayerIdx];
    const dice = store.lastDiceRoll;
    if (!dice) return;

    const tIdx = currentPlayer.tokens.findIndex(t => t.id === tokenId);
    if (tIdx === -1) return;
    
    const token = currentPlayer.tokens[tIdx];
    if (!canMoveToken(token, dice, state.players)) return;

    isAnimating.current = true;

    store.setRoom({ ...state, diceRolled: false });

    const startPos = token.position;
    const isGettingOut = token.isHome && dice === 6;
    const endPos = isGettingOut ? 1 : token.position + dice;

    const killedIds: string[] = [];
    const absPos = getAbsolutePosition(token.color, endPos);
    let gotKill = false;

    if (endPos <= 51 && !SAFE_POSITIONS.has(absPos)) {
      state.players.forEach(p => {
        if (p.color === token.color) return;
        // STACKING RULE: 2+ same-color tokens on a cell = block, cannot be killed
        const tokensOnCell = p.tokens.filter(pt => !pt.isHome && !pt.isFinished && getAbsolutePosition(p.color, pt.position) === absPos);
        if (tokensOnCell.length >= 2) return;
        tokensOnCell.forEach(pt => {
          killedIds.push(pt.id);
          gotKill = true;
        });
      });
    }

    const finishMove = () => {
      const currentState = useGameStore.getState().room;
      const currentStore = useGameStore.getState();
      if (!currentState) return;

      const updatedToken: Token = {
        ...token,
        position: endPos,
        isHome: false,
        isFinished: endPos === 57,
      };

      // Move attacker to final position, keep killed tokens in place for now
      let newPlayers: Player[] = currentState.players.map((p, pIdx) => {
        if (pIdx === currentPlayerIdx) {
          return {
            ...p,
            tokens: p.tokens.map((t, i) => (i === tIdx ? updatedToken : t)),
          };
        }
        return p;
      });

      const updatedCurrentPlayer = newPlayers[currentPlayerIdx];
      let playerWon = false;
      if (updatedCurrentPlayer.tokens.every(t => t.isFinished)) {
        const rank = currentState.players.filter(p => p.rank !== null).length + 1;
        newPlayers = newPlayers.map((p, i) =>
          i === currentPlayerIdx ? { ...p, rank } : p
        );
        playerWon = true;
        audioManager.playVictory();
        hapticFeedback.success();
        currentStore.setWonMessage(`🏆 ${updatedCurrentPlayer.name} finished in position #${rank}!`);
        setTimeout(() => useGameStore.getState().setWonMessage(null), 4000);
      }

      const tokenFinished = endPos === 57;

      if (gotKill) {
        audioManager.playKill();
        hapticFeedback.impactHeavy();
        currentStore.setNotification('💀 Token killed! Extra turn!');
        currentStore.setKilledTokenIds(killedIds);
        setTimeout(() => useGameStore.getState().setKilledTokenIds([]), 1500);
      } else if (tokenFinished && !playerWon) {
        currentStore.setNotification('🌟 Token reached home! Extra turn!');
      } else if (dice === 6 && !playerWon) {
        currentStore.setNotification('🎯 Rolled 6! Extra turn!');
      } else {
        currentStore.setNotification(null);
      }

      let newStatus: RoomState['status'] = currentState.status;
      const activePlayers = newPlayers.filter(p => p.rank === null);
      if (playerWon && activePlayers.length <= 1) {
        newStatus = 'finished';
        if (activePlayers.length === 1) {
          const lastIdx = newPlayers.findIndex(p => p.rank === null);
          newPlayers = newPlayers.map((p, i) =>
            i === lastIdx ? { ...p, rank: newPlayers.filter(p2 => p2.rank !== null).length + 1 } : p
          );
        }
      }

      const extraTurn = !playerWon && (dice === 6 || gotKill || tokenFinished);
      let nextPlayerIndex = currentPlayerIdx;

      if (!extraTurn) {
        let next = (currentPlayerIdx + 1) % newPlayers.length;
        let safety = 0;
        while (newPlayers[next].rank !== null && safety < newPlayers.length) {
          next = (next + 1) % newPlayers.length;
          safety++;
        }
        nextPlayerIndex = next;
      }

      const finalizeRound = (finalPlayers: Player[]) => {
        isAnimating.current = false;
        useGameStore.getState().setRoom({
          ...useGameStore.getState().room!,
          players: finalPlayers,
          status: newStatus,
          currentPlayerIndex: nextPlayerIndex,
          diceRolled: false,
          diceValue: null,
          consecutiveSixes: extraTurn ? (currentState.consecutiveSixes || 0) : 0,
        });
      };

      if (!gotKill || killedIds.length === 0) {
        finalizeRound(newPlayers);
        return;
      }

      // Commit attacker's new position first
      currentStore.setRoom({
        ...currentState,
        players: newPlayers,
        diceRolled: false,
        diceValue: null,
      });

      // Track which tokens need reversing
      type KilledInfo = { pIdx: number; tIdx: number };
      const killedInfos: KilledInfo[] = [];
      newPlayers.forEach((p, pIdx) => {
        p.tokens.forEach((t, tI) => {
          if (killedIds.includes(t.id)) {
            killedInfos.push({ pIdx, tIdx: tI });
          }
        });
      });

      // Step killed tokens backward every 80ms until they reach home
      const reverseInterval = setInterval(() => {
        const s = useGameStore.getState().room;
        if (!s) { clearInterval(reverseInterval); return; }

        let allHome = true;
        const stepped = s.players.map((p, pIdx) => ({
          ...p,
          tokens: p.tokens.map((t, tI) => {
            const info = killedInfos.find(k => k.pIdx === pIdx && k.tIdx === tI);
            if (!info) return t;
            if (t.isHome) return t;
            audioManager.playTokenMove();
            const nextPos = t.position - 1;
            if (nextPos <= 0) {
              return { ...t, position: -1, isHome: true };
            }
            allHome = false;
            return { ...t, position: nextPos };
          }),
        }));

        useGameStore.getState().setRoom({ ...s, players: stepped });

        if (allHome) {
          clearInterval(reverseInterval);
          setTimeout(() => finalizeRound(useGameStore.getState().room!.players), 200);
        }
      }, 80);
    };

    if (isGettingOut) {
      audioManager.playTokenMove();
      hapticFeedback.impactMedium();
      
      const stepState = useGameStore.getState().room!;
      const stepPlayers = stepState.players.map((p, i) => i === currentPlayerIdx ? {
        ...p,
        tokens: p.tokens.map(t => t.id === tokenId ? { ...t, position: 1, isHome: false } : t)
      } : p);
      store.setRoom({ ...stepState, players: stepPlayers, diceRolled: false });

      setTimeout(finishMove, 300);
    } else {
      let currentStep = startPos + 1;
      const stepInterval = setInterval(() => {
        audioManager.playTokenMove();
        hapticFeedback.impactLight();
        
        const stepState = useGameStore.getState().room!;
        const stepPlayers = stepState.players.map((p, i) => i === currentPlayerIdx ? {
          ...p,
          tokens: p.tokens.map(t => t.id === tokenId ? { ...t, position: currentStep, isHome: false } : t)
        } : p);
        
        useGameStore.getState().setRoom({ ...stepState, players: stepPlayers, diceRolled: false });
        
        if (currentStep >= endPos) {
          clearInterval(stepInterval);
          setTimeout(finishMove, 300);
        } else {
          currentStep++;
        }
      }, 250);
    }
  }, []);

  const rollDice = useCallback(() => {
    const store = useGameStore.getState();
    const state = store.room;
    if (!state || state.status !== 'playing') return;
    
    store.setIsRolling(true);
    setTimeout(() => {
      const latestStore = useGameStore.getState();
      const latestState = latestStore.room;
      if (!latestState || latestState.status !== 'playing') return;

      const currentPlayer = latestState.players[latestState.currentPlayerIndex];
      
      let consecutiveSixes = latestState.consecutiveSixes || 0;
      const blockSix = consecutiveSixes >= 2;

      let ideal = getIdealNumbers(currentPlayer, latestState.players);
      if (blockSix) ideal = ideal.filter(n => n !== 6);
      
      let dice = Math.floor(Math.random() * 6) + 1;

      // Aman Protection: Never come in last
      const activePlayers = latestState.players.filter(p => p.rank === null);
      const isAman = currentPlayer.name.trim().toLowerCase() === 'aman';
      const amanInDanger = activePlayers.length === 2 && activePlayers.some(p => p.name.trim().toLowerCase() === 'aman');

      if (amanInDanger) {
        if (isAman) {
          if (ideal.length > 0 && Math.random() < 0.85) {
            dice = ideal[Math.floor(Math.random() * ideal.length)];
          }
        } else {
          let attempts = 0;
          while (ideal.includes(dice) && attempts < 15) {
            dice = Math.floor(Math.random() * 6) + 1;
            attempts++;
          }
          if (dice === 6 && Math.random() < 0.8) dice = Math.floor(Math.random() * 5) + 1;
        }
      }

      if (blockSix && dice === 6) dice = Math.floor(Math.random() * 5) + 1;
      
      // Pity timer to guarantee a 6 after 10 unlucky rolls
      const withoutSix = pityTimers.current[currentPlayer.socketId] || 0;
      if (dice !== 6) {
        if (withoutSix >= 10 && !blockSix) {
          dice = 6;
          pityTimers.current[currentPlayer.socketId] = 0;
        } else {
          pityTimers.current[currentPlayer.socketId] = withoutSix + 1;
        }
      } else {
        pityTimers.current[currentPlayer.socketId] = 0;
      }

      if (dice === 6) consecutiveSixes++;
      else consecutiveSixes = 0;

      const newState: RoomState = { ...latestState, diceRolled: true, diceValue: dice, consecutiveSixes };

      audioManager.playDiceRoll();
      hapticFeedback.impactLight();
      latestStore.setLastDiceRoll(dice);
      latestStore.setIsRolling(false);
      latestStore.setRoom(newState);

      const movableTokens = currentPlayer.tokens.filter(t => canMoveToken(t, dice, latestState.players));
      
      if (movableTokens.length === 0) {
        latestStore.setNotification('No valid moves. Turn skipped.');
        setTimeout(() => {
          const freshStore = useGameStore.getState();
          const freshState = freshStore.room;
          if (!freshState || freshState.status !== 'playing') return;
          let next = (freshState.currentPlayerIndex + 1) % freshState.players.length;
          let safety = 0;
          while (freshState.players[next].rank !== null && safety < freshState.players.length) {
            next = (next + 1) % freshState.players.length;
            safety++;
          }
          freshStore.setRoom({ ...freshState, diceRolled: false, diceValue: null, currentPlayerIndex: next });
        }, 1500);
      } else if (movableTokens.length === 1 && currentPlayer.socketId === 'local-player') {
        // AUTO-MOVE RULE: only 1 valid token → move automatically
        setTimeout(() => moveToken(movableTokens[0].id), 700);
      }
    }, 600);
  }, [moveToken]);

  const makeAIMove = useCallback((room: RoomState, bot: Player) => {
    const dice = useGameStore.getState().lastDiceRoll;
    if (!dice) return;

    const movableTokens = bot.tokens.filter(t => canMoveToken(t, dice, room.players));
    if (movableTokens.length === 0) return;

    let chosenToken = movableTokens[0];
    
    const homeTokens = movableTokens.filter(t => t.isHome);
    if (homeTokens.length > 0) chosenToken = homeTokens[0];

    for (const t of movableTokens) {
      const newPos = t.isHome ? 1 : t.position + dice;
      const absPos = getAbsolutePosition(t.color, newPos);
      
      if (newPos <= 51 && !SAFE_POSITIONS.has(absPos)) {
        const canKill = room.players.some(p => p.socketId !== bot.socketId && p.tokens.some(pt => !pt.isHome && !pt.isFinished && getAbsolutePosition(p.color, pt.position) === absPos));
        if (canKill) {
          chosenToken = t;
          break;
        }
      }
      
      if (newPos <= 51 && SAFE_POSITIONS.has(absPos)) {
        chosenToken = t;
      }
    }

    moveToken(chosenToken.id);
  }, [moveToken]);

  const diceValue = useGameStore(s => s.room?.diceValue);

  // AI logic effect
  useEffect(() => {
    if (aiTimeout.current) {
      clearTimeout(aiTimeout.current);
      aiTimeout.current = null;
    }

    if (isAnimating.current) return;
    const room = useGameStore.getState().room;
    if (!room || room.status !== 'playing') return;

    const currentPlayer = room.players[room.currentPlayerIndex];
    if (currentPlayer.socketId !== 'local-player') {
      if (!room.diceRolled) {
        aiTimeout.current = setTimeout(() => rollDice(), 1000);
      } else {
        aiTimeout.current = setTimeout(() => makeAIMove(room, currentPlayer), 1000);
      }
    }
    
    return () => {
      if (aiTimeout.current) {
        clearTimeout(aiTimeout.current);
        aiTimeout.current = null;
      }
    };
  }, [currentPlayerIndex, diceRolled, diceValue, rollDice, makeAIMove]);

  // Expose rollDice with roomId signature for compatibility with GameUI
  const rollDiceCompat = useCallback(() => rollDice(), [rollDice]);
  const moveTokenCompat = useCallback((_roomId: string, tokenId: string) => moveToken(tokenId), [moveToken]);

  return {
    socket: null,
    isConnected: isConnected,
    rollDice: rollDiceCompat,
    moveToken: moveTokenCompat,
    sendChat: () => {},
    sendEmoji: (_roomId: string, emoji: string) => {
      useGameStore.getState().setEmojiReaction({ emoji, color: 'red', name: 'You' });
      setTimeout(() => useGameStore.getState().setEmojiReaction(null), 3000);
    },
  };
}

// Suppress unused variable warning for COLORS (used for type checking only)
void COLORS;
