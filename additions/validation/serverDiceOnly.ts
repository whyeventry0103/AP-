// WHAT: Ensure the client can never inject or influence the dice value.
// The current implementation is already correct. This file explains WHY and
// shows what the WRONG pattern looks like vs the RIGHT pattern.

// ── THE CURRENT CORRECT PATTERN ───────────────────────────────────────────
// Client emits:  rollDice({ gameId })         -- no dice value
// Server calls:  const diceVal = rollDice();  -- server generates it
// Server emits:  diceRolled({ gameState })    -- state includes the value

// ── WRONG PATTERN (never do this) ────────────────────────────────────────
/*
  // CLIENT (vulnerable):
  const myRoll = Math.floor(Math.random() * 6) + 1;
  socket.emit('rollDice', { gameId, diceValue: myRoll }); // client sends the value!

  // SERVER (vulnerable):
  socket.on('rollDice', ({ gameId, diceValue }) => {
    state.diceValue = diceValue; // trusting the client!!! NEVER DO THIS
  });
*/

// ── GUARD: Ignore any dice value sent by client ───────────────────────────
// Even if the client sends a diceValue field, the server ignores it:
/*
  socket.on('rollDice', ({ gameId }: { gameId: string }) => {
    // Note: we destructure ONLY gameId — any extra fields like diceValue are ignored
    const diceVal = rollDice(); // server-generated only
    state.diceValue = diceVal;
    // ...
  });
*/

// ── PARANOID GUARD: Explicitly check and reject if dice value is included ──
/*
  socket.on('rollDice', (payload: any) => {
    if ('diceValue' in payload) {
      console.warn(`[Security] Player ${userId} tried to inject dice value: ${payload.diceValue}`);
      return socket.emit('error', { message: 'Dice value must be server-generated' });
    }
    const { gameId } = payload;
    // ... normal handling
  });
*/

// ── VERIFY IN THE STATE THAT DICEVALUE ONLY COMES FROM SERVER ────────────
// The diceValue in GameState is ONLY ever set in two places (both server-side):
// 1. ludoEngine.ts: applyMove() — sets diceValue = null after a move
// 2. socketHandler.ts: rollDice handler — sets diceValue = rollDice() (server)
// 3. socketHandler.ts: startTurnTimer — auto-roll sets diceValue = rollDice() (server)

// VERIFY with grep:
//   grep -n "diceValue" server/utils/socketHandler.ts
//   grep -n "diceValue" server/utils/ludoEngine.ts
// You should see NO line that reads diceValue FROM the client payload.

// ── WHAT THE CLIENT CAN DO ────────────────────────────────────────────────
// Client emits: rollDice({ gameId })    -- only tells server "I want to roll"
// Client emits: moveToken({ gameId, tokenIndex })  -- only tells server which token
// Client NEVER sends: diceValue, rank, coins, steps, currentPlayerIndex

// ── INTEGRITY CHECK: Validate game state before broadcasting ─────────────
// If you want to be extra careful, validate state consistency before emitting:
function sanityCheckState(state: any): boolean {
  if (!state) return false;
  if (state.diceValue !== null && (state.diceValue < 1 || state.diceValue > 6)) return false;
  if (state.currentPlayerIndex < 0 || state.currentPlayerIndex >= state.players.length) return false;
  for (const player of state.players) {
    for (const token of player.tokens) {
      if (token.steps < 0 || token.steps > 57) return false;
    }
  }
  return true;
}

export { sanityCheckState };
