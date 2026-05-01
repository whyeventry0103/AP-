import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket, disconnectSocket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';

interface LobbyPlayer { userId: string; username: string; }
interface ChatMsg { username: string; text: string; type: string; }

export default function Lobby() {
  const { user }                    = useAuth();
  const navigate                    = useNavigate();
  const [players, setPlayers]       = useState<LobbyPlayer[]>([]);
  const [messages, setMessages]     = useState<ChatMsg[]>([]);
  const [input, setInput]           = useState('');
  const [error, setError]           = useState('');
  const messagesEndRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.emit('joinLobby');

    // 1. Define named callbacks that React won't lose track of
    const handleLobbyUpdate = ({ players: ps }: { players: LobbyPlayer[] }) => setPlayers(ps);
    const handleChatHistory = (history: ChatMsg[]) => setMessages(history);
    const handleNewMessage  = (msg: ChatMsg) => setMessages(prev => [...prev, msg]);
    const handleGameStarted = ({ gameState }: { gameState: any }) => {
      sessionStorage.setItem('gameId', gameState.gameId);
      navigate('/game');
    };
    const handleError       = ({ message }: { message: string }) => setError(message);

    // 2. Attach listeners
    socket.on('lobbyUpdate', handleLobbyUpdate);
    socket.on('chatHistory', handleChatHistory);
    socket.on('newMessage', handleNewMessage);
    socket.on('gameStarted', handleGameStarted);
    socket.on('error', handleError);

    // 3. Cleanup perfectly matches closures
    return () => {
      socket.emit('leaveLobby');
      socket.off('lobbyUpdate', handleLobbyUpdate);
      socket.off('chatHistory', handleChatHistory);
      socket.off('newMessage', handleNewMessage);
      socket.off('gameStarted', handleGameStarted);
      socket.off('error', handleError);
    };
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    getSocket().emit('sendMessage', { message: input.trim() });
    setInput('');
  }

  function startGame() {
    setError('');
    getSocket().emit('startGame');
  }

  const isHost = players[0]?.userId === user?._id;

  return (
    <div className="page">
      <h1>Lobby</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div>
          <div className="lobby-players">
            {players.map((p, i) => (
              <div className="lobby-player" key={p.userId}>
                <span>{p.username}</span>
                {i === 0 && <span className="host-badge">HOST</span>}
              </div>
            ))}
            {players.length === 0 && <p className="info-msg">Waiting for players…</p>}
          </div>
          {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
          {isHost ? (
            <button
              className="btn btn-primary"
              onClick={startGame}
              disabled={players.length < 2}
              style={{ width: 200 }}
            >
              Start Game ({players.length}/4)
            </button>
          ) : (
            <p className="info-msg">Waiting for host to start…</p>
          )}
        </div>

        <div className="chat-box">
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.type === 'system' ? 'system' : ''}`}>
                {m.type !== 'system' && <span className="author">{m.username}:</span>}
                {m.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message…"
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
