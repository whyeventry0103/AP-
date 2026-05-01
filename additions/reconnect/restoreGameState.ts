// WHAT: Send the full current game state to a player who reconnects mid-game.
// MODIFY: server/utils/socketHandler.ts — rejoinGame handler
// Current code already does basic restore. This file shows the enhanced version
// and handles edge cases.

// ── CURRENT rejoinGame (already works) ───────────────────────────────────
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

// ── ENHANCED VERSION ──────────────────────────────────────────────────────
/*
  socket.on('rejoinGame', ({ gameId }: { gameId: string }) => {
    const state = activeGames.get(gameId);
    if (!state) {
      // Game might already be over — check DB for the result
      return socket.emit('error', { message: 'Game not found or already finished' });
    }

    if (state.status === 'finished') {
      // Send the final state so they can see results
      socket.emit('gameOver', { gameState: state });
      return;
    }

    // Join socket room
    const alreadyJoined = socket.rooms.has(gameId);
    if (!alreadyJoined) socket.join(gameId);

    // Restore player
    const player = state.players.find(p => p.userId === userId);
    if (player) {
      player.isConnected = true;
      player.isAI = false;

      // If it's their turn, reset the timer to give them a fair shot
      const isTheirTurn = state.players[state.currentPlayerIndex]?.userId === userId;
      if (isTheirTurn) {
        clearTurnTimer(gameId);
        startTurnTimer(io, gameId);
      }

      // Notify others
      io.to(gameId).emit('gameStateUpdate', { gameState: state });
    }

    // Send full state to the rejoining player
    socket.emit('gameStateUpdate', { gameState: state });

    // Also resend recent chat if you're storing it
    // socket.emit('chatHistory', { messages: chatHistory.get(gameId) ?? [] });
  });
*/

// ── GAME.TSX: Auto-attempt rejoin on mount if no state ────────────────────
// Currently in Game.tsx useEffect:
//   if (gameId && !gameState) socket.emit('rejoinGame', { gameId });
// This already handles the case where the player navigates directly to /newgame/:id

// ── STORE CHAT HISTORY FOR RECONNECT ─────────────────────────────────────
// Optionally keep last N messages so reconnecting players see recent chat:
/*
  // At top of socketHandler.ts:
  const chatHistory = new Map<string, any[]>(); // gameId -> last 50 messages

  // In sendMessage handler, after emitting:
  if (!chatHistory.has(gameId)) chatHistory.set(gameId, []);
  const history = chatHistory.get(gameId)!;
  history.push(msgPayload);
  if (history.length > 50) history.shift(); // keep last 50

  // In rejoinGame, send history:
  socket.emit('chatHistory', { messages: chatHistory.get(gameId) ?? [] });

  // In finishGame, clean up:
  chatHistory.delete(state.gameId);
*/

// ── FRONTEND: Handle chatHistory event in Game.tsx ────────────────────────
/*
  socket.on('chatHistory', ({ messages }: { messages: ChatMsg[] }) => {
    setChatMessages(messages);
  });
*/

export {};
