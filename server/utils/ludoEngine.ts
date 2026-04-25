// Ludo Game Engine - Server Authoritative

export type Color = 'red' | 'blue' | 'green' | 'yellow';

export interface Token {
  id: number;      // 0-3
  steps: number;   // 0=yard, 1-51=main track, 52-56=home col, 57=finished
}

export interface Player {
  userId: string;
  username: string;
  color: Color;
  tokens: Token[];
  rank: number | null;
  isConnected: boolean;
  isAI: boolean;
}

export interface LogEntry {
  time: string;
  color: string;
  text: string;
  type: 'normal' | 'capture' | 'finish' | 'system';
}

export interface GameState {
  gameId: string;
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  status: 'waiting' | 'playing' | 'finished';
  consecutiveSixes: number;
  rankings: string[];   // userIds in finish order
  log: LogEntry[];
  turnCount: number;
}

// Offsets: how many squares ahead of square 0 each color starts
export const COLOR_OFFSETS: Record<Color, number> = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39
};

// Safe absolute squares (0-51)
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function getAbsSquare(steps: number, color: Color): number {
  return (steps - 1 + COLOR_OFFSETS[color]) % 52;
}

export function isSafeSquare(absSquare: number): boolean {
  return SAFE_SQUARES.has(absSquare);
}

export function canTokenMove(token: Token, dice: number): boolean {
  if (token.steps === 57) return false;
  if (token.steps === 0) return dice === 6;
  const newSteps = token.steps + dice;
  if (newSteps > 57) return false;
  return true;
}

export function getValidTokenIndices(player: Player, dice: number): number[] {
  return player.tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => canTokenMove(t, dice))
    .map(({ i }) => i);
}

export function applyMove(state: GameState, tokenIndex: number): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const player = newState.players[newState.currentPlayerIndex];
  const token = player.tokens[tokenIndex];
  const dice = newState.diceValue!;
  const oldSteps = token.steps;

  // Move token
  token.steps = oldSteps === 0 ? 1 : oldSteps + dice;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Check capture (only on main track 1-51)
  let capturedLog = '';
  if (token.steps >= 1 && token.steps <= 51) {
    const myAbs = getAbsSquare(token.steps, player.color);
    if (!isSafeSquare(myAbs)) {
      for (const opponent of newState.players) {
        if (opponent.color === player.color) continue;
        for (const oppToken of opponent.tokens) {
          if (oppToken.steps >= 1 && oppToken.steps <= 51) {
            const oppAbs = getAbsSquare(oppToken.steps, opponent.color);
            if (oppAbs === myAbs) {
              oppToken.steps = 0;
              capturedLog = `${player.color.toUpperCase()} captured ${opponent.color.toUpperCase()} token!`;
              newState.log.push({ time: timestamp, color: player.color, text: capturedLog, type: 'capture' });
            }
          }
        }
      }
    }
  }

  // Check finish
  if (token.steps === 57) {
    const allFinished = player.tokens.every(t => t.steps === 57);
    if (allFinished && player.rank === null) {
      player.rank = newState.rankings.length + 1;
      newState.rankings.push(player.userId);
      newState.log.push({ time: timestamp, color: player.color, text: `${player.username} (${player.color}) finished! Rank #${player.rank}`, type: 'finish' });
    } else {
      newState.log.push({ time: timestamp, color: player.color, text: `${player.color.toUpperCase()} token reached finish!`, type: 'finish' });
    }
  } else {
    if (!capturedLog) {
      const action = oldSteps === 0 ? 'entered the board' : `moved to step ${token.steps}`;
      newState.log.push({ time: timestamp, color: player.color, text: `${player.color.toUpperCase()} ${action} (rolled ${dice})`, type: 'normal' });
    }
  }

  // Check game over (all players except 1 finished)
  const activePlayers = newState.players.filter(p => !p.tokens.every(t => t.steps === 57));
  if (activePlayers.length <= 1) {
    newState.status = 'finished';
    // Last player gets last rank
    for (const p of newState.players) {
      if (p.rank === null) {
        p.rank = newState.rankings.length + 1;
        newState.rankings.push(p.userId);
      }
    }
  }

  // Advance turn (rolling 6 gives extra turn, unless 3 consecutive)
  const rolledSix = dice === 6;
  if (rolledSix) {
    newState.consecutiveSixes += 1;
  } else {
    newState.consecutiveSixes = 0;
  }

  const extraTurn = rolledSix && newState.consecutiveSixes < 3;
  if (!extraTurn && newState.status === 'playing') {
    newState.currentPlayerIndex = getNextPlayerIndex(newState);
    newState.consecutiveSixes = 0;
  }

  newState.diceValue = null;
  newState.diceRolled = false;
  newState.turnCount += 1;

  return newState;
}

export function getNextPlayerIndex(state: GameState): number {
  const total = state.players.length;
  let next = (state.currentPlayerIndex + 1) % total;
  let tries = 0;
  while (tries < total) {
    const p = state.players[next];
    if (!p.tokens.every(t => t.steps === 57)) return next;
    next = (next + 1) % total;
    tries++;
  }
  return next;
}

export function autoMove(state: GameState): { newState: GameState; tokenIndex: number } | null {
  const player = state.players[state.currentPlayerIndex];
  const dice = state.diceValue;
  if (dice === null) return null;
  const validIndices = getValidTokenIndices(player, dice);
  if (validIndices.length === 0) {
    // No valid moves - advance turn
    const newState: GameState = JSON.parse(JSON.stringify(state));
    newState.diceValue = null;
    newState.diceRolled = false;
    newState.consecutiveSixes = dice === 6 ? newState.consecutiveSixes + 1 : 0;
    if (!(dice === 6 && newState.consecutiveSixes < 3)) {
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
      newState.consecutiveSixes = 0;
    }
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    newState.log.push({ time: ts, color: player.color, text: `${player.color.toUpperCase()} has no valid moves`, type: 'system' });
    return { newState, tokenIndex: -1 };
  }
  // Prefer capturing move, else prefer token closest to finish
  let best = validIndices[0];
  for (const idx of validIndices) {
    if (player.tokens[idx].steps > player.tokens[best].steps) best = idx;
  }
  return { newState: applyMove(state, best), tokenIndex: best };
}

export function initGameState(gameId: string, players: { userId: string; username: string; color: Color }[]): GameState {
  return {
    gameId,
    players: players.map(p => ({
      userId: p.userId,
      username: p.username,
      color: p.color,
      tokens: [
        { id: 0, steps: 0 },
        { id: 1, steps: 0 },
        { id: 2, steps: 0 },
        { id: 3, steps: 0 }
      ],
      rank: null,
      isConnected: true,
      isAI: false
    })),
    currentPlayerIndex: 0,
    diceValue: null,
    diceRolled: false,
    status: 'playing',
    consecutiveSixes: 0,
    rankings: [],
    log: [{ time: new Date().toLocaleTimeString(), color: 'system', text: 'Game started! Good luck!', type: 'system' }],
    turnCount: 0
  };
}

export function getCoinReward(rank: number): number {
  const rewards: Record<number, number> = { 1: 100, 2: 50, 3: 25, 4: 0 };
  return rewards[rank] ?? 0;
}
