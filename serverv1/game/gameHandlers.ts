// ── MODIFY THIS FILE to add/remove socket events for your game ──────────────
// Add one function per event, then register it in registerGameHandlers.

import { Server, Socket } from 'socket.io';
import { validateAction, applyAction, isGameOver, rankPlayers } from './gameEngine';
import { GameState, getCoinReward } from './gameTypes';
import User from '../models/User';
import Game from '../models/Game';

// ── MAIN GAME ACTION ─────────────────────────────────────────────────────────
// MODIFY: rename 'takeAction' to match your game (rollDice, makeMove, placePiece…)
function handleTakeAction(
  socket: Socket,
  activeGames: Map<string, GameState>,
  io: Server,
  userId: string
) {
  socket.on('takeAction', ({ gameId, action }: { gameId: string; action: any }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });

    const err = validateAction(state, userId, action);
    if (err) return socket.emit('error', { message: err });

    const newState = applyAction(state, userId, action);
    activeGames.set(gameId, newState);
    io.to(gameId).emit('gameStateUpdate', { gameState: newState });

    if (isGameOver(newState)) {
      finishGame(gameId, newState, activeGames, io);
    }
  });
}

// ── FINISH GAME (called automatically — you rarely need to modify this) ──────
async function finishGame(
  gameId: string,
  state: GameState,
  activeGames: Map<string, GameState>,
  io: Server
) {
  const rankings   = rankPlayers(state);
  const n          = state.players.length;
  const finalState = { ...state, status: 'finished' as const };
  activeGames.set(gameId, finalState);

  const playerResults = [];
  for (const { userId, rank } of rankings) {
    const coins = getCoinReward(rank, n);
    await User.findByIdAndUpdate(userId, {
      $inc: { coins, total_played: 1, ...(rank === 1 ? { wins: 1 } : {}) },
    });
    const p = state.players.find(pl => pl.userId === userId)!;
    playerResults.push({ userId, username: p.username, rank, coinsEarned: coins });
  }

  await Game.create({
    players: playerResults,
    status: 'finished',
    startedAt: new Date(state.startedAt),
    finishedAt: new Date(),
  });

  io.to(gameId).emit('gameOver', { gameState: finalState, rankings });
  activeGames.delete(gameId);
}

// ── REGISTER ALL GAME HANDLERS ───────────────────────────────────────────────
// MODIFY: add new handler calls here when you add new game events
export function registerGameHandlers(
  socket: Socket,
  activeGames: Map<string, GameState>,
  io: Server,
  userId: string
) {
  handleTakeAction(socket, activeGames, io, userId);
  // handleRollDice(socket, activeGames, io, userId);
  // handleMoveToken(socket, activeGames, io, userId);
}
