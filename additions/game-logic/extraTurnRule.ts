// WHAT: Controls when a player gets an extra turn after rolling.
// MODIFY: server/utils/ludoEngine.ts — inside applyMove(), near the bottom
// The current code already handles extra turn on 6. This file shows how to
// extend or modify the rule under different exam scenarios.

// ── CURRENT IMPLEMENTATION (already in applyMove) ──────────────────────────
// The relevant block at the bottom of applyMove():
//
//   const rolledSix = dice === 6;
//   if (rolledSix) {
//     newState.consecutiveSixes += 1;
//   } else {
//     newState.consecutiveSixes = 0;
//   }
//   const extraTurn = rolledSix && newState.consecutiveSixes < 3;
//   if (!extraTurn && newState.status === 'playing') {
//     newState.currentPlayerIndex = getNextPlayerIndex(newState);
//     newState.consecutiveSixes = 0;
//   }

// ── EXAM SCENARIO 1: Remove extra turn on 6 ────────────────────────────────
// Replace the extraTurn block with:
function noExtraTurnVariant(newState: any) {
  // No extra turns at all — always advance to next player
  newState.consecutiveSixes = 0;
  if (newState.status === 'playing') {
    newState.currentPlayerIndex = getNextPlayerIndex(newState);
  }
}

// ── EXAM SCENARIO 2: Extra turn on capture OR on 6 ────────────────────────
// In applyMove, track whether a capture happened, then:
//
// Step 1 — add a flag before the capture loop:
//   let didCapture = false;
//
// Step 2 — set it inside the capture block:
//   oppToken.steps = 0;
//   didCapture = true;
//
// Step 3 — replace the extraTurn line with:
function extraTurnOnSixOrCapture(dice: number, didCapture: boolean, consecutiveSixes: number): boolean {
  const rolledSix = dice === 6;
  if (rolledSix && consecutiveSixes >= 3) return false; // penalty still applies
  return rolledSix || didCapture;
}
// Then use: const extraTurn = extraTurnOnSixOrCapture(dice, didCapture, newState.consecutiveSixes);

// ── EXAM SCENARIO 3: Extra turn only when token enters board (rolled 6 + was in yard) ──
function extraTurnOnEnterOnly(dice: number, wasInYard: boolean, consecutiveSixes: number): boolean {
  if (consecutiveSixes >= 3) return false;
  return dice === 6 && wasInYard;
}
// Track wasInYard = oldSteps === 0 before moving the token.

// ── EXAM SCENARIO 4: Limit to N extra turns in a row ──────────────────────
// Change the < 3 threshold. If exam says "max 2 consecutive 6s":
const MAX_CONSECUTIVE = 2; // was 3
// const extraTurn = rolledSix && newState.consecutiveSixes < MAX_CONSECUTIVE;

// ── HELPER (already exists in ludoEngine, shown here for reference) ─────────
function getNextPlayerIndex(state: any): number {
  const total = state.players.length;
  let next = (state.currentPlayerIndex + 1) % total;
  let tries = 0;
  while (tries < total) {
    if (!state.players[next].tokens.every((t: any) => t.steps === 57)) return next;
    next = (next + 1) % total;
    tries++;
  }
  return next;
}

export { extraTurnOnSixOrCapture, extraTurnOnEnterOnly };
