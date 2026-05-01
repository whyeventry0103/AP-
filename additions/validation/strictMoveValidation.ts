// WHAT: Comprehensive server-side validation for every game action.
// MODIFY: server/utils/socketHandler.ts — all game event handlers
// This file collects ALL validation that should happen before processing any action.

// ── VALIDATE rollDice ─────────────────────────────────────────────────────
function validateRollDice(state: any, userId: string): string | null {
  if (!state) return 'Game not found';
  if (state.status !== 'playing') return 'Game is not active';
  const player = state.players[state.currentPlayerIndex];
  if (player.userId !== userId) return 'Not your turn';
  if (state.diceRolled) return 'Already rolled this turn';
  return null;
}

// ── VALIDATE moveToken ────────────────────────────────────────────────────
function validateMoveToken(state: any, userId: string, tokenIndex: number): string | null {
  if (!state) return 'Game not found';
  if (state.status !== 'playing') return 'Game is not active';
  const player = state.players[state.currentPlayerIndex];
  if (player.userId !== userId) return 'Not your turn';
  if (!state.diceRolled || state.diceValue === null) return 'Roll dice first';
  if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex > 3) return 'Invalid token';

  const token = player.tokens[tokenIndex];
  if (token.steps === 57) return 'Token already finished';
  if (token.steps === 0 && state.diceValue !== 6) return 'Need a 6 to leave yard';
  if (token.steps > 0 && token.steps + state.diceValue > 57) return 'Token would overshoot';

  return null;
}

// ── VALIDATE sendMessage ──────────────────────────────────────────────────
function validateMessage(message: string): string | null {
  if (!message || typeof message !== 'string') return 'Invalid message';
  if (!message.trim()) return 'Empty message';
  if (message.length > 200) return 'Message too long';
  return null;
}

// ── VALIDATE joinLobby ────────────────────────────────────────────────────
function validateJoinLobby(lobbyPlayers: any[], userId: string, maxPlayers = 4): string | null {
  const already = lobbyPlayers.find(p => p.userId === userId);
  if (already) return null; // already in, will update socketId — OK
  if (lobbyPlayers.length >= maxPlayers) return 'Lobby is full';
  return null;
}

// ── HOW TO USE IN socketHandler.ts ────────────────────────────────────────
/*
  socket.on('rollDice', ({ gameId }) => {
    const state = activeGames.get(gameId);
    const err = validateRollDice(state, userId);
    if (err) return socket.emit('error', { message: err });
    // ... rest
  });

  socket.on('moveToken', ({ gameId, tokenIndex }) => {
    const state = activeGames.get(gameId);
    const err = validateMoveToken(state, userId, tokenIndex);
    if (err) return socket.emit('error', { message: err });
    // ... rest
  });

  socket.on('sendMessage', async ({ gameId, message }) => {
    const err = validateMessage(message);
    if (err) return socket.emit('error', { message: err });
    // ... rest
  });
*/

// ── BONUS: Log validation failures ────────────────────────────────────────
function validateAndLog(validatorFn: () => string | null, eventName: string, userId: string): string | null {
  const err = validatorFn();
  if (err) {
    console.warn(`[Validation] ${eventName} rejected for user ${userId}: ${err}`);
  }
  return err;
}

export { validateRollDice, validateMoveToken, validateMessage, validateJoinLobby, validateAndLog };
