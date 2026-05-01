// WHAT: Force-resync a client's socket state with the server's current game state.
// USE CASE: Player's UI shows stale state (e.g., wrong turn, missing update).
// MODIFY: server/utils/socketHandler.ts — add resync event
// ALSO: client/APP/src/pages/Game.tsx — call resync when detecting desync

// ── SERVER: Add resync event ──────────────────────────────────────────────
/*
  socket.on('resync', ({ gameId }: { gameId: string }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });
    // Just send the current state — no side effects
    socket.emit('gameStateUpdate', { gameState: state });
  });
*/

// ── FRONTEND: Auto-detect desync and resync ───────────────────────────────
// Strategy: if the client receives an event but has no game state, request a resync.
// Also allow manual resync button.

// In Game.tsx useEffect, add to the gameStateUpdate handler:
/*
  socket.on('gameStateUpdate', ({ gameState: gs }) => {
    setGameState(gs);
    setSelectedToken(null);
    if (gs.diceValue !== null) setDiceHistory(h => [gs.diceValue!, ...h].slice(0, 5));
  });

  // If socket reconnects (Socket.IO built-in event), request resync:
  socket.on('connect', () => {
    if (gameId) socket.emit('resync', { gameId });
  });
*/

// ── MANUAL RESYNC BUTTON ─────────────────────────────────────────────────
// Add to Game.tsx top bar (useful for debugging and exams):
/*
  const [syncing, setSyncing] = useState(false);

  const handleResync = () => {
    setSyncing(true);
    socket.emit('resync', { gameId });
    setTimeout(() => setSyncing(false), 1000);
  };

  // In JSX topbar:
  <button onClick={handleResync} disabled={syncing}
    style={{ background: '#1a237e', color: '#fff', border: 'none', padding: '6px 12px',
             borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
    {syncing ? '...' : '⟳ Sync'}
  </button>
*/

// ── HANDLE SOCKET RECONNECTION AUTOMATICALLY ─────────────────────────────
// Socket.IO client automatically reconnects (reconnection: true).
// After reconnect, the server doesn't automatically re-join the socket to the game room.
// Solution: on 'connect' event, re-join all needed rooms.
/*
  // In Game.tsx useEffect:
  socket.on('connect', () => {
    // After reconnect, re-join the game room
    if (gameId) socket.emit('rejoinGame', { gameId });
  });
*/

// ── SERVER: Re-add socket to room on rejoin ───────────────────────────────
// The rejoinGame handler already does socket.join(gameId).
// That's all that's needed. The socket will start receiving room broadcasts again.

// ── DETECTING CLIENT DESYNC VIA TURN COUNT ───────────────────────────────
// Send turnCount with every client action. Server responds with error if mismatch.
// Client can then trigger a resync:
/*
  socket.on('error', ({ message }) => {
    if (message.includes('stale') || message.includes('already')) {
      socket.emit('resync', { gameId }); // auto-fix
    }
  });
*/

export {};
