import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { registerGameHandlers } from '../game/gameHandlers';
import { Player, GameState } from '../game/gameTypes';
import { createGameState } from '../game/gameEngine';

interface AuthSocket extends Socket {
  userId?: string;
  username?: string;
}

const lobbyPlayers: Player[] = [];
const activeGames = new Map<string, GameState>();
const chatHistory: { username: string; text: string; type: string }[] = [];

export function initSocketHandler(io: Server) {
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; username: string };
      socket.userId   = payload.id;
      socket.username = payload.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket   = rawSocket as AuthSocket;
    const userId   = socket.userId!;
    const username = socket.username!;

    // ── LOBBY ────────────────────────────────────────────────────────────────
    socket.on('joinLobby', () => {
      const existing = lobbyPlayers.find(p => p.userId === userId);
      if (existing) {
        existing.socketId = socket.id;
      } else {
        if (lobbyPlayers.length >= 4) return socket.emit('error', { message: 'Lobby full' });
        lobbyPlayers.push({ userId, username, socketId: socket.id, score: 0, isReady: false });
      }
      socket.join('lobby');
      io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
      socket.emit('chatHistory', chatHistory.slice(-50));
    });

    socket.on('leaveLobby', () => {
      const idx = lobbyPlayers.findIndex(p => p.userId === userId);
      if (idx !== -1) lobbyPlayers.splice(idx, 1);
      socket.leave('lobby');
      io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
    });

    socket.on('startGame', () => {
      if (lobbyPlayers.length < 2) return socket.emit('error', { message: 'Need at least 2 players' });
      if (lobbyPlayers[0].userId !== userId) return socket.emit('error', { message: 'Only host can start' });

      const gameId  = `game_${Date.now()}`;
      const players = [...lobbyPlayers];
      lobbyPlayers.length = 0;

      const state = createGameState(gameId, players);
      activeGames.set(gameId, state);

      for (const p of players) {
        const s = io.sockets.sockets.get(p.socketId);
        if (s) { s.leave('lobby'); s.join(gameId); }
      }

      io.to(gameId).emit('gameStarted', { gameState: state });
    });

    // ── CHAT ─────────────────────────────────────────────────────────────────
    // socket.on('sendMessage', ({ gameId, message }: { gameId?: string; message: string }) => {
    //   if (!message?.trim() || message.length > 200) return;
    //   const msg = { username, text: message.trim(), type: 'user' };
    //   chatHistory.push(msg);
    //   if (chatHistory.length > 200) chatHistory.shift();
    //   io.to(gameId ?? 'lobby').emit('newMessage', msg);
    // });
      socket.on('sendMessage', ({ gameId, message }: { gameId?: string; message: string }) => {
      if (!message?.trim() || message.length > 200) return;
      
      const msg = { username, text: message.trim(), type: 'user' };
      chatHistory.push(msg);
      if (chatHistory.length > 200) chatHistory.shift();

      // Broadcast to the specific game room OR the lobby
      io.to(gameId || 'lobby').emit('newMessage', msg);
    });

    // ── REJOIN (on reconnect) ─────────────────────────────────────────────────
    socket.on('rejoinGame', ({ gameId }: { gameId: string }) => {
      const state = activeGames.get(gameId);
      if (!state) return socket.emit('error', { message: 'Game not found' });
      const player = state.players.find(p => p.userId === userId);
      if (!player) return socket.emit('error', { message: 'Not in this game' });
      player.socketId = socket.id;
      socket.join(gameId);
      socket.emit('gameStateUpdate', { gameState: state });
    });

    // ── GAME EVENTS ──────────────────────────────────────────────────────────
    registerGameHandlers(socket, activeGames, io, userId);

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const idx = lobbyPlayers.findIndex(p => p.userId === userId);
      if (idx !== -1) {
        lobbyPlayers.splice(idx, 1);
        io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
      }
    });
  });
}
