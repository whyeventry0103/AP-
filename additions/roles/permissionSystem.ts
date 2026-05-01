// WHAT: Role-based permission checks for socket events.
// MODIFY: server/utils/socketHandler.ts — add permission layer
// Roles: 'host' | 'player' | 'spectator'

// ── ROLE RESOLUTION ────────────────────────────────────────────────────────
type Role = 'host' | 'player' | 'spectator';

function getRole(
  userId: string,
  gameId: string,
  activeGames: Map<string, any>,
  gameSpectators: Map<string, Set<string>>,
  lobbyPlayers: { userId: string }[]
): Role {
  // Check spectator
  if (gameSpectators.get(gameId)?.has(userId)) return 'spectator';

  const state = activeGames.get(gameId);
  if (!state) {
    // In lobby — first player is host
    return lobbyPlayers[0]?.userId === userId ? 'host' : 'player';
  }

  // In game — first player created the game (stored as host by convention)
  if (state.players[0]?.userId === userId) return 'host';
  if (state.players.some((p: any) => p.userId === userId)) return 'player';
  return 'spectator';
}

// ── PERMISSION TABLE ──────────────────────────────────────────────────────
const PERMISSIONS: Record<string, Role[]> = {
  rollDice:    ['player', 'host'],
  moveToken:   ['player', 'host'],
  sendMessage: ['player', 'host', 'spectator'], // spectators can chat
  startGame:   ['host'],
  kickPlayer:  ['host'],
};

function canDo(action: string, role: Role): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}

// ── HOW TO USE IN socketHandler.ts ────────────────────────────────────────
// Add a generic guard at the top of each handler:
/*
  socket.on('rollDice', ({ gameId }) => {
    const role = getRole(userId, gameId, activeGames, gameSpectators, lobbyPlayers);
    if (!canDo('rollDice', role)) {
      return socket.emit('error', { message: 'Permission denied' });
    }
    // ... rest of handler
  });
*/

// ── EXAM SCENARIO: Kick player (host only) ───────────────────────────────
/*
  socket.on('kickPlayer', ({ gameId, targetUserId }: { gameId: string; targetUserId: string }) => {
    const role = getRole(userId, gameId, activeGames, gameSpectators, lobbyPlayers);
    if (!canDo('kickPlayer', role)) return socket.emit('error', { message: 'Only host can kick' });

    // Remove from lobby
    const idx = lobbyPlayers.findIndex(p => p.userId === targetUserId);
    if (idx !== -1) {
      const kicked = lobbyPlayers.splice(idx, 1)[0];
      const kickedSocket = io.sockets.sockets.get(kicked.socketId);
      if (kickedSocket) {
        kickedSocket.emit('kicked', { message: 'You were removed from the lobby' });
        kickedSocket.leave('lobby');
      }
      io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
    }
  });
*/

export { Role, getRole, canDo, PERMISSIONS };
