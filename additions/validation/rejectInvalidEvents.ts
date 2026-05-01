// WHAT: Reject socket events that don't have the right structure or come from wrong context.
// MODIFY: server/utils/socketHandler.ts — add guards at handler entry points

// ── GUARD 1: Reject events with missing/wrong payload fields ──────────────
function requireFields<T extends object>(payload: unknown, fields: (keyof T)[]): T | null {
  if (typeof payload !== 'object' || payload === null) return null;
  for (const field of fields) {
    if (!(field in payload)) return null;
  }
  return payload as T;
}

// Usage in socketHandler:
/*
  socket.on('moveToken', (payload: unknown) => {
    const data = requireFields<{ gameId: string; tokenIndex: number }>(payload, ['gameId', 'tokenIndex']);
    if (!data) return socket.emit('error', { message: 'Invalid payload' });

    const { gameId, tokenIndex } = data;
    // ... rest
  });

  socket.on('rollDice', (payload: unknown) => {
    const data = requireFields<{ gameId: string }>(payload, ['gameId']);
    if (!data) return socket.emit('error', { message: 'Invalid payload' });
    const { gameId } = data;
    // ...
  });
*/

// ── GUARD 2: Reject unauthenticated sockets ───────────────────────────────
// The existing auth middleware already handles this — if JWT is missing/invalid,
// the socket never connects. But if you want to double-check inside handlers:
/*
  socket.on('rollDice', ({ gameId }) => {
    if (!userId) return socket.emit('error', { message: 'Not authenticated' }); // shouldn't happen
    // ...
  });
*/

// ── GUARD 3: Rate limiting (prevent event flooding) ───────────────────────
const eventCounts = new Map<string, { count: number; resetAt: number }>();

function isFloodingEvents(socketId: string, maxPerSecond = 10): boolean {
  const now = Date.now();
  const key = socketId;
  const entry = eventCounts.get(key);

  if (!entry || now > entry.resetAt) {
    eventCounts.set(key, { count: 1, resetAt: now + 1000 });
    return false;
  }

  entry.count++;
  if (entry.count > maxPerSecond) {
    return true;
  }
  return false;
}

// Usage at the start of any event handler:
/*
  socket.on('rollDice', ({ gameId }) => {
    if (isFloodingEvents(socket.id)) return; // silently drop
    // ...
  });
*/

// ── GUARD 4: Ensure gameId is a valid MongoDB ObjectId format ─────────────
function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

// Usage:
/*
  socket.on('rollDice', ({ gameId }) => {
    if (!isValidObjectId(gameId)) return socket.emit('error', { message: 'Invalid game ID' });
    // ...
  });
*/

// ── GUARD 5: Block events after game ends ─────────────────────────────────
// The status check in validateRollDice/validateMoveToken already handles this.
// But you can add a top-level guard:
/*
  function gameIsActive(gameId: string): boolean {
    const state = activeGames.get(gameId);
    return !!(state && state.status === 'playing');
  }
*/

export { requireFields, isFloodingEvents, isValidObjectId };
