// WHAT: Enforce min/max player counts before starting.
// MODIFY: server/utils/socketHandler.ts — startGame handler
// Current: only checks >= 2. Exam might ask to enforce exactly 4, or allow 2-3 only.

// ── CONFIGURABLE CONSTANTS (add to top of socketHandler.ts) ───────────────
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

// ── REPLACE the current check in startGame ────────────────────────────────
/*
  socket.on('startGame', async () => {
    if (lobbyPlayers.length < MIN_PLAYERS) {
      return socket.emit('error', { message: `Need at least ${MIN_PLAYERS} players` });
    }
    if (lobbyPlayers.length > MAX_PLAYERS) {
      // Only take MAX_PLAYERS, leave extras in lobby
      // (already handled by Math.min(4, ...) in current code)
    }
    // ...
  });
*/

// ── EXAM SCENARIO: Require exactly 4 players ─────────────────────────────
/*
  if (lobbyPlayers.length !== 4) {
    return socket.emit('error', { message: 'Exactly 4 players required' });
  }
*/

// ── EXAM SCENARIO: Block joining a full lobby ─────────────────────────────
// In joinLobby handler, add before pushing:
/*
  socket.on('joinLobby', async () => {
    if (lobbyPlayers.length >= MAX_PLAYERS) {
      return socket.emit('error', { message: 'Lobby is full' });
    }
    // ... rest of joinLobby
  });
*/

// ── FRONTEND: Show count in Lobby.tsx ────────────────────────────────────
// Current code already shows: `${players.length}/4 Players`
// To make min configurable, pass it from server:
/*
  io.to('lobby').emit('lobbyUpdate', {
    players: lobbyPlayers,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS
  });
*/
// Then in Lobby.tsx, use minPlayers from lobbyUpdate instead of hardcoded 2.

export { MIN_PLAYERS, MAX_PLAYERS };
