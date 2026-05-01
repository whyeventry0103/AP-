// WHAT: Server-side verification that only the lobby host can start the game.
// MODIFY: server/utils/socketHandler.ts — startGame handler
// Currently, any player in the lobby can emit startGame. This fixes that.

// ── CURRENT CODE (socketHandler.ts ~line 146) ─────────────────────────────
// socket.on('startGame', async () => {
//   if (lobbyPlayers.length < 2) { ... }
//   const gamePlayers = lobbyPlayers.splice(0, ...);
//   ...
// });

// ── FIX: Add host check at the top of startGame handler ──────────────────
/*
  socket.on('startGame', async () => {
    // Only the FIRST player in the lobby (host) can start
    if (lobbyPlayers.length === 0 || lobbyPlayers[0].userId !== userId) {
      return socket.emit('error', { message: 'Only the host can start the game' });
    }
    if (lobbyPlayers.length < 2) {
      return socket.emit('error', { message: 'Need at least 2 players to start' });
    }
    // ... rest of startGame is unchanged
  });
*/

// ── HELPER: expose who the host is in lobbyUpdate ────────────────────────
// In joinLobby and leaveLobby handlers, when emitting lobbyUpdate, add hostId:
/*
  io.to('lobby').emit('lobbyUpdate', {
    players: lobbyPlayers,
    hostId: lobbyPlayers[0]?.userId ?? null   // <-- add this
  });
*/

// ── FRONTEND: Lobby.tsx — use hostId from lobbyUpdate ────────────────────
// Currently Lobby.tsx computes host client-side:
//   const isHost = players.length > 0 && players[0].userId === user?._id;
//
// With server-provided hostId, update the socket handler:
/*
  socket.on('lobbyUpdate', ({ players, hostId }: { players: LobbyPlayer[]; hostId: string | null }) => {
    setPlayers(p);
    setHostId(hostId);  // new state: const [hostId, setHostId] = useState<string | null>(null);
  });

  // Then:
  const isHost = hostId === user?._id;
*/

// ── HOST TRANSFER: If host leaves, promote next player ───────────────────
// In leaveLobby and disconnect handlers, after removing the player:
// No code change needed — since host is always lobbyPlayers[0], removing
// them automatically makes lobbyPlayers[1] the new host.
// Just make sure to re-emit lobbyUpdate after any lobby change (already done).

export {};
