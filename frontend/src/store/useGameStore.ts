import { create } from 'zustand';
import type { RoomState, Color, Theme } from '@/lib/gameTypes';

interface GameStore {
  // Connection
  mySocketId: string | null;
  myColor: Color | null;
  myName: string;
  myPlayerIndex: number | null;

  // Room
  room: RoomState | null;
  isConnected: boolean;
  theme: Theme;

  // UI state
  lastDiceRoll: number | null;
  isRolling: boolean;
  killedTokenIds: string[];
  wonMessage: string | null;
  emojiReaction: { emoji: string; color: Color; name: string } | null;
  notification: string | null;

  // Actions
  setMySocketId: (id: string) => void;
  setMyColor: (c: Color) => void;
  setMyName: (n: string) => void;
  setMyPlayerIndex: (i: number) => void;
  setRoom: (room: RoomState) => void;
  setConnected: (v: boolean) => void;
  setTheme: (t: Theme) => void;
  setLastDiceRoll: (v: number | null) => void;
  setIsRolling: (v: boolean) => void;
  setKilledTokenIds: (ids: string[]) => void;
  setWonMessage: (msg: string | null) => void;
  setEmojiReaction: (r: { emoji: string; color: Color; name: string } | null) => void;
  setNotification: (msg: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  mySocketId: null,
  myColor: null,
  myName: '',
  myPlayerIndex: null,
  room: null,
  isConnected: false,
  theme: 'Classic',
  lastDiceRoll: null,
  isRolling: false,
  killedTokenIds: [],
  wonMessage: null,
  emojiReaction: null,
  notification: null,

  setMySocketId: (id) => set({ mySocketId: id }),
  setMyColor: (c) => set({ myColor: c }),
  setMyName: (n) => set({ myName: n }),
  setMyPlayerIndex: (i) => set({ myPlayerIndex: i }),
  setRoom: (room) => set({ room }),
  setConnected: (v) => set({ isConnected: v }),
  setTheme: (t) => set({ theme: t }),
  setLastDiceRoll: (v) => set({ lastDiceRoll: v }),
  setIsRolling: (v) => set({ isRolling: v }),
  setKilledTokenIds: (ids) => set({ killedTokenIds: ids }),
  setWonMessage: (msg) => set({ wonMessage: msg }),
  setEmojiReaction: (r) => set({ emojiReaction: r }),
  setNotification: (msg) => set({ notification: msg }),
  reset: () => set((state) => ({
    mySocketId: null, myColor: null, myName: '', myPlayerIndex: null,
    room: null, isConnected: false, lastDiceRoll: null, isRolling: false,
    killedTokenIds: [], wonMessage: null, emojiReaction: null, notification: null,
    theme: state.theme, // keep theme
  })),
}));
