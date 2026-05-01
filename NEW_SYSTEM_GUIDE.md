# NEW SYSTEM GUIDE — Exam-Ready MERN + Socket.IO Template

> Read this FIRST. Designed for fast scanning under exam pressure.

---

## 1. HOW TO START

```bash
# Terminal 1 — Backend (port 8001)
cd server_new
npm run dev

# Terminal 2 — Frontend (port 5174)
cd client_new
npm run dev
```

The `dev` scripts automatically symlink node_modules from the existing projects.
No `npm install` needed.

---

## 2. SYSTEM STRUCTURE

```
server_new/
  server.ts              ← Express + Socket.IO entry point
  config.env             ← PORT, MONGO_URI, JWT_SECRET
  models/
    User.ts              ← User schema (username, email, coins, wins, total_played)
    Game.ts              ← Finished game record schema
  middleware/
    auth.ts              ← requireAuth (reads Authorization: Bearer <token>)
  controllers/
    authController.ts    ← signup, login, logout, getMe, updateProfile
    userController.ts    ← getLeaderboard, getHistory, getStats
  routes/
    authRoutes.ts        ← POST /api/auth/signup|login|logout  GET /me  PUT /update
    userRoutes.ts        ← GET /api/users/leaderboard|history
    statsRoutes.ts       ← GET /api/stats
  utils/
    socketHandler.ts     ← Socket.IO: auth middleware, lobby, chat, rejoin, disconnect
  game/                  ← EXAM ZONE: only touch these 3 files
    gameTypes.ts         ← Player, GameState interfaces + getCoinReward()
    gameEngine.ts        ← Pure functions: createGameState, validateAction, applyAction,
                           isGameOver, rankPlayers
    gameHandlers.ts      ← Socket event handlers + finishGame (DB write + rankings)
  test/
    apiTester.ts         ← Run: npm run test (server must be running)

client_new/
  src/
    App.tsx              ← Router, Nav, RequireAuth guard
    context/
      AuthContext.tsx    ← user state, login(), signup(), logout(), refreshUser()
    utils/
      api.ts             ← apiFetch() — adds Bearer token automatically
      socket.ts          ← getSocket() singleton, disconnectSocket()
    pages/
      Login.tsx          ← /login
      Signup.tsx         ← /signup
      Home.tsx           ← /home
      Lobby.tsx          ← /lobby — joinLobby, startGame, chat
      Leaderboard.tsx    ← /leaderboard — paginated table
      History.tsx        ← /history — paginated game records
      UpdateProfile.tsx  ← /profile
    game/                ← EXAM ZONE: only touch these 2 files
      useGame.ts         ← Socket listeners, game state, takeAction()
      GamePage.tsx       ← Board render, sidebar (players, log, chat)
```

---

## 3. HOW TO PLUG IN A NEW GAME

### Step 1 — Define your state (gameTypes.ts)

```typescript
// Replace counter/lastAction with your fields:
export interface GameState {
  // ... keep gameId, players, status, currentPlayerIndex, log, startedAt
  board: string[][];    // example: chess board
  phase: 'roll' | 'move';  // example: ludo phase
}
```

### Step 2 — Write your rules (gameEngine.ts)

```typescript
// 5 functions — fill in YOUR logic:
createGameState()   // initialize board, phase, etc.
validateAction()    // return error string or null
applyAction()       // return new state (immutable)
isGameOver()        // return true when done
rankPlayers()       // return [{userId, rank}] sorted
```

### Step 3 — Wire up socket events (gameHandlers.ts)

```typescript
// Rename 'takeAction' to your event name (e.g., 'rollDice', 'makeMove')
socket.on('rollDice', ({ gameId }) => { ... });
socket.on('makeMove', ({ gameId, tokenIndex }) => { ... });

// Register them at the bottom:
export function registerGameHandlers(socket, activeGames, io, userId) {
  handleRollDice(socket, activeGames, io, userId);
  handleMakeMove(socket, activeGames, io, userId);
}
```

### Step 4 — Update the client hook (useGame.ts)

```typescript
// Match GameState to your new shape
// Rename takeAction, add new actions:
const rollDice = useCallback(() => {
  socket.emit('rollDice', { gameId: gameState.gameId });
}, [gameState]);

const makeMove = useCallback((tokenIndex: number) => {
  socket.emit('makeMove', { gameId: gameState.gameId, tokenIndex });
}, [gameState]);
```

### Step 5 — Render your board (GamePage.tsx)

```tsx
// Find the "REPLACE BELOW WITH YOUR GAME VISUALS" section
// Delete the counter UI and add your board component
```

---

## 4. COMMON EXAM SCENARIOS

### A) New game from scratch

1. Edit `gameTypes.ts` — add your state fields
2. Edit `gameEngine.ts` — fill in all 5 functions
3. Edit `gameHandlers.ts` — rename `takeAction` to your event
4. Edit `useGame.ts` — rename `takeAction`, update GameState interface
5. Edit `GamePage.tsx` — replace counter UI with your board

**Time estimate: 20–40 min**

---

### B) Modify an existing rule

Example: change win condition from counter ≥ 10 to counter ≥ 20

```typescript
// gameEngine.ts, isGameOver():
return state.counter >= 20;  // was 10
```

Example: change coin reward for 1st place

```typescript
// gameTypes.ts, getCoinReward():
2: [200, 20],   // was [100, 20]
```

---

### C) Add a new role (e.g., host-only start)

Already implemented — `lobbyPlayers[0]` is the host. To add other roles:

```typescript
// gameTypes.ts, Player interface:
role: 'player' | 'spectator';

// socketHandler.ts, joinLobby:
lobbyPlayers.push({ ..., role: 'player' });

// Add joinAsSpectator event:
socket.on('joinAsSpectator', ({ gameId }) => {
  socket.join(gameId);
  socket.emit('gameStateUpdate', { gameState: activeGames.get(gameId) });
});
```

---

### D) Add a game timer

```typescript
// socketHandler.ts, inside startGame handler:
const timer = setTimeout(() => {
  // auto-action for current player
  const state = activeGames.get(gameId);
  if (state?.status === 'playing') {
    const newState = applyAction(state, state.players[state.currentPlayerIndex].userId, {});
    activeGames.set(gameId, newState);
    io.to(gameId).emit('gameStateUpdate', { gameState: newState });
  }
}, 30000); // 30 seconds

// Store timer: const turnTimers = new Map<string, NodeJS.Timeout>();
// turnTimers.set(gameId, timer);
// Clear on action: clearTimeout(turnTimers.get(gameId))
```

---

### E) Add chat moderation / system messages

```typescript
// socketHandler.ts — helper function:
function systemMsg(io: Server, room: string, text: string) {
  io.to(room).emit('newMessage', { username: 'System', text, type: 'system' });
}

// Call it anywhere:
systemMsg(io, gameId, `${username} joined the game`);
systemMsg(io, gameId, `${username} disconnected`);
```

---

### F) Add leaderboard filtering/sorting

```typescript
// userController.ts, getLeaderboard():
const sort = req.query.sort === 'wins' ? { wins: -1 } : { coins: -1 };
const query = req.query.search
  ? { username: { $regex: req.query.search, $options: 'i' } }
  : {};
User.find(query).sort(sort)...
```

---

## 5. AUTH FLOW

```
Client                          Server
──────                          ──────
POST /api/auth/signup ────────► Create user, sign JWT
                      ◄──────── { token, user }
localStorage.setItem('token')

GET /api/auth/me ─────────────► Authorization: Bearer <token>
  (apiFetch adds header auto)  ► requireAuth middleware verifies
                      ◄──────── user object

Socket connect ───────────────► io.use() middleware
  auth: { token }              ► jwt.verify → socket.userId, socket.username
```

**To add a protected route:** wrap handler with `requireAuth` in the route file.

**To add a protected socket event:** check `userId` at the top of the handler (already available from middleware).

---

## 6. DATA FLOW DURING A GAME

```
1. User navigates to /lobby
   → socket.emit('joinLobby')
   → server adds to lobbyPlayers[], broadcasts lobbyUpdate

2. Host clicks Start Game
   → socket.emit('startGame')
   → server calls createGameState(), moves all players to game room
   → server emits gameStarted → clients navigate to /game

3. Player takes action
   → socket.emit('takeAction', { gameId, action })
   → server: validateAction() → applyAction() → isGameOver()?
   → server emits gameStateUpdate to room

4. Game ends
   → server: rankPlayers() → DB writes (coins, wins, Game record)
   → server emits gameOver → clients show results screen
```

---

## 7. FILE MODIFICATION CHEAT SHEET

| What to change | File |
|---|---|
| Game state shape | `server_new/game/gameTypes.ts` |
| Game rules / win condition | `server_new/game/gameEngine.ts` |
| Socket events for game | `server_new/game/gameHandlers.ts` |
| Lobby size, host logic | `server_new/utils/socketHandler.ts` |
| Coin rewards | `server_new/game/gameTypes.ts` → `getCoinReward()` |
| User schema fields | `server_new/models/User.ts` |
| New API endpoint | Add to appropriate `routes/` + `controllers/` |
| Client game state type | `client_new/src/game/useGame.ts` → `GameState` interface |
| Client socket events | `client_new/src/game/useGame.ts` → `useEffect` |
| Board visuals | `client_new/src/game/GamePage.tsx` → game board section |
| New page | Add file to `src/pages/`, add `<Route>` in `App.tsx` |
| Styles | `client_new/src/index.css` |

---

## 8. QUICK REFERENCE — SOCKET EVENTS

| Event (client→server) | Payload | Description |
|---|---|---|
| `joinLobby` | — | Join the lobby room |
| `leaveLobby` | — | Leave the lobby room |
| `startGame` | — | Host starts the game |
| `takeAction` | `{ gameId, action }` | Generic game action |
| `sendMessage` | `{ gameId?, message }` | Chat (gameId optional = lobby) |
| `rejoinGame` | `{ gameId }` | Reconnect to active game |

| Event (server→client) | Payload | Description |
|---|---|---|
| `lobbyUpdate` | `{ players }` | Lobby player list changed |
| `chatHistory` | `ChatMsg[]` | Last 50 messages on join |
| `newMessage` | `{ username, text, type }` | New chat message |
| `gameStarted` | `{ gameState }` | Game began, go to /game |
| `gameStateUpdate` | `{ gameState }` | State changed (after action) |
| `gameOver` | `{ gameState, rankings }` | Game finished |
| `error` | `{ message }` | Something went wrong |

---

## 9. PORTS & URLS

| Service | URL |
|---|---|
| Backend API | http://localhost:8001/api |
| Socket.IO | http://localhost:8001 |
| Frontend | http://localhost:5174 |
| MongoDB | mongodb://127.0.0.1:27017/game_new |

---

## 10. INTEGRATION CHECKLIST

When adding a new game feature, verify:

- [ ] GameState interface updated in both `gameTypes.ts` AND `useGame.ts`
- [ ] New socket event registered in `registerGameHandlers()`
- [ ] Client `useGame.ts` listens for any new server-emitted events
- [ ] `isGameOver()` returns true at the right time (triggers DB write + gameOver emit)
- [ ] `rankPlayers()` returns correct ordering for coin rewards
- [ ] New User schema fields have `$inc` / `$set` in `finishGame()`

---

## 11. API TESTER

The file `server_new/test/apiTester.ts` tests all endpoints programmatically.

```bash
# Server must be running first, then:
cd server_new
npm run test
```

It runs through: signup → login → getMe → leaderboard → stats → history, and logs each response with status code.

To add your own test:

```typescript
// At the bottom of apiTester.ts, inside runTests():
await req('POST', '/your-endpoint', { field: 'value' }, token);
```

To test socket events manually from browser console:
```javascript
const s = io('http://localhost:8001', { auth: { token: localStorage.getItem('token') } });
s.emit('joinLobby');
s.on('lobbyUpdate', console.log);
```

use this instead

```javascript
// Load socket.io client (3 seconds)
var s = document.createElement('script');
s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
s.onload = function() {
  var socket = io('http://localhost:8001', { 
    auth: { token: localStorage.getItem('token') } 
  });
  socket.on('connect', () => console.log('✅ Connected:', socket.id));
  socket.on('lobbyUpdate', d => console.log('Lobby:', d));
  socket.emit('joinLobby');
  window.sock = socket;
  console.log('Type: sock.emit("event", data)');
};
document.head.appendChild(s);
```

---

## 12. ADDING A NEW PAGE (step-by-step)

1. Create `client_new/src/pages/MyPage.tsx`
2. Add a `<Route>` in `client_new/src/App.tsx`:
   ```tsx
   <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
   ```
3. Add a nav link in `App.tsx` navbar:
   ```tsx
   <Link to="/mypage">My Page</Link>
   ```

---

## 13. COMMON MISTAKES TO AVOID

| Mistake | Fix |
|---|---|
| Socket created twice (reconnect bug) | `getSocket()` checks `if (!socket)` not `if (!socket.connected)` |
| Property access on `unknown` type | Use `any` for API responses, not `unknown` |
| Client sending game values to server | Server generates all values (dice, scores); client only sends intent |
| Forgetting to update both GameState types | `gameTypes.ts` AND `useGame.ts` must match |
| `finishGame` not called on game end | `isGameOver()` must return `true` at right time — double check threshold |
| Missing `await` on DB writes | All `User.findByIdAndUpdate` calls in `finishGame` must be `await`ed |
| Socket room not joined on rejoin | `socket.join(gameId)` inside `rejoinGame` handler — don't forget this |
| New route not protected | Wrap route handler with `requireAuth` middleware in the routes file |

---

## 14. MENTAL MODEL

```
┌─────────────────────────────────────────────────────┐
│                     SERVER_NEW                      │
│                                                     │
│  HTTP (REST)          Socket.IO                     │
│  ─────────────        ────────────────────          │
│  /api/auth/*    ←→    lobbyPlayers[] (in-memory)    │
│  /api/users/*         activeGames Map<id, State>    │
│  /api/stats           chatHistory[]                 │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  game/  ← ONLY ZONE YOU TOUCH FOR NEW GAME   │   │
│  │  gameTypes.ts   — shape of state             │   │
│  │  gameEngine.ts  — pure logic (no sockets)    │   │
│  │  gameHandlers.ts — socket events             │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    CLIENT_NEW                       │
│                                                     │
│  AuthContext  — who is logged in                    │
│  apiFetch()   — REST calls (adds Bearer token)      │
│  getSocket()  — Socket.IO singleton                 │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  game/  ← ONLY ZONE YOU TOUCH FOR NEW GAME   │   │
│  │  useGame.ts   — socket listeners + actions   │   │
│  │  GamePage.tsx — board render + UI            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

Rule: gameEngine.ts has NO imports from socket/express/mongoose.
      It is pure TypeScript. Test it in isolation if needed.
```

---

## 15. EXAM SPEED TIPS

- For a **new game**: start with `gameTypes.ts` (define state shape), then `gameEngine.ts` (5 functions), then rename the socket event in `gameHandlers.ts`, then mirror changes in `useGame.ts`, then render in `GamePage.tsx`.
- For a **rule change**: it's almost always just `gameEngine.ts` — one or two lines.
- For a **new API**: copy an existing route+controller pair and rename.
- For a **new socket event**: copy `handleTakeAction` in `gameHandlers.ts`, rename, register at the bottom.
- `socketHandler.ts` already has lobby, chat, rejoin, disconnect — don't rewrite, just extend.
- The default game (counter) is intentionally trivial — it proves the plumbing works end-to-end.
