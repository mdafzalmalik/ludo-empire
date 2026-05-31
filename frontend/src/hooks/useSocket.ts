'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/store/useGameStore';
import type { RoomState, Color } from '@/lib/gameTypes';
import { audioManager } from '@/lib/audio';
import { hapticFeedback } from '@/lib/haptics';

export function useSocket() {
  const isConnected = useGameStore(s => s.isConnected);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on('connect', () => {
      useGameStore.getState().setMySocketId(socket.id!);
      useGameStore.getState().setConnected(true);
    });

    socket.on('disconnect', () => {
      useGameStore.getState().setConnected(false);
      useGameStore.getState().setNotification('Disconnected from server. Reconnecting...');
    });

    socket.on('reconnect', () => {
      useGameStore.getState().setConnected(true);
      useGameStore.getState().setNotification('Reconnected!');
    });

    socket.on('room_state', (room: RoomState) => {
      useGameStore.getState().setRoom(room);
    });

    socket.on('game_started', (room: RoomState) => {
      useGameStore.getState().setRoom(room);
      useGameStore.getState().setNotification('🎲 Game Started!');
    });

    socket.on('dice_rolled', (data: { dice: number; playerId: string; penalty: boolean; canMove: boolean; movableCount?: number; state: RoomState }) => {
      audioManager.playDiceRoll();
      hapticFeedback.impactLight();
      const st = useGameStore.getState();
      st.setLastDiceRoll(data.dice);
      st.setIsRolling(false);
      st.setRoom(data.state);
      if (data.penalty) st.setNotification('⚠️ Triple 6! Turn skipped!');
      else if (!data.canMove) st.setNotification('No valid moves. Turn skipped.');
      
      // AUTO-MOVE RULE: if only 1 token can move, move it automatically
      const currentSocket = getSocket();
      const mySocketId = st.mySocketId;
      if (data.canMove && data.movableCount === 1 && data.playerId === mySocketId) {
        const room = data.state;
        const currentPlayer = room.players[room.currentPlayerIndex];
        const movableToken = currentPlayer.tokens.find(t => {
          if (t.isFinished) return false;
          if (t.isHome && data.dice !== 6) return false;
          if (t.isHome && data.dice === 6) return true;
          return t.position + data.dice <= 57;
        });
        if (movableToken) {
          setTimeout(() => currentSocket.emit('move_token', { roomId: room.roomId, tokenId: movableToken.id }), 700);
        }
      }
    });

    socket.on('token_moved', (data: { killedIds: string[]; gotKill: boolean; extraTurn: boolean; playerWon: boolean; state: RoomState }) => {
      audioManager.playTokenMove();
      hapticFeedback.impactMedium();
      const st = useGameStore.getState();
      st.setRoom(data.state);
      st.setKilledTokenIds(data.killedIds);
      if (data.gotKill) {
        audioManager.playKill();
        hapticFeedback.impactHeavy();
        st.setNotification('💀 Token killed! Extra turn!');
      }
      else if (data.extraTurn) st.setNotification('🎯 Rolled 6! Extra turn!');
      else st.setNotification(null);
      setTimeout(() => useGameStore.getState().setKilledTokenIds([]), 1500);
    });

    socket.on('player_won', (data: { color: Color; name: string; rank: number }) => {
      audioManager.playVictory();
      hapticFeedback.success();
      useGameStore.getState().setWonMessage(`🏆 ${data.name} finished in position #${data.rank}!`);
      setTimeout(() => useGameStore.getState().setWonMessage(null), 4000);
    });

    socket.on('game_finished', (room: RoomState) => {
      useGameStore.getState().setRoom(room);
    });

    socket.on('player_disconnected', (data: { color: Color; name: string }) => {
      useGameStore.getState().setNotification(`${data.name} disconnected...`);
    });

    socket.on('emoji_reaction', (data: { emoji: string; color: Color; name: string }) => {
      useGameStore.getState().setEmojiReaction(data);
      setTimeout(() => useGameStore.getState().setEmojiReaction(null), 3000);
    });

    socket.on('chat_message', () => {
      // Chat is part of room state, handled via room_state updates
      // but server also emits individual messages for efficiency
    });

    if (!socket.connected) socket.connect();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('room_state');
      socket.off('game_started');
      socket.off('dice_rolled');
      socket.off('token_moved');
      socket.off('player_won');
      socket.off('game_finished');
      socket.off('player_disconnected');
      socket.off('emoji_reaction');
      initialized.current = false;
    };
  }, []);

  const socket = getSocket();

  return {
    socket,
    isConnected,
    createRoom: (name: string, maxPlayers: 2 | 4, cb: (res: { success: boolean; color?: Color; playerIndex?: number; error?: string }) => void) => {
      socket.emit('create_room', { name, maxPlayers }, cb);
    },
    joinRoom: (roomId: string, name: string, cb: (res: { success: boolean; color?: Color; playerIndex?: number; error?: string }) => void) => {
      socket.emit('join_room', { roomId, name }, cb);
    },
    startGame: (roomId: string, cb?: (res: { success: boolean }) => void) => {
      socket.emit('start_game', { roomId }, cb);
    },
    rollDice: (roomId: string, cb?: (res: { success: boolean }) => void) => {
      useGameStore.getState().setIsRolling(true);
      socket.emit('roll_dice', { roomId }, cb);
    },
    moveToken: (roomId: string, tokenId: string, cb?: (res: { success: boolean }) => void) => {
      socket.emit('move_token', { roomId, tokenId }, cb);
    },
    sendChat: (roomId: string, text: string) => {
      socket.emit('chat_message', { roomId, text });
    },
    sendEmoji: (roomId: string, emoji: string) => {
      socket.emit('emoji_reaction', { roomId, emoji });
    },
  };
}
