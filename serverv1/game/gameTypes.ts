// ── MODIFY THIS FILE to define your game's state shape ──────────────────────

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  userId: string;
  username: string;
  socketId: string;
  score: number;     // MODIFY: replace with your per-player state fields
  isReady: boolean;
}

export interface GameState {
  gameId: string;
  players: Player[];
  status: GameStatus;
  currentPlayerIndex: number;
  // ── ADD YOUR GAME-SPECIFIC FIELDS BELOW ───────────────────────────────────
  counter: number;    // example: shared counter (remove for real game)
  lastAction: string; // example: last log entry
  // ─────────────────────────────────────────────────────────────────────────
  log: string[];
  startedAt: number;
}

// ── MODIFY: coin rewards per rank ────────────────────────────────────────────
export function getCoinReward(rank: number, totalPlayers: number): number {
  const table: Record<number, number[]> = {
    2: [100, 20],
    3: [150, 60, 20],
    4: [200, 100, 50, 20],
  };
  const rewards = table[totalPlayers] ?? table[4];
  return rewards[rank - 1] ?? 10;
}
