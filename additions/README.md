# EXAM PREP — Ludo Project Modification Guide
## Quick-Reference for Implementing Features Under Exam Pressure

---

## HOW TO USE THIS GUIDE

Each section below covers one exam-style feature category.
For every feature:
- **What it does** — one sentence
- **Why exams ask this** — what concept it tests
- **Exact steps** — copy-paste ready, with file + line references
- **Common mistakes** — what trips people up

**File layout:**
```
additions/
  game-logic/   extraTurnRule.ts  consecutiveSixPenalty.ts  captureBonusTurn.ts
                configurableWinConditions.ts  moveValidation.ts
  lobby/        hostSystem.ts  readySystem.ts  privateRoom.ts  playerCountValidation.ts
  roles/        spectatorMode.ts  permissionSystem.ts
  chat/         systemMessages.ts  messageTypes.ts  privateMessaging.ts
  ai/           aiAfterTimeout.ts  aiReconnect.ts  smarterAI.ts
  timer/        configurableTimer.ts  timerResetRules.ts  autoMoveOnTimeout.ts
  reconnect/    restoreGameState.ts  preventDuplicateMoves.ts  resyncSocket.ts
  leaderboard/  winRate.ts  sortingVariations.ts  filteringSupport.ts
  ui/           highlightValidMoves.ts  disableInvalidActions.ts  feedbackMessages.ts
  validation/   strictMoveValidation.ts  rejectInvalidEvents.ts  serverDiceOnly.ts
```

---

## EXISTING CODE LOCATIONS — QUICK REFERENCE

| What | File | Approx Line |
|---|---|---|
| `rollDice()` | server/utils/ludoEngine.ts | 53 |
| `canTokenMove()` | server/utils/ludoEngine.ts | 65 |
| `applyMove()` — capture logic | server/utils/ludoEngine.ts | 94-111 |
| `applyMove()` — turn advance / extra turn | server/utils/ludoEngine.ts | 144-155 |
| `applyMove()` — game over check | server/utils/ludoEngine.ts | 131-141 |
| `getCoinReward()` | server/utils/ludoEngine.ts | 232 |
| `startTurnTimer()` | server/utils/socketHandler.ts | 60 |
| `finishGame()` | server/utils/socketHandler.ts | 29 |
| `startGame` handler | server/utils/socketHandler.ts | 146 |
| `rollDice` handler | server/utils/socketHandler.ts | 204 |
| `moveToken` handler | server/utils/socketHandler.ts | 242 |
| `disconnect` handler | server/utils/socketHandler.ts | 284 |
| `rejoinGame` handler | server/utils/socketHandler.ts | 195 |
| `sendMessage` handler | server/utils/socketHandler.ts | 266 |
| Auth middleware | server/middleware/auth.ts | 9 |
| `protect` used on routes | server/routes/*.ts | all |
| `GameState` interface | server/utils/ludoEngine.ts | 27 |
| `getSocket()` singleton | client/APP/src/utils/socket.ts | 12 |
| Socket events in Game.tsx | client/APP/src/pages/Game.tsx | 348 |
| `validIndices` computation | client/APP/src/pages/Game.tsx | 325 |
| Timer countdown | client/APP/src/pages/Game.tsx | 334 |

---

## 1. GAME LOGIC

### 1.1 Extra Turn on 6
**File:** `additions/game-logic/extraTurnRule.ts`
**Tests:** Understanding of turn management, game loop, state mutation

**It's already implemented.** The exam might ask to:
- Change the condition (e.g., remove extra turn, or add capture as another trigger)
- Change the threshold for penalty (2 instead of 3)

**Current code in `ludoEngine.ts` ~line 144:**
```typescript
const rolledSix = dice === 6;
if (rolledSix) {
  newState.consecutiveSixes += 1;
} else {
  newState.consecutiveSixes = 0;
}
const extraTurn = rolledSix && newState.consecutiveSixes < 3;
if (!extraTurn && newState.status === 'playing') {
  newState.currentPlayerIndex = getNextPlayerIndex(newState);
  newState.consecutiveSixes = 0;
}
```

**To ADD capture as bonus turn trigger:**
1. Before the capture loop in `applyMove()`, add: `let didCapture = false;`
2. Inside the capture block, add: `didCapture = true;`
3. Change the `extraTurn` line to:
   ```typescript
   const extraTurn = (rolledSix || didCapture) && newState.consecutiveSixes < 3;
   ```

**Common mistake:** Forgetting to reset `consecutiveSixes` to 0 when extra turn is NOT given.

---

### 1.2 Consecutive Six Penalty
**File:** `additions/game-logic/consecutiveSixPenalty.ts`
**Tests:** Conditional logic, mutation of game state

**Current behaviour:** 3 consecutive 6s → turn just advances, no token penalty.

**To CHANGE penalty to "send most-advanced token home":**
In `applyMove()`, replace the tail with:
```typescript
if (rolledSix && newState.consecutiveSixes >= 3) {
  // Penalty: reset most-advanced token
  const active = player.tokens.filter(t => t.steps !== 57);
  const furthest = active.sort((a, b) => b.steps - a.steps)[0];
  if (furthest) furthest.steps = 0;
  newState.consecutiveSixes = 0;
  newState.currentPlayerIndex = getNextPlayerIndex(newState);
} else {
  const extraTurn = rolledSix;
  if (!extraTurn && newState.status === 'playing') {
    newState.currentPlayerIndex = getNextPlayerIndex(newState);
    newState.consecutiveSixes = 0;
  }
}
```

**To CHANGE threshold from 3 to 2:**
```typescript
const extraTurn = rolledSix && newState.consecutiveSixes < 2; // was < 3
```

---

### 1.3 Capture Gives Bonus Turn
**File:** `additions/game-logic/captureBonusTurn.ts`
**Tests:** Reading existing logic and adding to it without breaking anything

**Steps:**
1. In `applyMove()` (~line 93), add `let didCapture = false;` before the capture if-block
2. Inside the capture block where `oppToken.steps = 0`, add `didCapture = true;`
3. Change `extraTurn` line:
   ```typescript
   const extraTurn = (rolledSix || didCapture) && newState.consecutiveSixes < 3;
   ```
4. That's it. No interface changes needed.

**Common mistake:** Adding `didCapture` AFTER the if-block instead of before it.

---

### 1.4 Configurable Win Conditions
**File:** `additions/game-logic/configurableWinConditions.ts`
**Tests:** Modifying game-over detection logic

**To change "all 4 tokens" to "first token wins":**
In `applyMove()`, find the finish check (~line 114):
```typescript
// CURRENT:
const allFinished = player.tokens.every(t => t.steps === 57);

// CHANGE TO (first token wins):
const allFinished = player.tokens.some(t => t.steps === 57);
```
Then the existing `if (allFinished && player.rank === null)` logic handles it automatically.

**To change to "first 2 tokens wins":**
```typescript
const allFinished = player.tokens.filter(t => t.steps === 57).length >= 2;
```

---

### 1.5 Move Validation
**File:** `additions/game-logic/moveValidation.ts`
**Tests:** Server-side validation, defensive programming

Copy the `validateMove()` function into `socketHandler.ts` or a new `validateMove.ts` and use it.
See [Section 10 - Validation] for full details.

---

## 2. LOBBY

### 2.1 Host-Based Start
**File:** `additions/lobby/hostSystem.ts`
**Tests:** Authorization, server-side permission enforcement

**Current problem:** Any player can emit `startGame` and it works.

**Fix — add to TOP of `startGame` handler in `socketHandler.ts`:**
```typescript
socket.on('startGame', async () => {
  if (lobbyPlayers.length === 0 || lobbyPlayers[0].userId !== userId) {
    return socket.emit('error', { message: 'Only the host can start the game' });
  }
  // ... rest unchanged
});
```

**No frontend change needed** — `Lobby.tsx` already computes `isHost` correctly.

---

### 2.2 Ready System
**File:** `additions/lobby/readySystem.ts`
**Tests:** Event-driven state, shared mutable state management

**Steps:**
1. Add `isReady: boolean` to the lobbyPlayers entry type, default `false`
2. Add `toggleReady` event handler:
   ```typescript
   socket.on('toggleReady', () => {
     const p = lobbyPlayers.find(p => p.userId === userId);
     if (p) { p.isReady = !p.isReady; io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers }); }
   });
   ```
3. In `startGame`, check all non-host players are ready:
   ```typescript
   const allReady = lobbyPlayers.slice(1).every(p => p.isReady);
   if (!allReady) return socket.emit('error', { message: 'Not all players are ready' });
   ```
4. Frontend: add `isReady` to `LobbyPlayer` interface, add Ready button that emits `toggleReady`

**Common mistake:** Forgetting to re-emit `lobbyUpdate` after toggling — other players won't see the change.

---

### 2.3 Private Room with Code
**File:** `additions/lobby/privateRoom.ts`
**Tests:** In-memory state management, new event design

**Quick version:**
1. Add `const privateRooms = new Map<string, { code: string; players: [...] }>();` at top of socketHandler
2. Add `createPrivateRoom`, `joinPrivateRoom`, `startPrivateGame` events (see file for full code)
3. Frontend: add code input + create button to Lobby.tsx

---

### 2.4 Player Count Validation
**File:** `additions/lobby/playerCountValidation.ts`
**Tests:** Input validation, configurable constants

**Quick fix — in `startGame`:**
```typescript
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
if (lobbyPlayers.length < MIN_PLAYERS) return socket.emit('error', { message: `Need ${MIN_PLAYERS}+ players` });
```
**For exactly 4:** `if (lobbyPlayers.length !== 4) return socket.emit('error', { message: 'Need exactly 4 players' });`

---

## 3. ROLES

### 3.1 Spectator Mode
**File:** `additions/roles/spectatorMode.ts`
**Tests:** Role-based access, state broadcasting to non-players

**Steps:**
1. Add `const gameSpectators = new Map<string, Set<string>>();` at top of socketHandler
2. Add `joinAsSpectator` event (see file for code)
3. Guard `rollDice` and `moveToken` handlers:
   ```typescript
   if (gameSpectators.get(gameId)?.has(userId)) return socket.emit('error', { message: 'Spectators cannot do that' });
   ```
4. Frontend: detect `isSpectator = !gameState?.players.some(p => p.userId === user?._id)`, hide roll button

---

### 3.2 Permission System
**File:** `additions/roles/permissionSystem.ts`
**Tests:** Clean architecture, permission tables

Use the `canDo(action, role)` + `getRole()` helpers if exam asks for a general permission layer.
For a quick solution, just inline the guard at each handler entry.

---

## 4. CHAT

### 4.1 System Messages
**File:** `additions/chat/systemMessages.ts`
**Tests:** Event broadcasting, integrating notifications into existing flow

**Add this helper to socketHandler.ts:**
```typescript
function emitSystemMessage(io: Server, gameId: string, message: string) {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  io.to(gameId).emit('chatMessage', { username: 'System', color: 'system', message, time, userId: 'system' });
}
```

**Then call it:**
- In `finishGame()`: `emitSystemMessage(io, state.gameId, '🏆 ' + winner.username + ' wins!');`
- In `moveToken` handler after applyMove, check last log entry for 'capture' type
- In `disconnect` handler: `emitSystemMessage(io, gameId, p.username + ' disconnected');`
- In `rejoinGame` handler: `emitSystemMessage(io, gameId, player.username + ' reconnected');`

**Frontend:** No changes needed — chat already renders color='system' entries with `.sys` class.

---

### 4.2 Message Types
**File:** `additions/chat/messageTypes.ts`
**Tests:** Extending interfaces, typed events

**Add `type` field to all chatMessage emits:**
- User messages: `type: 'user'`
- System messages: `type: 'system'`
- Announcements: `type: 'announce'`

**Frontend:** Add to `ChatMsg` interface, use `msg.type` for className.

---

### 4.3 Private Messaging (Whisper)
**File:** `additions/chat/privateMessaging.ts`
**Tests:** Targeted socket.emit (not broadcast), user lookup

**Key pattern:** Instead of `io.to(gameId).emit(...)`, use the individual socket:
```typescript
// Find the target's socket by userId
const targetSocket = [...io.sockets.sockets.values()].find(s => (s as any).userId === targetUserId);
if (targetSocket) targetSocket.emit('chatMessage', msg);
```
Also emit back to sender: `socket.emit('chatMessage', msg)`.

---

## 5. AI

### 5.1 AI Only After Timeout (Grace Period)
**File:** `additions/ai/aiAfterTimeout.ts`
**Tests:** setTimeout management, two-phase disconnect handling

**Add at top of socketHandler:**
```typescript
const aiGraceTimers = new Map<string, NodeJS.Timeout>();
const AI_GRACE_MS = 10000;
```

**Modify disconnect handler:**
```typescript
// Instead of: p.isAI = true immediately
// Do:
p.isConnected = false;
io.to(gameId).emit('gameStateUpdate', { gameState: state });
const timer = setTimeout(() => {
  const s = activeGames.get(gameId);
  const pl = s?.players.find(p => p.userId === userId);
  if (pl && !pl.isConnected) { pl.isAI = true; io.to(gameId).emit('gameStateUpdate', { gameState: s! }); }
  aiGraceTimers.delete(userId);
}, AI_GRACE_MS);
aiGraceTimers.set(userId, timer);
```

**In rejoinGame handler, add at the top:**
```typescript
const grace = aiGraceTimers.get(userId);
if (grace) { clearTimeout(grace); aiGraceTimers.delete(userId); }
```

---

### 5.2 AI Stops on Reconnect
**File:** `additions/ai/aiReconnect.ts`
**Tests:** State restoration, clearing timers

This is already mostly implemented in `rejoinGame`. The enhanced version also:
- Resets the turn timer for the reconnecting player (if it's their turn)
- Emits a system message announcing reconnect

```typescript
// Add to rejoinGame handler:
const isTheirTurn = state.players[state.currentPlayerIndex]?.userId === userId;
if (isTheirTurn) { clearTurnTimer(gameId); startTurnTimer(io, gameId); }
```

---

### 5.3 Smarter AI
**File:** `additions/ai/smarterAI.ts`
**Tests:** Algorithm reasoning, modifying pure functions

**Replace the token selection in `autoMove()` in ludoEngine.ts:**

Current:
```typescript
let best = validIndices[0];
for (const idx of validIndices) {
  if (player.tokens[idx].steps > player.tokens[best].steps) best = idx;
}
```

Replace with the `pickBestToken()` function from the file, which:
1. Prefers a token that will capture an opponent
2. Else prefers entering the board (dice=6, token in yard)
3. Else picks furthest token

**No interface changes needed.**

---

## 6. TIMER

### 6.1 Configurable Timer
**File:** `additions/timer/configurableTimer.ts`
**Tests:** Constants, configuration propagation

**Quickest change:** Just change `TURN_TIMEOUT_MS = 20000` in socketHandler.ts.

**If exam asks host to set timer:** Pass `timerSeconds` in `startGame` event, store in GameState as `turnTimeoutMs`, pass to `startTurnTimer`.

**Frontend:** Change `setTimer(20)` to `setTimer((gameState?.turnTimeoutMs ?? 20000) / 1000)`.

---

### 6.2 Timer Reset Rules
**File:** `additions/timer/timerResetRules.ts`
**Tests:** Conditional timer management

**To NOT reset timer on extra turn (player keeps remaining time):**
In `moveToken` handler, after applyMove:
```typescript
const samePlayer = newState.currentPlayerIndex === state.currentPlayerIndex;
if (!samePlayer) {
  startTurnTimer(io, gameId); // new player = fresh timer
} else {
  startTurnTimer(io, gameId); // extra turn = also restart (or don't — exam choice)
}
```

---

### 6.3 Auto-Move on Timeout
**File:** `additions/timer/autoMoveOnTimeout.ts`
**Tests:** Server-side automation, two-phase timeout (roll then move)

**Current implementation already handles both phases.**

**To skip move entirely (just advance turn):** Replace auto-roll+move with:
```typescript
state.diceValue = null; state.diceRolled = false; state.consecutiveSixes = 0;
state.currentPlayerIndex = getNextPlayerIndex(state);
activeGames.set(gameId, state);
io.to(gameId).emit('gameStateUpdate', { gameState: state });
startTurnTimer(io, gameId);
```

---

## 7. RECONNECT

### 7.1 Restore Game State
**File:** `additions/reconnect/restoreGameState.ts`
**Tests:** Socket room management, state re-broadcasting

**Already implemented in `rejoinGame`.** Enhancements:
- If game is `finished`, emit `gameOver` instead of `gameStateUpdate`
- Restart timer if reconnecting player's turn
- Emit system message

**Store chat history** (if exam asks):
```typescript
const chatHistory = new Map<string, any[]>();
// Add to sendMessage: history.push(msg); if (history.length > 50) history.shift();
// Add to rejoinGame: socket.emit('chatHistory', { messages: chatHistory.get(gameId) ?? [] });
// Add to finishGame: chatHistory.delete(state.gameId);
```

---

### 7.2 Prevent Duplicate Moves
**File:** `additions/reconnect/preventDuplicateMoves.ts`
**Tests:** Idempotency, state consistency

**Simple approach** — send `turnCount` with `moveToken` from client:
```typescript
// Client: socket.emit('moveToken', { gameId, tokenIndex, turnCount: gameState.turnCount })
// Server: if (state.turnCount !== turnCount) return; // stale event, ignore
```

**Already naturally protected** — after a move, `diceRolled=false`, so duplicate `moveToken` fails the "Roll dice first" check.

---

### 7.3 Resync Socket
**File:** `additions/reconnect/resyncSocket.ts`
**Tests:** Socket room management, state recovery

**Add to socketHandler:**
```typescript
socket.on('resync', ({ gameId }: { gameId: string }) => {
  const state = activeGames.get(gameId);
  if (!state) return socket.emit('error', { message: 'Game not found' });
  socket.emit('gameStateUpdate', { gameState: state });
});
```

**Frontend — auto-resync on reconnect:**
```typescript
socket.on('connect', () => { if (gameId) socket.emit('rejoinGame', { gameId }); });
```

---

## 8. LEADERBOARD

### 8.1 Win Rate
**File:** `additions/leaderboard/winRate.ts`
**Tests:** Schema modification, aggregation/calculation

**Steps:**
1. Add `wins: { type: Number, default: 0 }` to User schema (models/User.ts) and `IUser` interface
2. In `finishGame()` in socketHandler: `if (rank === 1) await User.findByIdAndUpdate(p.userId, { $inc: { wins: 1, ... } })`
3. In `getLeaderboard()`: include `wins` in `.select()`, calculate `winRate = total_played > 0 ? wins/total_played*100 : 0`
4. Frontend: add `wins` and `winRate` to `LeaderUser` interface, add column

---

### 8.2 Sorting Variations
**File:** `additions/leaderboard/sortingVariations.ts`
**Tests:** MongoDB sort, query parameters

**Add `sortBy` query param support:**
```typescript
const sortBy = req.query.sortBy as string || 'coins';
const SORTS: Record<string, object> = {
  coins: { coins: -1, total_played: 1 },
  games: { total_played: -1 },
  wins:  { wins: -1 },
};
const sort = SORTS[sortBy] || SORTS.coins;
// Use: .sort(sort)
```

---

### 8.3 Filtering
**File:** `additions/leaderboard/filteringSupport.ts`
**Tests:** MongoDB query building, multiple conditions

**Pattern:**
```typescript
const query: any = {};
if (search) query.username = { $regex: search, $options: 'i' };
if (minGames > 0) query.total_played = { $gte: minGames };
const users = await User.find(query)...
```
Use `buildLeaderboardQuery()` from the file for multiple filters at once.

---

## 9. UI

### 9.1 Highlight Valid Moves
**File:** `additions/ui/highlightValidMoves.ts`
**Tests:** React state, conditional styling, UX

**Already implemented.** To add pulsing animation:
1. Add `.token--valid { animation: pulse 0.8s infinite; }` to index.css
2. Add `isValid ? ' token--valid' : ''` to token className in `renderTokensInCell`

---

### 9.2 Disable Invalid Actions
**File:** `additions/ui/disableInvalidActions.ts`
**Tests:** Controlled components, UX state

Key disable conditions:
```typescript
// Roll button
disabled={!isMyTurn || gameState.diceRolled || gameState.status !== 'playing'}

// Token (already guarded in handleTokenClick)
if (!isMyTurn || !gameState?.diceRolled || !validIndices.includes(tokenIndex)) return;
```

---

### 9.3 Toast/Feedback Messages
**File:** `additions/ui/feedbackMessages.ts`
**Tests:** React state, CSS animations

**Add to Game.tsx:**
```typescript
const [toast, setToast] = useState<{ message: string; type: 'success'|'error'|'info' } | null>(null);
function showToast(message: string, type = 'info') { setToast({ message, type }); setTimeout(() => setToast(null), 3000); }
```
**JSX:** `{toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}`
**CSS:** `position: fixed; top: 70px; left: 50%; transform: translateX(-50%); z-index: 9999;`

---

## 10. VALIDATION

### 10.1 Strict Move Validation
**File:** `additions/validation/strictMoveValidation.ts`
**Tests:** Defensive programming, error handling

**Drop-in validators. Add to socketHandler.ts:**
```typescript
function validateMoveToken(state: any, userId: string, tokenIndex: number): string | null {
  if (!state || state.status !== 'playing') return 'Game not active';
  if (state.players[state.currentPlayerIndex].userId !== userId) return 'Not your turn';
  if (!state.diceRolled) return 'Roll dice first';
  if (tokenIndex < 0 || tokenIndex > 3) return 'Invalid token';
  const token = state.players[state.currentPlayerIndex].tokens[tokenIndex];
  if (token.steps === 57) return 'Token already finished';
  if (token.steps === 0 && state.diceValue !== 6) return 'Need 6 to leave yard';
  if (token.steps > 0 && token.steps + state.diceValue > 57) return 'Would overshoot';
  return null;
}

// Use:
const err = validateMoveToken(state, userId, tokenIndex);
if (err) return socket.emit('error', { message: err });
```

---

### 10.2 Reject Invalid Events
**File:** `additions/validation/rejectInvalidEvents.ts`
**Tests:** Input validation, security

**Quick payload guard:**
```typescript
socket.on('moveToken', (payload: any) => {
  if (!payload?.gameId || typeof payload.tokenIndex !== 'number') {
    return socket.emit('error', { message: 'Invalid payload' });
  }
  const { gameId, tokenIndex } = payload;
  // ...
});
```

---

### 10.3 Server-Side Dice Only
**File:** `additions/validation/serverDiceOnly.ts`
**Tests:** Security, server-authoritative design

**Already correct.** The server NEVER reads `diceValue` from client events.
Key evidence:
- `rollDice` handler destructures only `{ gameId }` from the payload
- `state.diceValue = rollDice()` — server calls `rollDice()` internally

**To explicitly reject if client tries to inject dice:**
```typescript
socket.on('rollDice', (payload: any) => {
  if ('diceValue' in payload) return socket.emit('error', { message: 'Not allowed' });
  const { gameId } = payload;
  // ...
});
```

---

## COMMON EXAM QUESTION PATTERNS

### "Add X to the game logic"
→ Modify `server/utils/ludoEngine.ts` — either `applyMove()` or `canTokenMove()`
→ Never touch the client for logic — only for display

### "Add a new socket event"
→ Add `socket.on('eventName', handler)` inside `io.on('connection', socket => { ... })`
→ Use `io.to(gameId).emit(...)` to broadcast to all players
→ Use `socket.emit(...)` to respond to only that socket

### "Add a new REST endpoint"
→ Add handler in `server/controllers/`
→ Add route in `server/routes/`
→ Add to `api.ts` in client
→ Call from the relevant React component

### "Store something new in the database"
→ Add field to `server/models/User.ts` or `server/models/Game.ts` (schema + interface)
→ Update where the record is created/updated (usually `finishGame()` or a controller)

### "Add a new field to GameState"
→ Add to `GameState` interface in `ludoEngine.ts`
→ Initialize it in `initGameState()`
→ Update it in `applyMove()` if needed
→ The client gets it automatically since state is broadcast as-is

### "Change how the leaderboard sorts"
→ Change `.sort(...)` in `gameController.ts` getLeaderboard
→ To sort by win rate, you need either a stored `wins` field or MongoDB aggregation

---

## INTEGRATION CHECKLIST (Before Exam Submission)

```
□ All new socket events added inside io.on('connection', socket => { })
□ All game logic changes are in ludoEngine.ts (pure functions only)
□ No dice values read from client — server generates all dice
□ New GameState fields added to both interface AND initGameState()
□ New User model fields added to both schema AND IUser interface
□ Frontend components import from utils/api.ts or utils/socket.ts (never direct fetch)
□ Socket.off() called for all new listeners in useEffect cleanup
□ New events defined on BOTH client (emit/on) and server (on/emit) with matching names
□ Timer cleared before restarting: clearTurnTimer() before startTurnTimer()
□ Protected routes use the protect middleware
```
