// WHAT: Give the player an extra turn when they capture an opponent's token.
// MODIFY: server/utils/ludoEngine.ts — inside applyMove()
// This is NOT in the current implementation. Add it.

// ── STEP 1: Track capture in applyMove ─────────────────────────────────────
// Find the capture section in applyMove (around line 92-111):
//
//   let capturedLog = '';
//   if (token.steps >= 1 && token.steps <= 51) {
//     ...
//     if (oppAbs === myAbs) {
//       oppToken.steps = 0;
//       capturedLog = `...`;
//     }
//   }
//
// ADD a boolean flag:

// BEFORE the capture block, add:
//   let didCapture = false;
//
// INSIDE the capture block, after oppToken.steps = 0, add:
//   didCapture = true;

// ── STEP 2: Use the flag for extra turn ────────────────────────────────────
// Find the extraTurn line near the bottom of applyMove:
//   const extraTurn = rolledSix && newState.consecutiveSixes < 3;
//
// REPLACE with:
//   const extraTurn = (rolledSix || didCapture) && newState.consecutiveSixes < 3;

// ── COMPLETE MODIFIED applyMove tail (copy this in) ───────────────────────
/*
  let didCapture = false;

  // ... (capture loop stays the same, just add didCapture = true inside) ...

  const rolledSix = dice === 6;
  if (rolledSix) {
    newState.consecutiveSixes += 1;
  } else if (!didCapture) {
    // Only reset consecutive sixes if no capture happened
    newState.consecutiveSixes = 0;
  }

  const extraTurn = (rolledSix || didCapture) && newState.consecutiveSixes < 3;

  if (!extraTurn && newState.status === 'playing') {
    newState.currentPlayerIndex = getNextPlayerIndex(newState);
    newState.consecutiveSixes = 0;
  }

  if (didCapture) {
    // Log the bonus
    newState.log.push({
      time: timestamp,
      color: player.color,
      text: `${player.color.toUpperCase()} captured and gets a bonus turn!`,
      type: 'system'
    });
  }
*/

// ── WHAT TO ADD TO GameState INTERFACE ────────────────────────────────────
// No changes needed to the interface — didCapture is a local variable.

// ── FRONTEND NOTE ─────────────────────────────────────────────────────────
// No changes needed. The server broadcasts updated gameState with the same
// currentPlayerIndex still pointing to the capturer, so the UI automatically
// shows it's still their turn.

export {};
