// WHAT: A smarter autoMove that prefers captures over raw advancement.
// MODIFY: server/utils/ludoEngine.ts — replace the autoMove function body
// Current AI: picks token with highest steps (furthest from home).
// Better AI: prefer tokens that capture an opponent, then prefer furthest token.

// ── CURRENT autoMove (for reference) ────────────────────────────────────
/*
  export function autoMove(state) {
    ...
    let best = validIndices[0];
    for (const idx of validIndices) {
      if (player.tokens[idx].steps > player.tokens[best].steps) best = idx;
    }
    return { newState: applyMove(state, best), tokenIndex: best };
  }
*/

// ── SMARTER AI: prefer captures ──────────────────────────────────────────
// Drop-in replacement for the selection logic inside autoMove().
// Replace the "Prefer capturing move" comment and selection block with:

interface Token { id: number; steps: number; }
interface Player { userId: string; color: string; tokens: Token[]; rank: number | null; isConnected: boolean; isAI: boolean; }
interface GameState { players: Player[]; currentPlayerIndex: number; diceValue: number | null; [key: string]: any; }

const COLOR_OFFSETS: Record<string, number> = { red: 0, blue: 13, yellow: 26, green: 39 };
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function getAbsSquare(steps: number, color: string): number {
  return (steps - 1 + COLOR_OFFSETS[color]) % 52;
}

function wouldCapture(state: GameState, playerIndex: number, tokenIndex: number, dice: number): boolean {
  const player = state.players[playerIndex];
  const token = player.tokens[tokenIndex];
  const newSteps = token.steps === 0 ? 1 : token.steps + dice;

  if (newSteps < 1 || newSteps > 51) return false; // only captures on main track
  const newAbs = getAbsSquare(newSteps, player.color);
  if (SAFE_SQUARES.has(newAbs)) return false; // safe square, no capture

  for (const opp of state.players) {
    if (opp.color === player.color) continue;
    for (const oppTok of opp.tokens) {
      if (oppTok.steps >= 1 && oppTok.steps <= 51) {
        if (getAbsSquare(oppTok.steps, opp.color) === newAbs) return true;
      }
    }
  }
  return false;
}

// Replace this section in autoMove():
function pickBestToken(state: GameState, validIndices: number[]): number {
  const player = state.players[state.currentPlayerIndex];
  const dice = state.diceValue!;

  // Priority 1: capturing move
  const captureIdx = validIndices.find(idx => wouldCapture(state, state.currentPlayerIndex, idx, dice));
  if (captureIdx !== undefined) return captureIdx;

  // Priority 2: move token out of yard (enter the board)
  const yardIdx = validIndices.find(idx => player.tokens[idx].steps === 0);
  if (yardIdx !== undefined && dice === 6) return yardIdx;

  // Priority 3: furthest token
  let best = validIndices[0];
  for (const idx of validIndices) {
    if (player.tokens[idx].steps > player.tokens[best].steps) best = idx;
  }
  return best;
}

// ── HOW TO INTEGRATE ─────────────────────────────────────────────────────
// In ludoEngine.ts, inside autoMove(), replace:
//   let best = validIndices[0];
//   for (const idx of validIndices) {
//     if (player.tokens[idx].steps > player.tokens[best].steps) best = idx;
//   }
// with:
//   const best = pickBestToken(state, validIndices);
// (then return { newState: applyMove(state, best), tokenIndex: best })

// ── EXAM SCENARIO: Even smarter — avoid sending a token to a non-safe square ──
function isRiskyMove(state: GameState, playerIndex: number, tokenIndex: number, dice: number): boolean {
  const player = state.players[playerIndex];
  const token = player.tokens[tokenIndex];
  const newSteps = token.steps === 0 ? 1 : token.steps + dice;
  if (newSteps < 1 || newSteps > 51) return false;
  const newAbs = getAbsSquare(newSteps, player.color);
  if (SAFE_SQUARES.has(newAbs)) return false;

  // Check if any opponent token could land here in next 1-6 steps
  for (const opp of state.players) {
    if (opp.color === player.color) continue;
    for (const oppTok of opp.tokens) {
      if (oppTok.steps < 1 || oppTok.steps > 51) continue;
      for (let d = 1; d <= 6; d++) {
        const futureSteps = oppTok.steps + d;
        if (futureSteps >= 1 && futureSteps <= 51) {
          if (getAbsSquare(futureSteps, opp.color) === newAbs) return true;
        }
      }
    }
  }
  return false;
}

export { pickBestToken, wouldCapture, isRiskyMove };
