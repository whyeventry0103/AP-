// ── MODIFY THIS FILE to render your game's board and controls ──────────────
// Swap out the counter UI below for your game's actual visuals.

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from './useGame';
import { getSocket } from '../utils/socket';

export default function GamePage() {
  const { user }                     = useAuth();
  const navigate                     = useNavigate();
  const { gameState, gameOver, error, isMyTurn, takeAction } = useGame(user?._id ?? '');

  const [messages, setMessages]  = useState<{ username: string; text: string; type: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const msgEndRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on('newMessage', (msg: any) => setMessages(prev => [...prev, msg]));
    return () => { socket.off('newMessage'); };
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!chatInput.trim() || !gameState) return;
    getSocket().emit('sendMessage', { gameId: gameState.gameId, message: chatInput.trim() });
    setChatInput('');
  }

  if (!gameState) {
    return (
      <div className="center">
        <p>Waiting for game to start…</p>
        <button className="btn btn-ghost" onClick={() => navigate('/lobby')}>Back to Lobby</button>
      </div>
    );
  }

  if (gameOver) {
    const myRank = gameOver.rankings.find(r => r.userId === user?._id)?.rank;
    return (
      <div className="center">
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>Game Over!</h2>
          <p style={{ margin: '12px 0', fontSize: 18 }}>
            {myRank === 1 ? 'You won!' : `You finished #${myRank}`}
          </p>
          <div style={{ marginBottom: 16 }}>
            {gameOver.rankings.map(r => {
              const p = gameState.players.find(pl => pl.userId === r.userId);
              return <p key={r.userId} style={{ fontSize: 14 }}>#{r.rank} {p?.username}</p>;
            })}
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/lobby')}>Play Again</button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="game-layout">
      {/* ── GAME BOARD (MODIFY THIS SECTION) ──────────────────────────── */}
      <div className="game-board">
        <h2 style={{ marginBottom: 20 }}>Counter Game</h2>

        {/* ── REPLACE BELOW WITH YOUR GAME VISUALS ── */}
        <div style={{ fontSize: 72, fontWeight: 700, color: '#818cf8', marginBottom: 20 }}>
          {gameState.counter}
        </div>
        <p style={{ color: '#aaa', marginBottom: 24 }}>
          {gameState.lastAction || 'Game started!'}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => takeAction()}
          disabled={!isMyTurn || gameState.status !== 'playing'}
          style={{ width: 200, fontSize: 18, padding: '14px 0' }}
        >
          {isMyTurn ? 'Increment' : `${currentPlayer?.username}'s turn`}
        </button>
        {/* ── END GAME VISUALS ── */}

        {error && <p className="error-msg" style={{ marginTop: 12 }}>{error}</p>}
      </div>

      {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
      <div className="game-sidebar">
        {/* Players */}
        <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 14 }}>
          <h3 style={{ marginBottom: 10, fontSize: 14 }}>Players</h3>
          {gameState.players.map((p, i) => (
            <div key={p.userId} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', fontSize: 13,
              opacity: i === gameState.currentPlayerIndex ? 1 : 0.5,
            }}>
              <span>
                {i === gameState.currentPlayerIndex && '▶ '}
                {p.username} {p.userId === user?._id && '(you)'}
              </span>
              <span>{p.score} pts</span>
            </div>
          ))}
        </div>

        {/* Log */}
        <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 14 }}>
          <h3 style={{ marginBottom: 10, fontSize: 14 }}>Log</h3>
          <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, color: '#9ca3af' }}>
            {[...gameState.log].reverse().map((entry, i) => (
              <p key={i}>{entry}</p>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="chat-box" style={{ flex: 1 }}>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.type === 'system' ? 'system' : ''}`}>
                {m.type !== 'system' && <span className="author">{m.username}:</span>}
                {m.text}
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>
          <div className="chat-input">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Chat…"
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
