// WHAT: Stop AI and restore human control the moment a player reconnects.
// MODIFY: server/utils/socketHandler.ts — rejoinGame handler
// Current code already does this, but this file shows the complete pattern
// and how to handle edge cases (AI mid-turn when player reconnects).

// ── CURRENT rejoinGame (for reference) ───────────────────────────────────
/*
  socket.on('rejoinGame', ({ gameId }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });
    socket.join(gameId);
    const player = state.players.find(p => p.userId === userId);
    if (player) { player.isConnected = true; player.isAI = false; }
    socket.emit('gameStateUpdate', { gameState: state });
  });
*/

// ── ENHANCED VERSION: Handle mid-turn reconnect ───────────────────────────
// If the AI is currently in the middle of a turn (diceRolled, waiting for move),
// the reconnecting player should regain control immediately.
/*
  socket.on('rejoinGame', ({ gameId }: { gameId: string }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });

    socket.join(gameId);
    const player = state.players.find(p => p.userId === userId);

    if (player) {
      player.isConnected = true;
      player.isAI = false;

      // If it's this player's turn right now, cancel the AI timer
      const isTheirTurn = state.players[state.currentPlayerIndex]?.userId === userId;
      if (isTheirTurn) {
        clearTurnTimer(gameId);
        // Give them the full 20 seconds from now
        startTurnTimer(io, gameId);
      }

      // Notify everyone that player is back
      io.to(gameId).emit('gameStateUpdate', { gameState: state });
      emitSystemMessage(io, gameId, `${player.username} has reconnected`);
    }

    // Send current state to rejoining player
    socket.emit('gameStateUpdate', { gameState: state });
  });
*/

// ── FRONTEND: Game.tsx — detect AI status for own player ─────────────────
// Show a "You were disconnected" banner when your own player has isAI=true:
/*
  const myPlayer = gameState?.players.find(p => p.userId === user?._id);
  const wasDisconnected = myPlayer?.isAI && !myPlayer?.isConnected;

  {wasDisconnected && (
    <div style={{ background: '#b71c1c', color: '#fff', padding: 8, textAlign: 'center', fontSize: 13 }}>
      ⚠️ You were disconnected — AI was playing for you
    </div>
  )}
*/

// ── PREVENTING DUPLICATE rejoinGame events ────────────────────────────────
// If a player spams rejoinGame (e.g., double navigation), guard against it:
/*
  socket.on('rejoinGame', ({ gameId }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });

    const alreadyInRoom = socket.rooms.has(gameId);
    if (!alreadyInRoom) socket.join(gameId);

    // ... rest of handler
  });
*/

export {};
