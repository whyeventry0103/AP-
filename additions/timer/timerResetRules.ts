// WHAT: Define when the turn timer resets vs keeps counting.
// MODIFY: server/utils/socketHandler.ts — rollDice and moveToken handlers
// Current: timer is cleared and restarted on both rollDice and moveToken.

// ── CURRENT RESET POINTS (socketHandler.ts) ───────────────────────────────
// 1. rollDice handler:    clearTurnTimer(gameId) → then startTurnTimer(io, gameId)
// 2. moveToken handler:   clearTurnTimer(gameId) → then startTurnTimer(io, gameId)
// 3. startTurnTimer:      clears existing before setting new

// ── EXAM SCENARIO 1: Don't reset timer when rolling 6 (extra turn) ────────
// After a 6 is rolled and extra turn granted, the player still only has
// the REMAINING time from their original 20 seconds.
// This makes rolling 6 feel faster/more pressured.
//
// In moveToken handler, after applyMove, ONLY restart timer if NOT extra turn:
/*
  const newState = applyMove(state, tokenIndex);
  activeGames.set(gameId, newState);
  io.to(gameId).emit('gameStateUpdate', { gameState: newState });

  if (newState.status === 'finished') {
    finishGame(io, newState);
  } else {
    const wasExtraTurn = newState.currentPlayerIndex === state.currentPlayerIndex;
    if (wasExtraTurn) {
      // Don't reset timer — player used some of their time already
      startTurnTimer(io, gameId); // but DO start one for the next action
    } else {
      startTurnTimer(io, gameId); // fresh 20 seconds for new player
    }
  }
*/

// ── EXAM SCENARIO 2: Reset timer only after dice roll, not after move ─────
// Timer resets when it's a new player's turn. Moving a token doesn't reset it.
// The player has 20 seconds TOTAL for roll + move.
//
// In rollDice handler, DON'T call startTurnTimer after dice roll.
// In moveToken handler, call startTurnTimer only if turn changed.
/*
  // In rollDice — after dice roll, DON'T add startTurnTimer
  // (timer keeps counting from when the turn started)

  // In moveToken — only restart if it's now a different player's turn:
  const turnChanged = newState.currentPlayerIndex !== state.currentPlayerIndex;
  if (newState.status !== 'finished') {
    if (turnChanged) {
      startTurnTimer(io, gameId); // fresh timer for new player
    }
    // if extra turn: timer still running, no restart needed
  }
*/

// ── EXAM SCENARIO 3: Pause timer while player is choosing token ───────────
// After rolling dice, pause the visual timer countdown but keep the server timeout.
// Client-side: pause the setInterval when diceRolled=true and validIndices > 0.
// (Server timeout doesn't pause — only visual pause)
/*
  // In Game.tsx timer useEffect, add pause condition:
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;
    if (isMyTurn && gameState.diceRolled) return; // pause while I'm choosing
    setTimer(20);
    // ... rest of countdown
  }, [gameState?.currentPlayerIndex, gameState?.diceRolled, isMyTurn]);
*/

// ── TIMER SYNC: Server time → Client time ────────────────────────────────
// The client timer is approximate. For exact sync, add turnStartedAt to GameState:
/*
  // In initGameState and in startTurnTimer callback:
  state.turnStartedAt = Date.now();

  // In Game.tsx, calculate remaining time from server timestamp:
  const remaining = Math.max(0, 20 - Math.floor((Date.now() - gameState.turnStartedAt) / 1000));
  setTimer(remaining);
*/

export {};
