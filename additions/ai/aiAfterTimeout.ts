// WHAT: AI only activates after a player has been idle for N seconds, not immediately on disconnect.
// MODIFY: server/utils/socketHandler.ts — disconnect handler + startTurnTimer
// Current: disconnect → isAI = true immediately.
// New: disconnect → start a grace period timer → if still disconnected, then isAI = true.

// ── WHY THE CURRENT APPROACH IS DIFFERENT ────────────────────────────────
// Currently in disconnect handler:
//   p.isConnected = false;
//   p.isAI = true;         <-- immediate
//
// This means a brief network blip makes AI take over mid-game.
// A grace period is more player-friendly.

// ── STEP 1: Add a grace period timer map (socketHandler.ts top) ──────────
/*
  const aiGraceTimers = new Map<string, NodeJS.Timeout>(); // userId -> timer
  const AI_GRACE_MS = 10000; // 10 seconds before AI takes over
*/

// ── STEP 2: Modify disconnect handler ────────────────────────────────────
/*
  socket.on('disconnect', () => {
    // Remove from lobby (unchanged)
    const lobbyIdx = lobbyPlayers.findIndex(p => p.userId === userId);
    if (lobbyIdx !== -1) {
      lobbyPlayers.splice(lobbyIdx, 1);
      io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
    }

    // In-game: mark disconnected but give grace period before AI takes over
    for (const [gameId, state] of activeGames) {
      const p = state.players.find(pl => pl.userId === userId);
      if (p) {
        p.isConnected = false;
        io.to(gameId).emit('gameStateUpdate', { gameState: state }); // show disconnected UI

        const graceTimer = setTimeout(() => {
          // Still disconnected after grace period? Activate AI
          const currentState = activeGames.get(gameId);
          if (!currentState) return;
          const player = currentState.players.find(pl => pl.userId === userId);
          if (player && !player.isConnected) {
            player.isAI = true;
            io.to(gameId).emit('gameStateUpdate', { gameState: currentState });
          }
          aiGraceTimers.delete(userId);
        }, AI_GRACE_MS);

        aiGraceTimers.set(userId, graceTimer);
      }
    }
  });
*/

// ── STEP 3: Cancel grace timer on reconnect (rejoinGame handler) ─────────
/*
  socket.on('rejoinGame', ({ gameId }) => {
    // Cancel any pending AI grace timer
    const graceTimer = aiGraceTimers.get(userId);
    if (graceTimer) {
      clearTimeout(graceTimer);
      aiGraceTimers.delete(userId);
    }

    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });
    socket.join(gameId);
    const player = state.players.find(p => p.userId === userId);
    if (player) {
      player.isConnected = true;
      player.isAI = false;    // <-- stop AI
    }
    socket.emit('gameStateUpdate', { gameState: state });
  });
*/

// ── CONSTANTS ─────────────────────────────────────────────────────────────
export const AI_GRACE_MS = 10000;
