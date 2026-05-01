// WHAT: Handles punishment when a player rolls 6 too many times in a row.
// MODIFY: server/utils/ludoEngine.ts — inside applyMove()
// Current behaviour: 3 consecutive 6s → lose turn (turn advances, no bonus).
// Exams often ask to CHANGE what the penalty is, not just detect it.

// ── CURRENT DETECTION (already in ludoEngine) ──────────────────────────────
// consecutiveSixes is incremented every time a 6 is rolled.
// extraTurn = rolledSix && consecutiveSixes < 3
// When consecutiveSixes reaches 3, extraTurn = false and turn advances.

// ── EXAM SCENARIO 1: Send most-advanced token back to yard ────────────────
// Replace the "advance turn" block with this when consecutiveSixes === 3:
function penaltyResetMostAdvancedToken(player: any): void {
  // Find the token furthest along (not finished)
  const token = player.tokens
    .filter((t: any) => t.steps !== 57)
    .sort((a: any, b: any) => b.steps - a.steps)[0];
  if (token) token.steps = 0;
}

// Integration — replace the tail of applyMove() with:
/*
  const rolledSix = dice === 6;
  if (rolledSix) {
    newState.consecutiveSixes += 1;
  } else {
    newState.consecutiveSixes = 0;
  }

  if (rolledSix && newState.consecutiveSixes >= 3) {
    // PENALTY: send most-advanced token home
    penaltyResetMostAdvancedToken(player);
    newState.consecutiveSixes = 0;
    newState.currentPlayerIndex = getNextPlayerIndex(newState);
    newState.log.push({ ... text: `${player.color} penalty — token sent home!`, type: 'system' });
  } else {
    const extraTurn = rolledSix;
    if (!extraTurn && newState.status === 'playing') {
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
    }
  }
*/

// ── EXAM SCENARIO 2: Skip the move (forfeit token move) ───────────────────
// Instead of applying the move at all when consecutiveSixes hits 3,
// check BEFORE calling applyMove in socketHandler.ts:
//
// In socketHandler rollDice handler, after rolling:
/*
  if (state.consecutiveSixes >= 2 && diceVal === 6) {
    // This would be the 3rd six — auto-forfeit, no move allowed
    state.consecutiveSixes = 0;
    state.diceValue = diceVal;
    state.diceRolled = false;
    state.currentPlayerIndex = getNextPlayerIndex(state);
    io.to(gameId).emit('gameStateUpdate', { gameState: state });
    startTurnTimer(io, gameId);
    return;
  }
*/

// ── EXAM SCENARIO 3: Change threshold to 2 (stricter) ────────────────────
// Just change the comparison:
// const extraTurn = rolledSix && newState.consecutiveSixes < 2;

// ── EXAM SCENARIO 4: No penalty at all ───────────────────────────────────
// Remove the consecutiveSixes tracking entirely:
// const extraTurn = rolledSix; // always get extra turn on 6

export { penaltyResetMostAdvancedToken };
