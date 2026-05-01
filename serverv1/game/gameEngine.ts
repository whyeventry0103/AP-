// ── MODIFY THIS FILE to implement your game's rules ──────────────────────────
// All functions here are PURE — no socket calls, no DB access, no side effects.
// This is the only file that changes when you switch games.

import { GameState, Player } from './gameTypes';

// Build the initial state when a game starts
// MODIFY: add your game-specific initial values
export function createGameState(gameId: string, players: Player[]): GameState {
  return {
    gameId,
    players,
    status: 'playing',
    currentPlayerIndex: 0,
    counter: 0,      // MODIFY
    lastAction: '',  // MODIFY
    log: [],
    startedAt: Date.now(),
  };
}

// Validate an action before applying it — return error string or null
// MODIFY: add your action-specific checks
export function validateAction(state: GameState, userId: string, action: any): string | null {
  if (!state) return 'Game not found';
  if (state.status !== 'playing') return 'Game is not active';
  const player = state.players[state.currentPlayerIndex];
  if (player.userId !== userId) return 'Not your turn';
  // MODIFY: add game-specific validation here
  return null;
}

// Apply an action and return the new state (immutable update)
// MODIFY: replace counter logic with your game logic
export function applyAction(state: GameState, userId: string, action: any): GameState {
  const s = { ...state, players: state.players.map(p => ({ ...p })) };
  const player = s.players[s.currentPlayerIndex];

  // ── YOUR GAME LOGIC HERE ─────────────────────────────────────────────────
  s.counter += 1;
  player.score += 1;
  s.lastAction = `${player.username} incremented to ${s.counter}`;
  s.log = [...s.log, s.lastAction];
  // ─────────────────────────────────────────────────────────────────────────

  s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
  return s;
}

// Return true when the game should end
// MODIFY: your win condition
export function isGameOver(state: GameState): boolean {
  return state.counter >= 10; // MODIFY
}

// Return players sorted by rank (rank 1 = winner)
// MODIFY: your ranking/scoring logic
export function rankPlayers(state: GameState): { userId: string; rank: number }[] {
  return [...state.players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ userId: p.userId, rank: i + 1 }));
}
