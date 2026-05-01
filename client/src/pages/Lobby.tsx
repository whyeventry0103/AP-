import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../utils/socket';

interface LobbyPlayer { socketId: string; userId: string; username: string; }
const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_CLASSES = ['red', 'blue', 'green', 'yellow'] as const;

export default function Lobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [error, setError] = useState('');
  const socket = getSocket();

  useEffect(() => {
    socket.emit('joinLobby');

    socket.on('lobbyUpdate', ({ players: p }: { players: LobbyPlayer[] }) => {
      setPlayers(p);
    });

    socket.on('gameStarted', ({ gameState }: { gameState: { gameId: string } }) => {
      navigate(`/newgame/${gameState.gameId}`, { state: { gameState } });
    });

    socket.on('error', ({ message }: { message: string }) => setError(message));

    return () => {
      socket.off('lobbyUpdate');
      socket.off('gameStarted');
      socket.off('error');
    };
  }, []);

  const handleStart = () => {
    if (players.length < 2) return setError('Need at least 2 players to start');
    setError('');
    socket.emit('startGame');
  };

  const handleBack = () => {
    socket.emit('leaveLobby');
    navigate('/home');
  };

  const slots = Array.from({ length: 4 }, (_, i) => players[i] || null);
  const isHost = players.length > 0 && players[0].userId === user?._id;

  return (
    <div className="page">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: '#f9a825', marginBottom: 8, textShadow: '2px 2px 4px rgba(0,0,0,.2)' }}>🎲 LUDO</h1>
          <p style={{ fontSize: 18, color: '#e8f5e9', fontWeight: 600 }}>Classic Board Game Experience</p>
        </div>
        <div style={{ background: '#f5f0e8', border: '3px solid #4e342e', borderRadius: 12, padding: 40, width: '100%', maxWidth: 600, boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}>
          <h2 style={{ color: '#4e342e', fontSize: 28, marginBottom: 30, textAlign: 'center' }}>Game Lobby</h2>
          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, marginBottom: 30 }}>
            {slots.map((p, i) => (
              <div key={i} style={{ background: p ? '#f0f8f0' : '#f9f9f9', border: p ? '2px solid #4a7c4e' : '2px dashed #a08060', borderRadius: 10, padding: 20, textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', opacity: p ? 1 : 0.7 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Player {i + 1}</span>
                <span style={{ fontSize: 16, color: '#4e342e', fontWeight: 700 }}>{p ? (p.userId === user?._id ? 'You' : p.username) : 'Waiting...'}</span>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(0,0,0,.2)', background: p ? (COLOR_CLASSES[i] === 'red' ? '#e53935' : COLOR_CLASSES[i] === 'blue' ? '#1e88e5' : COLOR_CLASSES[i] === 'green' ? '#43a047' : '#fdd835') : '#e0e0e0', opacity: p ? 1 : 0.5 }} />
              </div>
            ))}
          </div>
          {isHost ? (
            <button style={{ width: '100%', padding: 16, background: players.length >= 2 ? '#2e7d32' : '#bdb', color: '#fff', border: `2px solid ${players.length >= 2 ? '#1b5e20' : '#999'}`, borderRadius: 8, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: players.length >= 2 ? 'pointer' : 'not-allowed', marginBottom: 16 }} onClick={handleStart} disabled={players.length < 2}>
              {players.length < 2 ? 'Waiting for players...' : `Start Game (${players.length}/4 Players)`}
            </button>
          ) : (
            <div style={{ width: '100%', padding: 16, background: '#e8f5e9', border: '2px solid #4a7c4e', borderRadius: 8, fontSize: 16, fontWeight: 600, textAlign: 'center', marginBottom: 16, color: '#2e7d32' }}>
              Waiting for host to start... ({players.length}/4)
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #d4c4b0' }}>
            <span style={{ color: '#666', fontSize: 14, fontWeight: 600 }}>{players.length} player{players.length !== 1 ? 's' : ''} ready</span>
            <button onClick={handleBack} style={{ background: '#999', color: '#fff', border: '2px solid #777', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.5px' }}>Go Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
