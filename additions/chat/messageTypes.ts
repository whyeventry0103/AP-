// WHAT: Extend chat with typed messages (user/system/announce/whisper).
// MODIFY: server/utils/socketHandler.ts — sendMessage handler and chatMessage emit
// ALSO: client/APP/src/pages/Game.tsx — ChatMsg interface + rendering

// ── EXTENDED ChatMsg TYPE ──────────────────────────────────────────────────
// Current (in Game.tsx):
//   interface ChatMsg { username: string; color: string; message: string; time: string; userId: string; }
//
// REPLACE with:
interface ChatMsg {
  username: string;
  color: string;
  message: string;
  time: string;
  userId: string;
  type: 'user' | 'system' | 'announce' | 'whisper'; // NEW FIELD
  targetUserId?: string; // for whisper
}

// ── SERVER: Add type to all chatMessage emits ─────────────────────────────

// In sendMessage handler — user messages:
/*
  io.to(gameId).emit('chatMessage', {
    username: user.username,
    color: player?.color || 'system',
    message: message.trim().substring(0, 200),
    time,
    userId,
    type: 'user',   // <-- add this
  });
*/

// In emitSystemMessage helper:
/*
  io.to(gameId).emit('chatMessage', {
    username: 'System',
    color: 'system',
    message,
    time,
    userId: 'system',
    type: 'system', // <-- add this
  });
*/

// Announcement (broadcast to everyone, styled differently):
function emitAnnouncement(io: any, gameId: string, message: string): void {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  io.to(gameId).emit('chatMessage', {
    username: '📢 Announcement',
    color: 'system',
    message,
    time,
    userId: 'system',
    type: 'announce',
  });
}

// ── FRONTEND: Render different message types in Game.tsx ──────────────────
// In the chat rendering section, add styling based on msg.type:
/*
  <div key={i} className={`chat-msg
    ${isMine ? ' mine' : ''}
    ${msg.type === 'system' ? ' sys' : ''}
    ${msg.type === 'announce' ? ' announce' : ''}
    ${msg.type === 'whisper' ? ' whisper' : ''}
  `}>
*/

// Add to index.css:
/*
  .chat-msg.announce {
    background: #fff8e1;
    border-left: 3px solid #f9a825;
    padding: 6px 10px;
    font-style: italic;
  }
  .chat-msg.whisper {
    background: #f3e5f5;
    border-left: 3px solid #9c27b0;
  }
*/

// ── EXAM SCENARIO: Prefix detection for commands ─────────────────────────
// In sendMessage handler, detect commands:
/*
  if (message.startsWith('/all ')) {
    const announcement = message.slice(5);
    emitAnnouncement(io, gameId, announcement);
    return;
  }
*/

export { ChatMsg, emitAnnouncement };
