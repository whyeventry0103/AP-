// WHAT: Different win conditions beyond "all 4 tokens must finish".
// MODIFY: server/utils/ludoEngine.ts — applyMove() finish-check section
// ALSO: possibly GameState interface if storing the mode.

// ── CURRENT WIN CONDITION (already in ludoEngine) ─────────────────────────
// A player finishes when ALL 4 tokens reach step 57.
// Game ends when only 1 player has unfinished tokens.

// ── EXAM SCENARIO 1: First token to finish wins immediately ───────────────
// Replace the "Check finish" section in applyMove:
/*
  if (token.steps === 57) {
    // FIRST TOKEN WINS variant
    if (player.rank === null) {
      player.rank = newState.rankings.length + 1;
      newState.rankings.push(player.userId);
      newState.status = 'finished'; // game ends immediately on first finish
      newState.log.push({ ... text: `${player.username} wins with first token!`, type: 'finish' });
    }
  }
*/

// ── EXAM SCENARIO 2: First N tokens to finish wins (configurable) ─────────
const WIN_TOKEN_COUNT = 2; // player wins when they get 2 tokens home

function checkPlayerFinishedWithN(player: any, n: number): boolean {
  return player.tokens.filter((t: any) => t.steps === 57).length >= n;
}

// In applyMove, replace the allFinished check:
/*
  if (token.steps === 57) {
    if (checkPlayerFinishedWithN(player, WIN_TOKEN_COUNT) && player.rank === null) {
      player.rank = newState.rankings.length + 1;
      newState.rankings.push(player.userId);
      newState.log.push({ ... type: 'finish' });
    }
  }
*/

// ── EXAM SCENARIO 3: Store win mode in GameState ──────────────────────────
// Add to GameState interface in ludoEngine.ts:
interface GameStateWithMode {
  // ... existing fields ...
  winMode: 'all' | 'first' | 'two'; // add this field
}

// Add to initGameState():
/*
  return {
    ...existingFields,
    winMode: 'all', // default
  };
*/

// Then in applyMove, branch based on state.winMode:
function isPlayerDone(player: any, winMode: string): boolean {
  switch (winMode) {
    case 'first': return player.tokens.some((t: any) => t.steps === 57);
    case 'two':   return player.tokens.filter((t: any) => t.steps === 57).length >= 2;
    case 'all':
    default:      return player.tokens.every((t: any) => t.steps === 57);
  }
}

// In applyMove, replace:
//   const allFinished = player.tokens.every(t => t.steps === 57);
// with:
//   const allFinished = isPlayerDone(player, newState.winMode);

// ── EXAM SCENARIO 4: Time-based game — player with most tokens home wins ──
// This would require a server-side game timer (setInterval tracking elapsed time).
// When time runs out, rank players by token count:
function rankByTokensHome(players: any[]): any[] {
  return [...players].sort((a, b) => {
    const aHome = a.tokens.filter((t: any) => t.steps === 57).length;
    const bHome = b.tokens.filter((t: any) => t.steps === 57).length;
    return bHome - aHome;
  });
}

export { checkPlayerFinishedWithN, isPlayerDone, rankByTokensHome };
