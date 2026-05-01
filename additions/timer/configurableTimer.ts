// WHAT: Make the turn timer duration configurable per game or per room.
// MODIFY: server/utils/socketHandler.ts — TURN_TIMEOUT_MS constant
// Current: hardcoded TURN_TIMEOUT_MS = 20000

// ── OPTION 1: Simple constant change ─────────────────────────────────────
// Just change the constant in socketHandler.ts:
//   const TURN_TIMEOUT_MS = 15000; // 15 seconds
//   const TURN_TIMEOUT_MS = 30000; // 30 seconds

// ── OPTION 2: Per-game timer config (store in GameState) ─────────────────
// Add to GameState interface in ludoEngine.ts:
//   turnTimeoutMs?: number;

// In initGameState(), accept optional config:
/*
  export function initGameState(
    gameId: string,
    players: { userId: string; username: string; color: Color }[],
    options?: { turnTimeoutMs?: number }
  ): GameState {
    return {
      ...existing,
      turnTimeoutMs: options?.turnTimeoutMs ?? 20000,
    };
  }
*/

// In socketHandler.ts, update startTurnTimer to use state.turnTimeoutMs:
/*
  function startTurnTimer(io: Server, gameId: string) {
    clearTurnTimer(gameId);
    const state = activeGames.get(gameId);
    const timeout = state?.turnTimeoutMs ?? TURN_TIMEOUT_MS; // use game-specific if set
    const timer = setTimeout(() => {
      // ... existing auto-roll/auto-move logic
    }, timeout);
    turnTimers.set(gameId, timer);
  }
*/

// ── OPTION 3: Let host set timer when starting ────────────────────────────
// In startGame handler, read a value from the socket event:
/*
  socket.on('startGame', async ({ timerSeconds }: { timerSeconds?: number }) => {
    // ... validation ...
    const turnTimeoutMs = Math.max(5, Math.min(timerSeconds ?? 20, 60)) * 1000; // clamp 5-60s
    const state = initGameState(gameId, ..., { turnTimeoutMs });
    // ...
  });
*/

// In Lobby.tsx, add a timer selector (host only):
/*
  const [timerSeconds, setTimerSeconds] = useState(20);

  // In host section:
  <select value={timerSeconds} onChange={e => setTimerSeconds(Number(e.target.value))}>
    <option value={10}>10s</option>
    <option value={20}>20s</option>
    <option value={30}>30s</option>
    <option value={60}>60s</option>
  </select>

  // When starting:
  socket.emit('startGame', { timerSeconds });
*/

// ── FRONTEND: Show configured timer to players ────────────────────────────
// Currently Game.tsx hardcodes timer reset to 20.
// If the server sends turnTimeoutMs in gameState, use it:
/*
  const turnLimit = (gameState?.turnTimeoutMs ?? 20000) / 1000;
  setTimer(turnLimit); // instead of setTimer(20)
*/

export const DEFAULT_TURN_TIMEOUT_MS = 20000;
