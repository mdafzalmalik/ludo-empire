/**
 * Smart Dice Logic — shared between useComputerGame and usePassNPlayGame.
 *
 * Analyses the current board state for the active player and returns an array
 * of "ideal" dice values (1-6) that would let them:
 *   • Open a token from base         → needs a 6
 *   • Kill an opponent token         → needs the exact distance to that token
 *   • Reach the Home triangle        → needs the exact remaining steps
 *
 * The caller should use these to bias the dice roll.
 */

import type { Color, Player, Token } from './gameTypes';
import { SAFE_POSITIONS, getAbsolutePosition } from './gameTypes';

/** Absolute board position offsets per colour (must match server). */
const COLOR_OFFSETS: Record<Color, number> = {
  blue: 1, red: 14, green: 27, yellow: 40,
};

/**
 * Returns all ideal dice numbers (1-6) for the given player and board state.
 * Duplicates allowed — a number appearing twice means it's doubly valuable.
 */
export function getIdealNumbers(player: Player, allPlayers: Player[]): number[] {
  const ideal: number[] = [];
  const offset = COLOR_OFFSETS[player.color];

  player.tokens.forEach(token => {
    if (token.isFinished) return;

    // ── Opening move: need a 6 ────────────────────────────────────────
    if (token.isHome) {
      ideal.push(6);
      return;
    }

    const relPos = token.position;

    // ── Reach home: need exact steps to 57 ───────────────────────────
    const stepsToHome = 57 - relPos;
    if (stepsToHome >= 1 && stepsToHome <= 6) {
      ideal.push(stepsToHome);
    }

    // ── Kill an opponent: check each step 1-6 ────────────────────────
    for (let dice = 1; dice <= 6; dice++) {
      const targetRel = relPos + dice;
      if (targetRel > 51) continue; // entering home column, no enemies there
      const targetAbs = (offset + targetRel - 1) % 52;
      if (SAFE_POSITIONS.has(targetAbs)) continue; // safe square, no kill

      for (const opponent of allPlayers) {
        if (opponent.color === player.color) continue;
        const oppOffset = COLOR_OFFSETS[opponent.color];
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

export function smartRoll(ideal: number[], bias = 0.8): number {
  // Fair dice roll: 1-6
  return Math.floor(Math.random() * 6) + 1;
}

// Prevent unused-import lint warnings when imported by strict checkers
void getAbsolutePosition;
