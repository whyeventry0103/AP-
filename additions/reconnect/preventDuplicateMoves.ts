// WHAT: Prevent the same move from being applied twice (e.g., double-click, network retry).
// MODIFY: server/utils/socketHandler.ts — moveToken and rollDice handlers
// Also: ludoEngine.ts — optionally add a moveId field to GameState.

// ── PROBLEM ────────────────────────────────────────────────────────────────
// If a player double-clicks a token, two moveToken events fire.
// The first applies correctly; the second finds state already updated and
// fails the validIndices check — but logs a confusing error.
// If the network retries a socket event, same issue.

// ── SOLUTION 1: Server-side idempotency via turnCount ────────────────────
// The client sends the turnCount it thinks is current.
// Server rejects if it doesn't match (move already applied).
//
// In moveToken event payload, add turnCount:
//   socket.emit('moveToken', { gameId, tokenIndex, turnCount: gameState.turnCount })
//
// In moveToken handler:
/*
  socket.on('moveToken', ({ gameId, tokenIndex, turnCount }) => {
    const state = activeGames.get(gameId);
    if (!state) return;
    if (state.turnCount !== turnCount) {
      // This is a stale or duplicate event — ignore silently
      return;
    }
    // ... rest of handler
  });
*/

// ── SOLUTION 2: Track processed turnCounts per user (stricter) ───────────
/*
  const processedTurns = new Map<string, number>(); // `${userId}:${gameId}` -> last turnCount

  socket.on('moveToken', ({ gameId, tokenIndex, turnCount }) => {
    const key = `${userId}:${gameId}`;
    if (processedTurns.get(key) === turnCount) return; // already processed
    processedTurns.set(key, turnCount);
    // ... rest of handler
  });
*/

// ── SOLUTION 3: Simpler — just rely on validation ────────────────────────
// The current code already prevents duplicate moves naturally:
// After applyMove(), diceRolled is set to false and diceValue to null.
// So a duplicate moveToken would fail: "Roll dice first" or "Invalid move".
// This is already safe. Only add idempotency if the exam specifically asks.

// ── PREVENT DOUBLE ROLL ──────────────────────────────────────────────────
// Already guarded: if (state.diceRolled) return socket.emit('error', { message: 'Already rolled' });
// But to be extra safe, add a cooldown:
/*
  const rollCooldown = new Map<string, number>(); // userId -> timestamp

  socket.on('rollDice', ({ gameId }) => {
    const last = rollCooldown.get(userId) ?? 0;
    if (Date.now() - last < 1000) return; // 1 second cooldown
    rollCooldown.set(userId, Date.now());
    // ... rest of handler
  });
*/

// ── FRONTEND: Disable button after click (Game.tsx) ──────────────────────
// Add a local flag to prevent double-clicks:
/*
  const [rolling, setRolling] = useState(false);

  const handleRoll = () => {
    if (!isMyTurn || gameState?.diceRolled || rolling) return;
    setRolling(true);
    socket.emit('rollDice', { gameId });
    setTimeout(() => setRolling(false), 1000); // re-enable after 1s
  };

  // In JSX:
  <button disabled={!isMyTurn || gameState.diceRolled || rolling}>Roll!</button>
*/

export {};
