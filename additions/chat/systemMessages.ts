// WHAT: Emit structured system messages via Socket.IO for game events.
// MODIFY: server/utils/socketHandler.ts — inside finishGame, and optionally in applyMove
// The game log already stores events in GameState.log. This adds REAL-TIME chat announcements
// via the chatMessage socket event (same channel players use).

// ── HOW SYSTEM MESSAGES CURRENTLY WORK ────────────────────────────────────
// applyMove() adds entries to newState.log[] which is sent with every gameStateUpdate.
// The chat panel in Game.tsx is separate — it uses socket 'chatMessage' events.
// System messages should go to BOTH if you want them in the chat panel.

// ── SYSTEM MESSAGE HELPER (add to socketHandler.ts) ──────────────────────
function emitSystemMessage(io: any, gameId: string, message: string): void {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  io.to(gameId).emit('chatMessage', {
    username: 'System',
    color: 'system',
    message,
    time,
    userId: 'system',
  });
}

// ── WHERE TO CALL IT ──────────────────────────────────────────────────────

// In finishGame(), after the loop that assigns ranks:
/*
  const winner = state.players.find(p => p.rank === 1);
  emitSystemMessage(io, state.gameId, `🏆 ${winner?.username} wins the game!`);
*/

// In moveToken handler, after applyMove — detect capture from log:
/*
  const lastLog = newState.log[newState.log.length - 1];
  if (lastLog?.type === 'capture') {
    emitSystemMessage(io, gameId, `⚔️ ${lastLog.text}`);
  }
  if (lastLog?.type === 'finish') {
    emitSystemMessage(io, gameId, `🎉 ${lastLog.text}`);
  }
*/

// In disconnect handler:
/*
  emitSystemMessage(io, gameId, `${p.username} disconnected — AI is now playing for them`);
*/

// In rejoinGame handler:
/*
  const player = state.players.find(p => p.userId === userId);
  if (player) {
    emitSystemMessage(io, gameId, `${player.username} reconnected`);
  }
*/

// ── FRONTEND: Game.tsx — system messages already styled ─────────────────
// The chat panel already handles messages with color='system':
//   const isSystem = msg.color === 'system';
// And renders them with class 'sys'. No changes needed.

export { emitSystemMessage };
