// WHAT: Allow users to join a game as read-only spectators (no actions, just view).
// MODIFY: server/utils/socketHandler.ts — add spectator join + permission check on all actions
// ALSO: client/APP/src/pages/Game.tsx — hide action buttons for spectators

// ── STEP 1: Track spectators (server/utils/socketHandler.ts) ──────────────
// Add at the top alongside activeGames:
/*
  const gameSpectators = new Map<string, Set<string>>(); // gameId -> Set<userId>
*/

// ── STEP 2: New event — joinAsSpectator ───────────────────────────────────
/*
  socket.on('joinAsSpectator', ({ gameId }: { gameId: string }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });

    if (!gameSpectators.has(gameId)) gameSpectators.set(gameId, new Set());
    gameSpectators.get(gameId)!.add(userId);

    socket.join(gameId); // join room to receive updates
    socket.emit('spectatorJoined', { gameState: state }); // send current state
  });
*/

// ── STEP 3: Guard all game actions against spectators ────────────────────
// Add this helper:
function isSpectator(gameId: string, userId: string, gameSpectators: Map<string, Set<string>>): boolean {
  return gameSpectators.get(gameId)?.has(userId) ?? false;
}

// Use at the top of rollDice and moveToken handlers:
/*
  socket.on('rollDice', ({ gameId }) => {
    if (isSpectator(gameId, userId, gameSpectators)) {
      return socket.emit('error', { message: 'Spectators cannot roll dice' });
    }
    // ... rest of handler
  });

  socket.on('moveToken', ({ gameId, tokenIndex }) => {
    if (isSpectator(gameId, userId, gameSpectators)) {
      return socket.emit('error', { message: 'Spectators cannot move tokens' });
    }
    // ... rest of handler
  });
*/

// ── STEP 4: Frontend — Game.tsx ───────────────────────────────────────────
// In Game.tsx, detect if the current user is a spectator:
/*
  const isSpectator = !gameState?.players.some(p => p.userId === user?._id);
*/
// The user is a spectator if they're not in the players list.
//
// Disable the roll button:
//   disabled={!isMyTurn || gameState.diceRolled || isSpectator}
//
// Hide the token selector panel:
//   {!isSpectator && isMyTurn && gameState.diceRolled && validIndices.length > 0 && (...)}
//
// Add a spectator banner at the top:
/*
  {isSpectator && (
    <div style={{ background: '#1a237e', color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
      👁 You are spectating
    </div>
  )}
*/

// ── STEP 5: Navigate to game as spectator ────────────────────────────────
// Add a route or button to watch an active game. The spectator navigates to
// /newgame/:gameId and emits joinAsSpectator instead of rejoinGame.
// In Game.tsx useEffect:
/*
  const isPlayer = gameState?.players.some(p => p.userId === user?._id) ?? false;
  if (gameId && !gameState) {
    if (isPlayer) {
      socket.emit('rejoinGame', { gameId });
    } else {
      socket.emit('joinAsSpectator', { gameId });
    }
  }
*/

export { isSpectator };
