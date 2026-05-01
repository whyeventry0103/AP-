// WHAT: Let one player send a message only visible to another player.
// MODIFY: server/utils/socketHandler.ts — add whisper event
// ALSO: client/APP/src/pages/Game.tsx — add whisper UI

// ── SERVER: New event — whisper ───────────────────────────────────────────
// Add inside io.on('connection') in socketHandler.ts:
/*
  socket.on('whisper', async ({ gameId, targetUserId, message }: {
    gameId: string;
    targetUserId: string;
    message: string;
  }) => {
    if (!message?.trim()) return;

    const state = activeGames.get(gameId);
    if (!state) return;

    const sender = state.players.find(p => p.userId === userId);
    const target = state.players.find(p => p.userId === targetUserId);
    if (!sender || !target) return socket.emit('error', { message: 'Player not found' });

    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const msg = {
      username: sender.username,
      color: sender.color,
      message: `[whisper] ${message.trim().substring(0, 200)}`,
      time,
      userId,
      type: 'whisper',
      targetUserId,
    };

    // Send to sender (so they see it) and target only
    socket.emit('chatMessage', { ...msg, isMine: true });

    // Find target socket
    const targetSocket = [...io.sockets.sockets.values()]
      .find(s => (s as any).userId === targetUserId);
    if (targetSocket) {
      targetSocket.emit('chatMessage', { ...msg, isMine: false });
    }
  });
*/

// ── FRONTEND: Whisper UI in Game.tsx ─────────────────────────────────────
// Add state for whisper target:
//   const [whisperTarget, setWhisperTarget] = useState<string | null>(null);
//
// Add a "Whisper" button next to each player name in the players panel:
/*
  {p.userId !== user?._id && (
    <button onClick={() => setWhisperTarget(whisperTarget === p.userId ? null : p.userId)}
      style={{ fontSize: 10, padding: '2px 6px', background: whisperTarget === p.userId ? '#9c27b0' : '#eee',
               color: whisperTarget === p.userId ? '#fff' : '#333', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
      whisper
    </button>
  )}
*/
//
// Modify handleSendMessage in Game.tsx:
/*
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (whisperTarget) {
      socket.emit('whisper', { gameId, targetUserId: whisperTarget, message: chatInput });
      // Add locally as sent whisper
      setChatMessages(prev => [...prev, {
        username: 'You (whisper)',
        color: myColor || 'system',
        message: `→ ${chatInput}`,
        time: new Date().toLocaleTimeString(),
        userId: user?._id || '',
        type: 'whisper',
      }]);
    } else {
      socket.emit('sendMessage', { gameId, message: chatInput });
      // existing local add logic
    }
    setChatInput('');
  };
*/

// Add visual indicator when whisper mode is active:
/*
  {whisperTarget && (
    <div style={{ background: '#f3e5f5', padding: '4px 8px', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
      <span>Whispering to {gameState.players.find(p => p.userId === whisperTarget)?.username}</span>
      <button onClick={() => setWhisperTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
    </div>
  )}
*/

export {};
