// ── MODIFY THIS FILE to handle your game's socket events ──────────────────
// Import this hook in GamePage.tsx. Add new socket listeners as needed.

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../utils/socket';

// ── MODIFY: match GameState shape from server_new/game/gameTypes.ts ─────────
export interface GameState {
  gameId: string;
  players: { userId: string; username: string; score: number }[];
  status: string;
  currentPlayerIndex: number;
  counter: number;       // MODIFY
  lastAction: string;    // MODIFY
  log: string[];
}

export function useGame(userId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver,  setGameOver]  = useState<{ rankings: { userId: string; rank: number }[] } | null>(null);
  const [error,     setError]     = useState('');
  const socket                    = getSocket();

  useEffect(() => {
    const gameId = sessionStorage.getItem('gameId');
    if (gameId) {
      socket.emit('rejoinGame', { gameId });
    }

    socket.on('gameStarted', ({ gameState: gs }: { gameState: GameState }) => {
      setGameState(gs);
      sessionStorage.setItem('gameId', gs.gameId);
    });

    socket.on('gameStateUpdate', ({ gameState: gs }: { gameState: GameState }) => {
      setGameState(gs);
    });

    socket.on('gameOver', ({ gameState: gs, rankings }: { gameState: GameState; rankings: any[] }) => {
      setGameState(gs);
      setGameOver({ rankings });
      sessionStorage.removeItem('gameId');
    });

    socket.on('error', ({ message }: { message: string }) => {
      setError(message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.off('gameStarted');
      socket.off('gameStateUpdate');
      socket.off('gameOver');
      socket.off('error');
    };
  }, []);

  // ── MODIFY: rename and adapt this action for your game ──────────────────
  const takeAction = useCallback((action?: any) => {
    if (!gameState) return;
    socket.emit('takeAction', { gameId: gameState.gameId, action: action ?? {} });
  }, [gameState]);

  const isMyTurn = gameState
    ? gameState.players[gameState.currentPlayerIndex]?.userId === userId
    : false;

  return { gameState, gameOver, error, isMyTurn, takeAction };
}
