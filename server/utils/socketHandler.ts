import { Server, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Game } from '../models/Game';
import { User } from '../models/User';
import { ActiveGame } from '../models/ActiveGame';
import {
  GameState, COLORS,
  initGameState, rollDice, getValidTokenIndices,
  applyMove, autoMove, getCoinReward
} from './ludoEngine';

// Socket augmented with userId set by the auth middleware
interface AuthenticatedSocket extends Socket {
  userId: string;
}

// In-memory state
const activeGames = new Map<string, GameState>();
const lobbyPlayers: { socketId: string; userId: string; username: string }[] = [];
const turnTimers = new Map<string, NodeJS.Timeout>();
const TURN_TIMEOUT_MS = 20000;

async function persistActiveGame(gameId: string, state: GameState): Promise<void> {
  try {
    await ActiveGame.findOneAndUpdate(
      { gameId },
      { state },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error('persistActiveGame error:', e);
  }
}

function clearTurnTimer(gameId: string) {
  const t = turnTimers.get(gameId);
  if (t) { clearTimeout(t); turnTimers.delete(gameId); }
}

async function finishGame(io: Server, state: GameState) {
  state.status = 'finished';
  clearTurnTimer(state.gameId);

  try {
    const game = await Game.findById(state.gameId);
    if (!game) return;

    game.status = 'finished';
    game.finishedAt = new Date();

    const totalPlayers = state.players.length;
    for (const p of state.players) {
      const rank = p.rank ?? state.players.length;
      const coins = getCoinReward(rank, totalPlayers);
      const gp = game.players.find(gpp => gpp.userId.toString() === p.userId);
      if (gp) { gp.rank = rank; gp.coinsEarned = coins; }

      await User.findByIdAndUpdate(p.userId, {
        $inc: { coins, total_played: 1 }
      });
    }
    await game.save();
    await ActiveGame.deleteOne({ gameId: state.gameId });
  } catch (e) {
    console.error('Error saving game result:', e);
  }

  io.to(state.gameId).emit('gameOver', { gameState: state });
  activeGames.delete(state.gameId);
}

function startTurnTimer(io: Server, gameId: string) {
  clearTurnTimer(gameId);
  const timer = setTimeout(async () => {
    const state = activeGames.get(gameId);
    if (!state || state.status !== 'playing') return;

    // If current player is disconnected, AI should take over.
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer.isConnected) currentPlayer.isAI = true;

    if (!state.diceRolled) {
      // Auto-roll
      const diceVal = rollDice();
      state.diceValue = diceVal;
      state.diceRolled = true;
      activeGames.set(gameId, state);
      await persistActiveGame(gameId, state);
      io.to(gameId).emit('diceRolled', { gameState: state });
      // Then auto-move
      setTimeout(async () => {
        const s2 = activeGames.get(gameId);
        if (!s2 || s2.status !== 'playing') return;
        const result = autoMove(s2);
        if (result) {
          activeGames.set(gameId, result.newState);
          await persistActiveGame(gameId, result.newState);
          io.to(gameId).emit('gameStateUpdate', { gameState: result.newState });
          if (result.newState.status === 'finished') {
            await finishGame(io, result.newState);
          } else {
            startTurnTimer(io, gameId);
          }
        }
      }, 1000);
    } else {
      // Dice already rolled but no move made — auto-move
      const s = activeGames.get(gameId);
      if (!s) return;
      const result = autoMove(s);
      if (result) {
        activeGames.set(gameId, result.newState);
        await persistActiveGame(gameId, result.newState);
        io.to(gameId).emit('gameStateUpdate', { gameState: result.newState });
        if (result.newState.status === 'finished') {
          await finishGame(io, result.newState);
        } else {
          startTurnTimer(io, gameId);
        }
      }
    }
  }, TURN_TIMEOUT_MS);
  turnTimers.set(gameId, timer);
}

export function setupSocket(io: Server) {
  // Auth middleware for socket — verifies JWT and attaches userId
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
      (socket as AuthenticatedSocket).userId = decoded.id as string;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const { userId } = socket as AuthenticatedSocket;

    // Track which active game this socket belongs to (for targeted disconnect handling).
    let joinedGameId: string | null = null;

    // ── LOBBY ──────────────────────────────────────────────
    socket.on('joinLobby', async () => {
      try {
        const user = await User.findById(userId).select('username');
        if (!user) return;
        socket.join('lobby');
        const existing = lobbyPlayers.find(p => p.userId === userId);
        if (!existing) {
          lobbyPlayers.push({ socketId: socket.id, userId, username: user.username });
        } else {
          existing.socketId = socket.id;
        }
        io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
      } catch (e) { console.error(e); }
    });

    socket.on('leaveLobby', () => {
      const idx = lobbyPlayers.findIndex(p => p.userId === userId);
      if (idx !== -1) lobbyPlayers.splice(idx, 1);
      socket.leave('lobby');
      io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
    });

    socket.on('startGame', async () => {
      try {
        if (lobbyPlayers.length < 2) {
          return socket.emit('error', { message: 'Need at least 2 players to start' });
        }

        // Take up to 4 players from lobby
        const gamePlayers = lobbyPlayers.splice(0, Math.min(4, lobbyPlayers.length));

        // Create DB game record
        const dbGame = await Game.create({
          total_players: gamePlayers.length,
          players: gamePlayers.map((p, i) => ({
            userId: p.userId,
            username: p.username,
            color: COLORS[i],
            rank: null,
            coinsEarned: 0
          })),
          status: 'playing'
        });

        const gameId = dbGame._id.toString();

        // Init game state
        const state = initGameState(gameId, gamePlayers.map((p, i) => ({
          userId: p.userId,
          username: p.username,
          color: COLORS[i]
        })));

        activeGames.set(gameId, state);
        await persistActiveGame(gameId, state);

        // Move all lobby players to game room
        for (const p of gamePlayers) {
          const playerSocket = io.sockets.sockets.get(p.socketId);
          if (playerSocket) {
            playerSocket.leave('lobby');
            playerSocket.join(gameId);
          }
        }

        io.to(gameId).emit('gameStarted', { gameState: state });
        io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
        startTurnTimer(io, gameId);
      } catch (e) { console.error(e); }
    });

    // ── GAME ───────────────────────────────────────────────
    socket.on('rejoinGame', async ({ gameId }: { gameId: string }) => {
      let state = activeGames.get(gameId);
      if (!state) {
        try {
          const doc = await ActiveGame.findOne({ gameId });
          if (doc) {
            state = doc.state as unknown as GameState;
            activeGames.set(gameId, state);
          }
        } catch (e) { console.error('rejoinGame restore error:', e); }
      }
      if (!state) return socket.emit('error', { message: 'Game not found' });
      socket.join(gameId);
      joinedGameId = gameId;
      const player = state.players.find(p => p.userId === userId);
      if (player) {
        player.isConnected = true;
        player.isAI = false;
        await persistActiveGame(gameId, state);
      }
      socket.emit('gameStateUpdate', { gameState: state });
      // Re-arm the turn timer if the game is active and no timer is running
      // (covers server-restart scenario where turnTimers map is empty)
      if (state.status === 'playing' && !turnTimers.has(gameId)) {
        startTurnTimer(io, gameId);
      }
    });

    socket.on('leaveGame', ({ gameId }: { gameId: string }) => {
      const state = activeGames.get(gameId);
      if (state) {
        const p = state.players.find(pl => pl.userId === userId);
        if (p) {
          p.isConnected = false;
          p.isAI = true;
          io.to(gameId).emit('gameStateUpdate', { gameState: state });
        }
      }
      socket.leave(gameId);
      if (joinedGameId === gameId) joinedGameId = null;
    });

    socket.on('rollDice', async ({ gameId }: { gameId: string }) => {
      const state = activeGames.get(gameId);
      if (!state || state.status !== 'playing') return;
      joinedGameId = gameId;
      const player = state.players[state.currentPlayerIndex];
      if (player.userId !== userId) return socket.emit('error', { message: 'Not your turn' });
      if (state.diceRolled) return socket.emit('error', { message: 'Already rolled' });

      clearTurnTimer(gameId);
      const diceVal = rollDice();
      state.diceValue = diceVal;
      state.diceRolled = true;
      activeGames.set(gameId, state);
      await persistActiveGame(gameId, state);

      io.to(gameId).emit('diceRolled', { gameState: state });

      // Check if there are valid moves
      const validIndices = getValidTokenIndices(player, diceVal);
      if (validIndices.length === 0) {
        // Auto-advance turn after short delay
        setTimeout(async () => {
          const s = activeGames.get(gameId);
          if (!s) return;
          const result = autoMove(s);
          if (result) {
            activeGames.set(gameId, result.newState);
            await persistActiveGame(gameId, result.newState);
            io.to(gameId).emit('gameStateUpdate', { gameState: result.newState });
            if (result.newState.status === 'finished') {
              await finishGame(io, result.newState);
            } else {
              startTurnTimer(io, gameId);
            }
          }
        }, 1500);
      } else {
        startTurnTimer(io, gameId);
      }
    });

    socket.on('moveToken', async ({ gameId, tokenIndex }: { gameId: string; tokenIndex: number }) => {
      const state = activeGames.get(gameId);
      if (!state || state.status !== 'playing') return;
      joinedGameId = gameId;
      const player = state.players[state.currentPlayerIndex];
      if (player.userId !== userId) return socket.emit('error', { message: 'Not your turn' });
      if (!state.diceRolled || state.diceValue === null) return socket.emit('error', { message: 'Roll dice first' });

      const validIndices = getValidTokenIndices(player, state.diceValue);
      if (!validIndices.includes(tokenIndex)) return socket.emit('error', { message: 'Invalid move' });

      clearTurnTimer(gameId);
      const newState = applyMove(state, tokenIndex);
      activeGames.set(gameId, newState);
      await persistActiveGame(gameId, newState);

      io.to(gameId).emit('gameStateUpdate', { gameState: newState });

      if (newState.status === 'finished') {
        await finishGame(io, newState);
      } else {
        startTurnTimer(io, gameId);
      }
    });

    // ── CHAT ───────────────────────────────────────────────
    socket.on('sendMessage', async ({ gameId, message }: { gameId: string; message: string }) => {
      if (!message || !message.trim()) return;
      joinedGameId = gameId;
      const user = await User.findById(userId).select('username');
      if (!user) return;
      const state = activeGames.get(gameId);
      const player = state?.players.find(p => p.userId === userId);
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      io.to(gameId).emit('chatMessage', {
        username: user.username,
        color: player?.color || 'system',
        message: message.trim().substring(0, 200),
        time,
        isMine: false,
        userId
      });
    });

    // ── DISCONNECT ─────────────────────────────────────────
    socket.on('disconnect', () => {
      // Remove from lobby
      const lobbyIdx = lobbyPlayers.findIndex(p => p.userId === userId);
      if (lobbyIdx !== -1) {
        lobbyPlayers.splice(lobbyIdx, 1);
        io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
      }
      // Mark AI in active game (targeted if we know it, otherwise scan all).
      const gameIdsToCheck = joinedGameId ? [joinedGameId] : [...activeGames.keys()];
      for (const gameId of gameIdsToCheck) {
        const state = activeGames.get(gameId);
        if (!state) continue;
        const p = state.players.find(pl => pl.userId === userId);
        if (!p) continue;

        p.isConnected = false;
        p.isAI = true;
        io.to(gameId).emit('gameStateUpdate', { gameState: state });
      }
    });
  });
}
