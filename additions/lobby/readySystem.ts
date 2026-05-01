// WHAT: Players must mark themselves ready before the host can start.
// MODIFY: server/utils/socketHandler.ts — add new event handlers + modify startGame
// ALSO: client/APP/src/pages/Lobby.tsx — add Ready button

// ── STEP 1: Track ready state in lobbyPlayers ─────────────────────────────
// The current lobbyPlayers type:
//   { socketId: string; userId: string; username: string }
//
// CHANGE to:
//   { socketId: string; userId: string; username: string; isReady: boolean }
//
// Update the push in joinLobby:
/*
  lobbyPlayers.push({ socketId: socket.id, userId, username: user.username, isReady: false });
*/

// ── STEP 2: Add toggleReady event ─────────────────────────────────────────
// In socketHandler.ts, inside io.on('connection'), add:
/*
  socket.on('toggleReady', () => {
    const player = lobbyPlayers.find(p => p.userId === userId);
    if (!player) return;
    player.isReady = !player.isReady;
    io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
  });
*/

// ── STEP 3: Enforce ready check in startGame ─────────────────────────────
/*
  socket.on('startGame', async () => {
    if (lobbyPlayers[0]?.userId !== userId) {
      return socket.emit('error', { message: 'Only the host can start' });
    }
    if (lobbyPlayers.length < 2) {
      return socket.emit('error', { message: 'Need at least 2 players' });
    }
    // Host doesn't need to be ready, but all others must be
    const nonHostPlayers = lobbyPlayers.slice(1);
    const allReady = nonHostPlayers.every(p => p.isReady);
    if (!allReady) {
      return socket.emit('error', { message: 'Not all players are ready' });
    }
    // ... rest of startGame unchanged
  });
*/

// ── STEP 4: Frontend — Lobby.tsx changes ─────────────────────────────────
// Update the LobbyPlayer interface:
//   interface LobbyPlayer { socketId: string; userId: string; username: string; isReady: boolean; }
//
// Add ready button in the player slot:
/*
  {p && p.userId === user?._id && (
    <button onClick={() => socket.emit('toggleReady')}
      style={{ background: p.isReady ? '#2e7d32' : '#999', color: '#fff',
               border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
      {p.isReady ? 'Ready ✓' : 'Ready?'}
    </button>
  )}
*/
//
// Show ready state on each slot:
//   <span style={{ color: p.isReady ? '#2e7d32' : '#e53935' }}>
//     {p.isReady ? '● Ready' : '○ Not Ready'}
//   </span>
//
// Disable start button if not all ready:
//   const allOthersReady = players.slice(1).every(p => p.isReady);
//   disabled={players.length < 2 || !allOthersReady}

export {};
