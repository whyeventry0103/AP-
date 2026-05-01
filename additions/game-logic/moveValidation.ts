// WHAT: Standalone move validation functions for server-side checks.
// MODIFY: server/utils/ludoEngine.ts (or import into socketHandler.ts)
// These are modular validators that can be composed.

// ── EXISTING VALIDATION (for reference) ───────────────────────────────────
// In socketHandler.ts, moveToken handler:
//   const validIndices = getValidTokenIndices(player, state.diceValue);
//   if (!validIndices.includes(tokenIndex)) return socket.emit('error', { message: 'Invalid move' });

// ── MODULAR VALIDATORS (drop these into ludoEngine.ts or a new validateMove.ts) ──

interface Token { id: number; steps: number; }
interface Player { userId: string; username: string; color: string; tokens: Token[]; rank: number | null; isConnected: boolean; isAI: boolean; }
interface GameState { players: Player[]; currentPlayerIndex: number; diceValue: number | null; diceRolled: boolean; status: string; [key: string]: any; }

// Check it's the right player's turn
function isPlayerTurn(state: GameState, userId: string): boolean {
  return state.players[state.currentPlayerIndex].userId === userId;
}

// Check dice has been rolled
function isDiceRolled(state: GameState): boolean {
  return state.diceRolled && state.diceValue !== null;
}

// Check game is active
function isGameActive(state: GameState): boolean {
  return state.status === 'playing';
}

// Check token index is valid (0-3)
function isValidTokenIndex(tokenIndex: number): boolean {
  return Number.isInteger(tokenIndex) && tokenIndex >= 0 && tokenIndex <= 3;
}

// Check token can actually move with current dice
function canTokenMoveWithDice(token: Token, dice: number): boolean {
  if (token.steps === 57) return false;
  if (token.steps === 0) return dice === 6;
  return token.steps + dice <= 57;
}

// Composite validator — returns error string or null
function validateMove(state: GameState, userId: string, tokenIndex: number): string | null {
  if (!isGameActive(state)) return 'Game is not active';
  if (!isPlayerTurn(state, userId)) return 'Not your turn';
  if (!isDiceRolled(state)) return 'Roll dice first';
  if (!isValidTokenIndex(tokenIndex)) return 'Invalid token index';

  const player = state.players[state.currentPlayerIndex];
  const token = player.tokens[tokenIndex];
  if (!canTokenMoveWithDice(token, state.diceValue!)) return 'Token cannot move';

  return null; // valid
}

// ── HOW TO USE IN socketHandler.ts ────────────────────────────────────────
// Replace the current moveToken validation block:
/*
  socket.on('moveToken', ({ gameId, tokenIndex }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });

    const error = validateMove(state, userId, tokenIndex);
    if (error) return socket.emit('error', { message: error });

    clearTurnTimer(gameId);
    const newState = applyMove(state, tokenIndex);
    // ... rest stays the same
  });
*/

// ── EXAM SCENARIO: Rate limiting — prevent spam clicking ─────────────────
// Add to socketHandler.ts at the top of the connection handler:
const lastMoveTime = new Map<string, number>(); // userId -> timestamp

function isRateLimited(userId: string, minIntervalMs = 500): boolean {
  const last = lastMoveTime.get(userId) ?? 0;
  if (Date.now() - last < minIntervalMs) return true;
  lastMoveTime.set(userId, Date.now());
  return false;
}

// Use: if (isRateLimited(userId)) return socket.emit('error', { message: 'Too fast' });

export { isPlayerTurn, isDiceRolled, isGameActive, isValidTokenIndex, canTokenMoveWithDice, validateMove, isRateLimited };
