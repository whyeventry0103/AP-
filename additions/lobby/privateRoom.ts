// WHAT: Players can create/join a private lobby using a 6-character room code.
// MODIFY: server/utils/socketHandler.ts — add separate private lobby system
// ALSO: client/APP/src/pages/Lobby.tsx — add code input UI

// ── SERVER SIDE ────────────────────────────────────────────────────────────

// Add at the top of socketHandler.ts (in-memory, alongside activeGames):
/*
  const privateRooms = new Map<string, {
    code: string;
    players: { socketId: string; userId: string; username: string }[];
  }>();
*/

// Helper to generate room code:
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g. "A3K9FW"
}

// ── NEW EVENTS in socketHandler.ts ────────────────────────────────────────

// CREATE PRIVATE ROOM:
/*
  socket.on('createPrivateRoom', async () => {
    const user = await User.findById(userId).select('username');
    if (!user) return;
    const code = generateRoomCode();
    privateRooms.set(code, { code, players: [{ socketId: socket.id, userId, username: user.username }] });
    socket.join(`private:${code}`);
    socket.emit('roomCreated', { code, players: privateRooms.get(code)!.players });
  });
*/

// JOIN PRIVATE ROOM:
/*
  socket.on('joinPrivateRoom', async ({ code }: { code: string }) => {
    const room = privateRooms.get(code.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.players.length >= 4) return socket.emit('error', { message: 'Room is full' });

    const user = await User.findById(userId).select('username');
    if (!user) return;

    room.players.push({ socketId: socket.id, userId, username: user.username });
    socket.join(`private:${code}`);
    io.to(`private:${code}`).emit('roomUpdate', { players: room.players, code });
  });
*/

// START PRIVATE GAME (host only):
/*
  socket.on('startPrivateGame', async ({ code }: { code: string }) => {
    const room = privateRooms.get(code);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.players[0].userId !== userId) return socket.emit('error', { message: 'Only host can start' });
    if (room.players.length < 2) return socket.emit('error', { message: 'Need at least 2 players' });

    const gamePlayers = room.players;
    privateRooms.delete(code); // clean up room

    // Create game exactly like startGame does
    const dbGame = await Game.create({ ... });
    const gameId = dbGame._id.toString();
    const state = initGameState(gameId, gamePlayers.map((p, i) => ({ ...p, color: COLORS[i] })));
    activeGames.set(gameId, state);

    for (const p of gamePlayers) {
      const s = io.sockets.sockets.get(p.socketId);
      if (s) { s.leave(`private:${code}`); s.join(gameId); }
    }
    io.to(gameId).emit('gameStarted', { gameState: state });
    startTurnTimer(io, gameId);
  });
*/

// ── FRONTEND: Lobby.tsx ────────────────────────────────────────────────────
// Add a toggle between Public Lobby and Private Room modes:
/*
  const [mode, setMode] = useState<'public' | 'private'>('public');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');

  // Create room button:
  <button onClick={() => socket.emit('createPrivateRoom')}>Create Private Room</button>

  // Join room input:
  <input value={inputCode} onChange={e => setInputCode(e.target.value)} placeholder="Enter room code" />
  <button onClick={() => socket.emit('joinPrivateRoom', { code: inputCode })}>Join</button>

  // Display code to share:
  {roomCode && <div>Room Code: <strong>{roomCode}</strong></div>}

  // Listen for events:
  socket.on('roomCreated', ({ code, players }) => { setRoomCode(code); setPlayers(players); });
  socket.on('roomUpdate', ({ players }) => setPlayers(players));
*/

export { generateRoomCode };
