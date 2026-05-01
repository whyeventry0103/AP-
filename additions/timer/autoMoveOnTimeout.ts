// WHAT: How the server auto-moves when turn timer expires.
// MODIFY: server/utils/socketHandler.ts — startTurnTimer function
// This file documents the current implementation and how to modify it.

// ── CURRENT startTurnTimer (already in socketHandler.ts) ─────────────────
/*
  function startTurnTimer(io, gameId) {
    clearTurnTimer(gameId);
    const timer = setTimeout(() => {
      const state = activeGames.get(gameId);
      if (!state || state.status !== 'playing') return;

      if (!state.diceRolled) {
        // Phase 1: auto-roll
        state.diceValue = rollDice();
        state.diceRolled = true;
        activeGames.set(gameId, state);
        io.to(gameId).emit('diceRolled', { gameState: state });

        // Phase 2: auto-move (1 second later for visual effect)
        setTimeout(() => {
          const s2 = activeGames.get(gameId);
          if (!s2 || s2.status !== 'playing') return;
          const result = autoMove(s2);
          if (result) {
            activeGames.set(gameId, result.newState);
            io.to(gameId).emit('gameStateUpdate', { gameState: result.newState });
            if (result.newState.status === 'finished') finishGame(io, result.newState);
            else startTurnTimer(io, gameId);
          }
        }, 1000);
      } else {
        // Dice already rolled but no move — auto-move
        const result = autoMove(state);
        if (result) {
          activeGames.set(gameId, result.newState);
          io.to(gameId).emit('gameStateUpdate', { gameState: result.newState });
          if (result.newState.status === 'finished') finishGame(io, result.newState);
          else startTurnTimer(io, gameId);
        }
      }
    }, TURN_TIMEOUT_MS);
    turnTimers.set(gameId, timer);
  }
*/

// ── EXAM SCENARIO 1: Skip move (no auto-move, just advance turn) ─────────
// Replace the auto-move logic with just advancing the turn:
/*
  setTimeout(() => {
    const state = activeGames.get(gameId);
    if (!state || state.status !== 'playing') return;

    // Just advance to next player — no move applied
    state.diceValue = null;
    state.diceRolled = false;
    state.consecutiveSixes = 0;
    state.currentPlayerIndex = getNextPlayerIndex(state); // import from ludoEngine
    activeGames.set(gameId, state);
    io.to(gameId).emit('gameStateUpdate', { gameState: state });
    startTurnTimer(io, gameId);
  }, TURN_TIMEOUT_MS);
*/

// ── EXAM SCENARIO 2: Penalize for timeout — lose a token's progress ───────
/*
  // In the timeout callback, before advancing turn:
  const player = state.players[state.currentPlayerIndex];
  const activeTokens = player.tokens.filter(t => t.steps > 0 && t.steps < 57);
  if (activeTokens.length > 0) {
    // Send a random active token back to yard
    const randomToken = activeTokens[Math.floor(Math.random() * activeTokens.length)];
    randomToken.steps = 0;
    state.log.push({ time: ..., color: player.color, text: `${player.color} timed out — token penalized!`, type: 'system' });
  }
*/

// ── EXAM SCENARIO 3: Give extra warning before timeout ────────────────────
// Emit a warning event at 5 seconds remaining:
/*
  function startTurnTimer(io, gameId) {
    clearTurnTimer(gameId);

    // Warning at 15 seconds (5 seconds before timeout)
    const warningTimer = setTimeout(() => {
      const state = activeGames.get(gameId);
      if (!state || state.status !== 'playing') return;
      io.to(gameId).emit('turnWarning', { gameId, secondsLeft: 5 });
    }, TURN_TIMEOUT_MS - 5000);

    const timer = setTimeout(() => {
      clearTimeout(warningTimer);
      // ... existing auto-move logic
    }, TURN_TIMEOUT_MS);

    turnTimers.set(gameId, timer);
  }
*/
// Frontend: socket.on('turnWarning', () => { /* flash timer red */ });

export {};
