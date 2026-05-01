# NEW SYSTEM GUIDE — Exam-Ready MERN + Socket.IO Blueprint

> **How to use this guide under exam pressure:**
> - Skim the section headers first so you know where everything is.
> - Jump straight to §7 (new game) or §8 (friends/lobbies) when you know what the exam asks.
> - Use §14 (quick checklist) to verify before submitting.

---

## 1. Project Overview

### What this skeleton is

`clientv1/` and `serverv1/` are a complete, working MERN + Socket.IO multiplayer game template.
The default game is a trivial counter (players take turns incrementing a number).
That default exists only to prove every pipe — auth, lobby, real-time sync, DB writes — is connected end-to-end.
**You replace the counter logic with whatever game the exam specifies, and everything else stays.**

### Why two separate folders

- `serverv1/` — Node.js/Express/Socket.IO backend on port **8001**.
- `clientv1/` — React/Vite frontend on port **5174**.

They communicate two ways:
1. **HTTP REST** — for auth, leaderboard, history, profile.
2. **Socket.IO** — for everything that happens in real time: lobby, game actions, chat.

### How it helps in exam conditions

The skeleton gives you:
- Working auth (JWT, localStorage, protected routes) — no need to build from scratch.
- Working lobby with host detection and socket rooms.
- Working game lifecycle (start → play → finish → DB write → results).
- Two files you replace per game (`gameEngine.ts`, small parts of `gameHandlers.ts`).
- Two files you replace on the client (`useGame.ts`, `GamePage.tsx`).
- Everything else is reusable boilerplate.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (clientv1, port 5174)                                  │
│                                                                 │
│  React Router ──► Pages ──► AuthContext (who is logged in)      │
│                   │                                             │
│                   ├── REST calls via apiFetch() → adds token    │
│                   └── Socket.IO via getSocket() → singleton     │
└───────────────┬────────────────────────────┬────────────────────┘
                │ HTTP /api/*                │ ws:// socket events
                ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  NODE SERVER (serverv1, port 8001)                              │
│                                                                 │
│  Express (REST)                  Socket.IO                      │
│  ─────────────                   ───────────────────────────    │
│  /api/auth/*  → authController   io.use() auth middleware       │
│  /api/users/* → userController   lobbyPlayers[]  (in-memory)   │
│  /api/stats   → userController   activeGames Map<id,State>     │
│                                  chatHistory[]   (in-memory)   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  game/  ← THE ONLY ZONE YOU TOUCH FOR A NEW GAME         │   │
│  │  gameTypes.ts    — Player + GameState interfaces         │   │
│  │  gameEngine.ts   — pure functions, no side effects       │   │
│  │  gameHandlers.ts — socket event wiring + finishGame()    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  MongoDB via Mongoose                                           │
│  ──────────────────────                                         │
│  User collection  — accounts, coins, wins, total_played        │
│  Game collection  — finished game records (players, ranks)     │
└─────────────────────────────────────────────────────────────────┘
```

### Responsibility split

| Layer | Responsibilities | Does NOT do |
|---|---|---|
| Frontend (React) | Render UI, collect user input, emit socket events | Generate dice/scores, enforce rules |
| Backend REST | Auth, leaderboard, history, profile | Real-time game state |
| Backend Socket | Lobby management, game state, chat | Serve pages or static files |
| gameEngine.ts | All game rules, validation, state transitions | Touch sockets, DB, or Express |
| MongoDB | Persist users and finished games | Store live game state (that's in-memory Map) |

**The server is always authoritative.** The client only sends *intent* (e.g., "I want to roll", "I want to move token 2"). The server validates, applies the rule, and broadcasts the new state to everyone.

---

## 3. Full Application Flow

### 3.1 Login / Signup Flow

```
User fills login form
  │
  └─► apiFetch('/auth/login', { email, password })   [POST]
        │
        └─► authController.login()
              ├─ User.findOne({ email })
              ├─ compare password
              ├─ jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' })
              └─► { token, user }
        │
        └─► AuthContext saves token to localStorage
            AuthContext sets user state
            React Router navigates to /home
```

On every page load, `AuthContext` runs `apiFetch('/auth/me')` using the stored token.
If the token is valid, `user` is populated. If not, the user is redirected to `/login`.

**RequireAuth component** (in App.tsx) wraps every protected route.
It reads `user` from AuthContext. If null and not loading, it renders `<Navigate to="/login" />`.

### 3.2 Dashboard Flow

```
/home loads
  │
  └─► Home.tsx reads user from AuthContext (already loaded, no extra fetch)
      Displays username, coins
      Buttons: Play Game → /lobby, Leaderboard → /leaderboard, My History → /history
```

### 3.3 Lobby Flow

```
User navigates to /lobby
  │
  └─► Lobby.tsx mounts
        │
        ├─► socket.emit('joinLobby')
        │     └─► server: adds player to lobbyPlayers[], joins socket to 'lobby' room
        │         io.to('lobby').emit('lobbyUpdate', { players }) — all clients update
        │         socket.emit('chatHistory', last 50 messages)
        │
        ├─► Listens for: lobbyUpdate, chatHistory, newMessage, gameStarted, error
        │
        └─► If first player (isHost): sees "Start Game" button
            Other players: see "Waiting for host"

Host clicks Start Game
  │
  ├─► Requires ≥ 2 players  (checked on server)
  ├─► Requires caller = lobbyPlayers[0]  (host check)
  └─► socket.emit('startGame')
        │
        └─► server:
              - Takes all lobbyPlayers (up to 4), clears the array
              - gameId = 'game_' + Date.now()
              - createGameState(gameId, players)
              - activeGames.set(gameId, state)
              - For each player: socket.leave('lobby'), socket.join(gameId)
              - io.to(gameId).emit('gameStarted', { gameState })

All clients receive 'gameStarted'
  └─► Lobby.tsx: sessionStorage.setItem('gameId', gameState.gameId), navigate('/game')
```

**Cleanup on unmount:** Lobby.tsx useEffect cleanup runs `socket.emit('leaveLobby')` and unregisters all listeners. This prevents memory leaks and stale subscriptions.

### 3.4 Game Flow

```
/game loads (GamePage.tsx)
  │
  └─► useGame(userId) hook mounts
        │
        ├─► Check sessionStorage for 'gameId' → if found, socket.emit('rejoinGame', { gameId })
        │     └─► server: finds state in activeGames, sets player.socketId, socket.join(gameId)
        │         socket.emit('gameStateUpdate', { gameState }) — sends full state back
        │
        └─► Listens for: gameStarted, gameStateUpdate, gameOver, error

Player takes their turn
  │
  └─► User clicks action button (e.g., "Increment")
        │
        └─► takeAction() calls socket.emit('takeAction', { gameId, action })
              │
              └─► server: gameHandlers.ts → handleTakeAction()
                    ├─ validateAction(state, userId, action) → returns error or null
                    ├─ applyAction(state, userId, action)   → returns new state
                    ├─ activeGames.set(gameId, newState)
                    ├─ io.to(gameId).emit('gameStateUpdate', { gameState: newState })
                    └─ if isGameOver(newState) → finishGame()
```

### 3.5 Result / Finish Flow

```
finishGame() is called:
  │
  ├─► rankPlayers(state) → [{ userId, rank }] sorted by score
  ├─► For each player:
  │     - getCoinReward(rank, totalPlayers)
  │     - User.findByIdAndUpdate: $inc coins, total_played, wins (if rank === 1)
  │
  ├─► Game.create({ players with ranks/coins, status:'finished', startedAt, finishedAt })
  │
  ├─► io.to(gameId).emit('gameOver', { gameState: finalState, rankings })
  └─► activeGames.delete(gameId)

Client receives 'gameOver':
  └─► useGame sets gameOver state
      GamePage.tsx renders results screen
      sessionStorage.removeItem('gameId')
      User clicks "Play Again" → navigate('/lobby')
```

### 3.6 Persistence Flow

```
User data persists to MongoDB:
  - On signup: User.create()
  - On game finish: User.findByIdAndUpdate (coins, wins, total_played)
  - Game record: Game.create() with all player results

Live game state (activeGames Map) is IN MEMORY only.
  - If server restarts during a game, that game is lost (this is acceptable for PA).
  - For production, you'd persist to Redis or MongoDB.

Leaderboard: GET /api/users/leaderboard
  └─► User.find().sort({ coins: -1, wins: -1 }).skip().limit()

History: GET /api/users/history
  └─► Game.find({ 'players.userId': userId }).sort({ finishedAt: -1 })
```

---

## 4. Folder Structure Explanation

### serverv1/

```
serverv1/
├── server.ts               ← Entry point. Creates Express app, HTTP server, Socket.IO server.
│                             Connects to MongoDB. Mounts routes. Calls initSocketHandler(io).
│                             MODIFY: add new route mounts (app.use('/api/rooms', roomsRoutes))
│
├── config.env              ← PORT=8001, MONGO_URI=..., JWT_SECRET=...
│                             Never commit this file.
│
├── middleware/
│   └── auth.ts             ← requireAuth middleware. Reads Authorization: Bearer <token>.
│                             Attaches req.userId and req.username. Use on any protected route.
│
├── models/
│   ├── User.ts             ← username, email, password, coins, total_played, wins, createdAt.
│   │                         MODIFY: add fields like friends[], stats, avatar.
│   └── Game.ts             ← players (userId, username, rank, coinsEarned), status, startedAt, finishedAt.
│                             MODIFY: add game-specific fields like gameType, duration.
│
├── controllers/
│   ├── authController.ts   ← signup, login, logout, getMe, updateProfile.
│   │                         REUSABLE — rarely needs changes.
│   └── userController.ts   ← getLeaderboard, getHistory, getStats.
│                             MODIFY: add filters, search, custom sort.
│
├── routes/
│   ├── authRoutes.ts       ← POST /api/auth/signup|login|logout, GET /me, PUT /update
│   ├── userRoutes.ts       ← GET /api/users/leaderboard|history
│   └── statsRoutes.ts      ← GET /api/stats
│                             ADD NEW FILE here for new route groups (friends, rooms, etc.)
│
├── utils/
│   └── socketHandler.ts    ← Socket.IO core: auth middleware, joinLobby, leaveLobby,
│                             startGame, sendMessage, rejoinGame, disconnect.
│                             MODIFY: extend for new socket events (private rooms, etc.)
│                             Calls registerGameHandlers() at the end of connection handler.
│
├── game/                   ← THE EXAM ZONE — only these 3 files change per game
│   ├── gameTypes.ts        ← Player interface, GameState interface, getCoinReward().
│   ├── gameEngine.ts       ← createGameState, validateAction, applyAction, isGameOver, rankPlayers.
│   └── gameHandlers.ts     ← Socket event handlers for game actions + finishGame DB writes.
│
└── test/
    └── apiTester.ts        ← Programmatic REST endpoint tester. Run: npm run test
```

### clientv1/

```
clientv1/src/
├── main.tsx                ← React entry point. Renders <App />.
│
├── App.tsx                 ← BrowserRouter + all Routes. Nav component (shown when user != null).
│                             RequireAuth guard. ADD new pages here: new Route + new nav Link.
│
├── index.css               ← All styles. Classes: .page, .card, .btn, .btn-primary, .btn-ghost,
│                             .nav, .center, .game-layout, .game-board, .game-sidebar,
│                             .lobby-players, .chat-box, .chat-messages, .chat-input,
│                             .error-msg, .info-msg
│
├── context/
│   └── AuthContext.tsx     ← Global auth state. Provides user, loading, login(), signup(),
│                             logout(), refreshUser(). Wraps entire app.
│                             REUSABLE — do not modify unless adding fields to User interface.
│
├── utils/
│   ├── api.ts              ← apiFetch(path, options). Reads token from localStorage.
│   │                         Adds Authorization header automatically.
│   │                         Throws on non-OK responses with server's message.
│   └── socket.ts           ← getSocket() singleton. Creates socket once, reuses it.
│                             disconnectSocket() for cleanup on logout.
│
├── pages/                  ← Standard app pages. All protected by RequireAuth except Login/Signup.
│   ├── Login.tsx           ← /login — form, calls AuthContext.login()
│   ├── Signup.tsx          ← /signup — form, calls AuthContext.signup()
│   ├── Home.tsx            ← /home — welcome, quick nav buttons
│   ├── Lobby.tsx           ← /lobby — player list, chat, start button
│   ├── Leaderboard.tsx     ← /leaderboard — paginated table, fetches /api/users/leaderboard
│   ├── History.tsx         ← /history — paginated game records, fetches /api/users/history
│   └── UpdateProfile.tsx   ← /profile — username/email update form
│
└── game/                   ← THE EXAM ZONE — only these 2 files change per game
    ├── useGame.ts          ← Custom hook. Defines GameState interface. Listens to socket events.
    │                         Exposes gameState, gameOver, error, isMyTurn, takeAction().
    └── GamePage.tsx        ← Game board render + sidebar (players, log, chat).
                              Uses useGame() hook. Handles game-over screen.
```

---

## 5. Core Reusable Skeleton

These parts **never change** across exam games. Understand them deeply so you don't accidentally break them.

### 5.1 Auth (never touch)

- `serverv1/middleware/auth.ts` — `requireAuth` reads `Authorization: Bearer <token>`, verifies JWT, attaches `req.userId`.
- `serverv1/controllers/authController.ts` — signup/login/logout/getMe/updateProfile.
- `clientv1/src/context/AuthContext.tsx` — stores `user`, provides `login()`, `signup()`, `logout()`.
- `clientv1/src/utils/api.ts` — every REST call automatically adds the Bearer token.

**How JWT flows:**
1. On login/signup, server signs `jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' })`.
2. Client stores token in `localStorage.getItem('token')`.
3. `apiFetch()` reads it and adds `Authorization: Bearer <token>` to every request.
4. Socket connects with `auth: { token }` in handshake.
5. Socket middleware verifies token, attaches `socket.userId` and `socket.username`.

### 5.2 Socket Singleton (never touch)

`clientv1/src/utils/socket.ts` creates the socket exactly once:
```typescript
if (!socket) {
  socket = io('http://localhost:8001', { auth: { token }, withCredentials: true });
}
```
**Never create a socket inside a component.** Always call `getSocket()`. If you create it twice, you'll have duplicate event listeners and doubled events.

### 5.3 Routing (add to, never rewrite)

`App.tsx` has:
- `<RequireAuth>` guard — redirects to `/login` if no user.
- `<Nav>` — hidden when user is null (on login/signup pages).
- All routes listed explicitly.

**To add a new page:** create the `.tsx` file, add `<Route path="/myroute" element={<RequireAuth><MyPage /></RequireAuth>} />`, optionally add a `<Link>` in `Nav`.

### 5.4 Lobby and Chat (extend, not replace)

`socketHandler.ts` handles:
- `joinLobby` / `leaveLobby` — manages `lobbyPlayers[]` in-memory array.
- `startGame` — creates game state, moves players to game room, emits `gameStarted`.
- `sendMessage` — stores in `chatHistory[]`, broadcasts to room.
- `rejoinGame` — finds player in active game, updates socketId, sends full current state.
- `disconnect` — removes from lobby, optionally handles active game cleanup.

**These are rock solid. Only extend them** (e.g., add a host-kick feature, add a ready-check) — don't rewrite the core flow.

### 5.5 finishGame (rarely touch)

In `gameHandlers.ts`, `finishGame()` does three things every game needs:
1. Calls `rankPlayers()` to get ordered results.
2. Writes `User.findByIdAndUpdate` for each player (coins, wins, total_played).
3. Creates a `Game` document in MongoDB.
4. Emits `gameOver` to the room.

**The only parts you ever change here:** the fields you `$inc` on User (add new stats), and the fields you write to `Game` (add game-specific data). The structure stays the same.

---

## 6. Game Plug-in System

The skeleton separates game logic from infrastructure through a clean three-file contract:

```
gameTypes.ts    ← SHAPE:  What does a game state look like?
gameEngine.ts   ← RULES:  How does a state change? When does the game end?
gameHandlers.ts ← WIRING: Which socket events trigger which engine functions?
```

**Rule: `gameEngine.ts` must stay pure.** No `import` from socket.io, express, or mongoose. It is just TypeScript functions that take a state and return a new state. This means:
- You can test it without running the server.
- You can reason about it without knowing anything about sockets.
- Bugs are isolated to one file.

### The five engine functions

```typescript
createGameState(gameId, players)  → GameState
  // Called once when game starts. Set initial board, phase, counters, etc.

validateAction(state, userId, action) → string | null
  // Return an error message if the action is illegal. Return null if it's fine.
  // Always check: is the game playing? is it this player's turn? is the action valid?

applyAction(state, userId, action) → GameState
  // Apply the action to the state. Return the NEW state (immutable — spread state, don't mutate).
  // Move pieces, update scores, advance turn, append to log.

isGameOver(state) → boolean
  // Return true when the game should end and finishGame() should be called.

rankPlayers(state) → { userId: string; rank: number }[]
  // Return players ordered by performance. rank 1 = winner.
  // Used by finishGame() to assign coins.
```

### The client mirror

```
useGame.ts      ← CLIENT SHAPE + WIRING: mirrors GameState, listens to socket events
GamePage.tsx    ← CLIENT RENDER: shows the board, handles user input
```

`useGame.ts` exposes:
- `gameState` — the current full game state (received from server).
- `isMyTurn` — boolean, computed from `gameState.players[currentPlayerIndex].userId === userId`.
- `takeAction(action)` — emits the socket event with current gameId.
- `gameOver` — the rankings object when the game ends.

**The GameState interface in `useGame.ts` must exactly match the one in `gameTypes.ts`.** This is the most common source of bugs when adding a new game.

---

## 7. Detailed Guide: How to Add a New Game

**Time estimate: 20–45 minutes depending on game complexity.**

### Step 1: Define your state shape (gameTypes.ts)

Open `serverv1/game/gameTypes.ts`. The `Player` interface and `GameState` interface are yours to modify.

```typescript
export interface Player {
  userId: string;
  username: string;
  socketId: string;
  // ── ADD per-player state ──
  score: number;        // keep this or rename
  tokens: number[];     // example: token positions in Ludo
  isReady: boolean;
  // ─────────────────────────
}

export interface GameState {
  gameId: string;
  players: Player[];
  status: GameStatus;
  currentPlayerIndex: number;
  log: string[];
  startedAt: number;
  // ── ADD game-specific shared state ──
  board: string[][];    // 2D board for grid games
  diceValue: number | null;    // for dice games
  phase: 'roll' | 'move';      // turn phases
  // ────────────────────────────────────
}
```

**Keep `gameId`, `players`, `status`, `currentPlayerIndex`, `log`, `startedAt` — they're used by the skeleton.**
Delete `counter` and `lastAction` (the demo fields).

Also update `getCoinReward()` if you want different coin amounts:
```typescript
// 2 players: [winner coins, loser coins]
// 3 players: [1st, 2nd, 3rd]
// 4 players: [1st, 2nd, 3rd, 4th]
const table: Record<number, number[]> = {
  2: [100, 20],
  3: [150, 60, 20],
  4: [200, 100, 50, 20],
};
```

---

### Step 2: Write game rules (gameEngine.ts)

Open `serverv1/game/gameEngine.ts`. Fill in all five functions:

```typescript
export function createGameState(gameId: string, players: Player[]): GameState {
  return {
    gameId,
    players: players.map(p => ({ ...p, score: 0, tokens: [0, 0, 0, 0] })),
    status: 'playing',
    currentPlayerIndex: 0,
    board: Array(10).fill(null).map(() => Array(10).fill('')),
    diceValue: null,
    phase: 'roll',
    log: ['Game started'],
    startedAt: Date.now(),
  };
}

export function validateAction(state: GameState, userId: string, action: any): string | null {
  if (state.status !== 'playing') return 'Game is not active';
  const player = state.players[state.currentPlayerIndex];
  if (player.userId !== userId) return 'Not your turn';
  if (state.phase === 'roll' && action.type === 'move') return 'Roll first';
  // add game-specific checks
  return null;
}

export function applyAction(state: GameState, userId: string, action: any): GameState {
  // IMPORTANT: spread state and players array — never mutate
  const s = { ...state, players: state.players.map(p => ({ ...p })) };
  const player = s.players[s.currentPlayerIndex];

  if (action.type === 'roll') {
    s.diceValue = Math.floor(Math.random() * 6) + 1;
    s.phase = 'move';
    s.log = [...s.log, `${player.username} rolled ${s.diceValue}`];
  } else if (action.type === 'move') {
    // apply move logic
    player.score += s.diceValue ?? 0;
    s.phase = 'roll';
    s.diceValue = null;
    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    s.log = [...s.log, `${player.username} moved`];
  }

  return s;
}

export function isGameOver(state: GameState): boolean {
  return state.players.some(p => p.score >= 100);  // your win condition
}

export function rankPlayers(state: GameState): { userId: string; rank: number }[] {
  return [...state.players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ userId: p.userId, rank: i + 1 }));
}
```

---

### Step 3: Wire up socket events (gameHandlers.ts)

Open `serverv1/game/gameHandlers.ts`. Rename `handleTakeAction` to match your game, or add multiple handlers.

**Pattern for a single event (like 'takeAction'):**
```typescript
function handleTakeAction(socket, activeGames, io, userId) {
  socket.on('takeAction', ({ gameId, action }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { message: 'Game not found' });

    const err = validateAction(state, userId, action);
    if (err) return socket.emit('error', { message: err });

    const newState = applyAction(state, userId, action);
    activeGames.set(gameId, newState);
    io.to(gameId).emit('gameStateUpdate', { gameState: newState });

    if (isGameOver(newState)) {
      finishGame(gameId, newState, activeGames, io);
    }
  });
}
```

**Pattern for multiple events (e.g., Ludo):**
```typescript
function handleRollDice(socket, activeGames, io, userId) {
  socket.on('rollDice', ({ gameId }) => {
    // ... validate, apply roll action
  });
}

function handleMoveToken(socket, activeGames, io, userId) {
  socket.on('moveToken', ({ gameId, tokenIndex }) => {
    // ... validate, apply move action
  });
}

export function registerGameHandlers(socket, activeGames, io, userId) {
  handleRollDice(socket, activeGames, io, userId);
  handleMoveToken(socket, activeGames, io, userId);
}
```

**Do not touch `finishGame()`.** It already handles DB writes correctly. The only reason to change it is if you add new fields to the User or Game schema.

---

### Step 4: Mirror the state on the client (useGame.ts)

Open `clientv1/src/game/useGame.ts`.

Update the `GameState` interface to match `serverv1/game/gameTypes.ts` **exactly**:
```typescript
export interface GameState {
  gameId: string;
  players: { userId: string; username: string; score: number; tokens: number[] }[];
  status: string;
  currentPlayerIndex: number;
  board: string[][];
  diceValue: number | null;
  phase: 'roll' | 'move';
  log: string[];
}
```

Add new action functions. Replace `takeAction` with your actual actions:
```typescript
const rollDice = useCallback(() => {
  if (!gameState) return;
  socket.emit('takeAction', { gameId: gameState.gameId, action: { type: 'roll' } });
}, [gameState]);

const moveToken = useCallback((tokenIndex: number) => {
  if (!gameState) return;
  socket.emit('takeAction', { gameId: gameState.gameId, action: { type: 'move', tokenIndex } });
}, [gameState]);

return { gameState, gameOver, error, isMyTurn, rollDice, moveToken };
```

Or if you renamed the socket event to `rollDice` directly:
```typescript
const rollDice = useCallback(() => {
  if (!gameState) return;
  socket.emit('rollDice', { gameId: gameState.gameId });
}, [gameState]);
```

---

### Step 5: Render your board (GamePage.tsx)

Open `clientv1/src/game/GamePage.tsx`.

Find the section between `{/* ── REPLACE BELOW WITH YOUR GAME VISUALS ── */}` and `{/* ── END GAME VISUALS ── */}`. Replace everything between those comments with your board.

```tsx
// Example: Grid game board
<div style={{ display: 'grid', gridTemplateColumns: `repeat(${gameState.board[0].length}, 40px)`, gap: 2 }}>
  {gameState.board.map((row, r) =>
    row.map((cell, c) => (
      <div
        key={`${r}-${c}`}
        onClick={() => isMyTurn && moveToken(r * 10 + c)}
        style={{
          width: 40, height: 40, background: cell ? '#818cf8' : '#1e293b',
          border: '1px solid #334155', cursor: isMyTurn ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {cell}
      </div>
    ))
  )}
</div>
```

**The sidebar (players, log, chat) is already written and reusable.** Only replace the board section.

Also update `useGame` import at the top to destructure your new action functions:
```tsx
const { gameState, gameOver, error, isMyTurn, rollDice, moveToken } = useGame(user?._id ?? '');
```

---

### Step 6: Verify the full loop

Checklist after implementing a new game:

- [ ] `GameState` interface in `useGame.ts` matches `gameTypes.ts` exactly (same field names, same types)
- [ ] New socket event name in `gameHandlers.ts` matches `socket.emit()` call in `useGame.ts`
- [ ] `isGameOver()` returns `true` at the right moment
- [ ] `rankPlayers()` orders players correctly (higher score = rank 1? or first to finish = rank 1?)
- [ ] `registerGameHandlers()` includes all new handler calls
- [ ] `GamePage.tsx` destructures the new functions from `useGame()`
- [ ] Run server, open two tabs, play through a full game, check MongoDB for a `Game` document

---

## 8. Detailed Guide: Friends System and Private Lobbies

This section explains how to add a friends system and private room invites from scratch. This requires changes to the data model, REST API, socket layer, and client.

### 8.1 Data Model Changes

**Add a `friends` field to the User model:**

In `serverv1/models/User.ts`:
```typescript
import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  coins: number;
  total_played: number;
  wins: number;
  friends: mongoose.Types.ObjectId[];      // ADD
  friendRequests: mongoose.Types.ObjectId[]; // ADD (incoming requests)
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  // ... existing fields ...
  friends:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});
```

**Add a PrivateRoom model (optional — you can also use in-memory):**

Create `serverv1/models/PrivateRoom.ts`:
```typescript
import mongoose, { Document } from 'mongoose';

export interface IPrivateRoom extends Document {
  code: string;              // 6-char invite code, e.g., 'ABC123'
  hostId: mongoose.Types.ObjectId;
  players: mongoose.Types.ObjectId[];
  maxPlayers: number;
  status: 'waiting' | 'playing';
  createdAt: Date;
}

const privateRoomSchema = new mongoose.Schema<IPrivateRoom>({
  code:       { type: String, unique: true, required: true },
  hostId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  players:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxPlayers: { type: Number, default: 4 },
  status:     { type: String, default: 'waiting' },
  createdAt:  { type: Date, default: Date.now, expires: 3600 }, // auto-delete after 1 hour
});

export default mongoose.model<IPrivateRoom>('PrivateRoom', privateRoomSchema);
```

---

### 8.2 Friends REST API

**Create `serverv1/controllers/friendsController.ts`:**

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

// GET /api/friends — list my friends
export async function getFriends(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).populate('friends', 'username coins total_played');
  res.json({ friends: user?.friends ?? [] });
}

// POST /api/friends/request/:userId — send a friend request
export async function sendRequest(req: AuthRequest, res: Response) {
  const targetId = req.params.userId;
  if (targetId === req.userId) return res.status(400).json({ message: 'Cannot add yourself' });

  const target = await User.findById(targetId);
  if (!target) return res.status(404).json({ message: 'User not found' });

  const alreadyFriends = target.friends.some(id => id.toString() === req.userId);
  if (alreadyFriends) return res.status(400).json({ message: 'Already friends' });

  const alreadyRequested = target.friendRequests.some(id => id.toString() === req.userId);
  if (alreadyRequested) return res.status(400).json({ message: 'Request already sent' });

  await User.findByIdAndUpdate(targetId, {
    $push: { friendRequests: req.userId }
  });
  res.json({ message: 'Friend request sent' });
}

// POST /api/friends/accept/:userId — accept a friend request
export async function acceptRequest(req: AuthRequest, res: Response) {
  const requesterId = req.params.userId;

  await User.findByIdAndUpdate(req.userId, {
    $pull:  { friendRequests: requesterId },
    $push:  { friends: requesterId },
  });
  await User.findByIdAndUpdate(requesterId, {
    $push: { friends: req.userId }
  });
  res.json({ message: 'Friend added' });
}

// DELETE /api/friends/:userId — remove a friend
export async function removeFriend(req: AuthRequest, res: Response) {
  const friendId = req.params.userId;

  await User.findByIdAndUpdate(req.userId, { $pull: { friends: friendId } });
  await User.findByIdAndUpdate(friendId,    { $pull: { friends: req.userId } });
  res.json({ message: 'Friend removed' });
}

// GET /api/friends/requests — list incoming requests
export async function getRequests(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).populate('friendRequests', 'username');
  res.json({ requests: user?.friendRequests ?? [] });
}
```

**Create `serverv1/routes/friendsRoutes.ts`:**

```typescript
import { Router } from 'express';
import { getFriends, sendRequest, acceptRequest, removeFriend, getRequests } from '../controllers/friendsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/',                    requireAuth, getFriends);
router.get('/requests',            requireAuth, getRequests);
router.post('/request/:userId',    requireAuth, sendRequest);
router.post('/accept/:userId',     requireAuth, acceptRequest);
router.delete('/:userId',          requireAuth, removeFriend);

export default router;
```

**Mount in `server.ts`:**
```typescript
import friendsRoutes from './routes/friendsRoutes';
app.use('/api/friends', friendsRoutes);
```

---

### 8.3 Private Rooms REST API

**Create `serverv1/controllers/privateRoomController.ts`:**

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import PrivateRoom from '../models/PrivateRoom';
import { randomBytes } from 'crypto';

function generateCode(): string {
  return randomBytes(3).toString('hex').toUpperCase(); // e.g., 'A3F9C1'
}

// POST /api/rooms — create a private room
export async function createRoom(req: AuthRequest, res: Response) {
  const existing = await PrivateRoom.findOne({ hostId: req.userId, status: 'waiting' });
  if (existing) return res.json({ room: existing }); // return existing room if host already has one

  const room = await PrivateRoom.create({
    code: generateCode(),
    hostId: req.userId,
    players: [req.userId],
    maxPlayers: req.body.maxPlayers ?? 4,
  });
  res.status(201).json({ room });
}

// POST /api/rooms/join — join by invite code
export async function joinRoom(req: AuthRequest, res: Response) {
  const { code } = req.body;
  const room = await PrivateRoom.findOne({ code: code.toUpperCase(), status: 'waiting' });
  if (!room) return res.status(404).json({ message: 'Room not found or already started' });
  if (room.players.length >= room.maxPlayers) return res.status(400).json({ message: 'Room is full' });

  const alreadyIn = room.players.some(id => id.toString() === req.userId);
  if (!alreadyIn) {
    room.players.push(req.userId as any);
    await room.save();
  }
  res.json({ room });
}

// GET /api/rooms/:code — get room info
export async function getRoom(req: AuthRequest, res: Response) {
  const room = await PrivateRoom.findOne({ code: req.params.code })
    .populate('players', 'username');
  if (!room) return res.status(404).json({ message: 'Room not found' });
  res.json({ room });
}

// DELETE /api/rooms/:code — host deletes room
export async function deleteRoom(req: AuthRequest, res: Response) {
  const room = await PrivateRoom.findOne({ code: req.params.code });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.hostId.toString() !== req.userId) return res.status(403).json({ message: 'Not the host' });
  await room.deleteOne();
  res.json({ message: 'Room deleted' });
}
```

**Create `serverv1/routes/privateRoomRoutes.ts`:**
```typescript
import { Router } from 'express';
import { createRoom, joinRoom, getRoom, deleteRoom } from '../controllers/privateRoomController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.post('/',        requireAuth, createRoom);
router.post('/join',    requireAuth, joinRoom);
router.get('/:code',   requireAuth, getRoom);
router.delete('/:code', requireAuth, deleteRoom);

export default router;
```

**Mount in `server.ts`:**
```typescript
import privateRoomRoutes from './routes/privateRoomRoutes';
app.use('/api/rooms', privateRoomRoutes);
```

---

### 8.4 Socket Changes for Private Lobbies

The key insight: the current `startGame` socket event uses the global `lobbyPlayers[]` array.
For private rooms, you need a **separate room-specific player list**.

**Option A (simplest): One lobby per room code, stored in a Map:**

In `socketHandler.ts`, add at the top:
```typescript
// Map from room code to players in that private lobby
const privateLobbies = new Map<string, Player[]>();
```

Then add new socket events inside `io.on('connection', ...)`:
```typescript
// Join a private lobby (requires room code from DB)
socket.on('joinPrivateLobby', ({ code }: { code: string }) => {
  if (!privateLobbies.has(code)) privateLobbies.set(code, []);
  const lobby = privateLobbies.get(code)!;

  const existing = lobby.find(p => p.userId === userId);
  if (existing) {
    existing.socketId = socket.id;
  } else {
    if (lobby.length >= 4) return socket.emit('error', { message: 'Room is full' });
    lobby.push({ userId, username, socketId: socket.id, score: 0, isReady: false });
  }

  socket.join(`private_${code}`);
  io.to(`private_${code}`).emit('privateLobbyUpdate', { players: lobby, code });
});

socket.on('leavePrivateLobby', ({ code }: { code: string }) => {
  const lobby = privateLobbies.get(code);
  if (lobby) {
    const idx = lobby.findIndex(p => p.userId === userId);
    if (idx !== -1) lobby.splice(idx, 1);
    if (lobby.length === 0) privateLobbies.delete(code);
    else io.to(`private_${code}`).emit('privateLobbyUpdate', { players: lobby, code });
  }
  socket.leave(`private_${code}`);
});

socket.on('startPrivateGame', ({ code }: { code: string }) => {
  const lobby = privateLobbies.get(code);
  if (!lobby || lobby.length < 2) return socket.emit('error', { message: 'Need at least 2 players' });
  if (lobby[0].userId !== userId) return socket.emit('error', { message: 'Only host can start' });

  const gameId = `private_${code}_${Date.now()}`;
  const players = [...lobby];
  privateLobbies.delete(code);  // clear lobby

  const state = createGameState(gameId, players);
  activeGames.set(gameId, state);

  for (const p of players) {
    const s = io.sockets.sockets.get(p.socketId);
    if (s) { s.leave(`private_${code}`); s.join(gameId); }
  }

  io.to(gameId).emit('gameStarted', { gameState: state });
});
```

---

### 8.5 Client: Friends Page

**Create `clientv1/src/pages/Friends.tsx`:**

```tsx
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

interface Friend { _id: string; username: string; coins: number; total_played: number; }

export default function Friends() {
  const [friends,  setFriends]  = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [search,   setSearch]   = useState('');
  const [error,    setError]    = useState('');

  useEffect(() => {
    apiFetch('/friends').then(d => setFriends(d.friends));
    apiFetch('/friends/requests').then(d => setRequests(d.requests));
  }, []);

  async function sendRequest() {
    // Requires a search-user endpoint: GET /api/users/search?username=...
    try {
      const { users } = await apiFetch(`/users/search?username=${search}`);
      if (!users[0]) return setError('User not found');
      await apiFetch(`/friends/request/${users[0]._id}`, { method: 'POST' });
      setError('');
      setSearch('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function accept(userId: string) {
    await apiFetch(`/friends/accept/${userId}`, { method: 'POST' });
    const updated = await apiFetch('/friends');
    setFriends(updated.friends);
    setRequests(prev => prev.filter(r => r._id !== userId));
  }

  async function remove(userId: string) {
    await apiFetch(`/friends/${userId}`, { method: 'DELETE' });
    setFriends(prev => prev.filter(f => f._id !== userId));
  }

  return (
    <div className="page">
      <h1>Friends</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Add Friend</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Enter username"
          />
          <button className="btn btn-primary" onClick={sendRequest}>Send Request</button>
        </div>
        {error && <p className="error-msg">{error}</p>}
      </div>

      {requests.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Incoming Requests</h3>
          {requests.map(r => (
            <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>{r.username}</span>
              <button className="btn btn-primary" onClick={() => accept(r._id)}>Accept</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>My Friends ({friends.length})</h3>
        {friends.map(f => (
          <div key={f._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>{f.username}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#aaa', fontSize: 13 }}>{f.coins} coins</span>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => remove(f._id)}>Remove</button>
            </div>
          </div>
        ))}
        {friends.length === 0 && <p className="info-msg">No friends yet</p>}
      </div>
    </div>
  );
}
```

**Register in App.tsx:**
```tsx
import Friends from './pages/Friends';
// In routes:
<Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
// In Nav:
<Link to="/friends">Friends</Link>
```

---

### 8.6 Client: Private Lobby Page

**Create `clientv1/src/pages/PrivateLobby.tsx`:**

```tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket } from '../utils/socket';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface LobbyPlayer { userId: string; username: string; }

export default function PrivateLobby() {
  const { code }                    = useParams<{ code: string }>();
  const { user }                    = useAuth();
  const navigate                    = useNavigate();
  const [players, setPlayers]       = useState<LobbyPlayer[]>([]);
  const [error, setError]           = useState('');

  useEffect(() => {
    const socket = getSocket();
    socket.emit('joinPrivateLobby', { code });

    socket.on('privateLobbyUpdate', ({ players: ps }: { players: LobbyPlayer[] }) => setPlayers(ps));
    socket.on('gameStarted', ({ gameState }: any) => {
      sessionStorage.setItem('gameId', gameState.gameId);
      navigate('/game');
    });
    socket.on('error', ({ message }: any) => setError(message));

    return () => {
      socket.emit('leavePrivateLobby', { code });
      socket.off('privateLobbyUpdate');
      socket.off('gameStarted');
      socket.off('error');
    };
  }, [code, navigate]);

  const isHost = players[0]?.userId === user?._id;

  return (
    <div className="page">
      <h1>Private Lobby</h1>
      <p style={{ color: '#aaa', marginBottom: 16 }}>Invite code: <strong style={{ color: '#818cf8' }}>{code}</strong></p>
      <div className="lobby-players">
        {players.map((p, i) => (
          <div key={p.userId} className="lobby-player">
            <span>{p.username}</span>
            {i === 0 && <span className="host-badge">HOST</span>}
          </div>
        ))}
      </div>
      {error && <p className="error-msg">{error}</p>}
      {isHost ? (
        <button className="btn btn-primary" style={{ marginTop: 16 }}
          onClick={() => getSocket().emit('startPrivateGame', { code })}
          disabled={players.length < 2}>
          Start Game ({players.length}/4)
        </button>
      ) : (
        <p className="info-msg">Waiting for host to start…</p>
      )}
    </div>
  );
}
```

**Create private room flow:**

```tsx
// In some page (e.g., Home.tsx or a new CreateRoom page):
async function createAndJoin() {
  const { room } = await apiFetch('/rooms', { method: 'POST', body: JSON.stringify({}) });
  navigate(`/private-lobby/${room.code}`);
}

// Join by code:
async function joinByCode(code: string) {
  await apiFetch('/rooms/join', { method: 'POST', body: JSON.stringify({ code }) });
  navigate(`/private-lobby/${code}`);
}
```

**Register in App.tsx:**
```tsx
import PrivateLobby from './pages/PrivateLobby';
<Route path="/private-lobby/:code" element={<RequireAuth><PrivateLobby /></RequireAuth>} />
```

---

### 8.7 Online Status (optional, simple version)

Track online users using a socket Set in `socketHandler.ts`:

```typescript
// At the top, alongside lobbyPlayers:
const onlineUsers = new Set<string>(); // userIds

// In connection handler:
onlineUsers.add(userId);

// In disconnect handler:
onlineUsers.delete(userId);

// Add a socket event for checking friends' status:
socket.on('getFriendStatus', ({ friendIds }: { friendIds: string[] }) => {
  const statuses = Object.fromEntries(
    friendIds.map(id => [id, onlineUsers.has(id)])
  );
  socket.emit('friendStatuses', statuses);
});
```

On the client, after loading friends:
```typescript
const socket = getSocket();
socket.emit('getFriendStatus', { friendIds: friends.map(f => f._id) });
socket.on('friendStatuses', (statuses: Record<string, boolean>) => {
  setOnlineStatus(statuses);
});
```

---

## 9. Socket.IO Design Guide

### 9.1 Server-Authoritative Design

**Never trust the client for game logic.**

- Client sends: `socket.emit('rollDice', { gameId })`
- Server validates, generates dice value, applies move, sends result back.
- Client receives: `socket.on('gameStateUpdate', ({ gameState }) => ...)` and renders whatever the server says.

Why: if the client controlled dice rolls or score calculation, cheating would be trivial.

### 9.2 Rooms

Socket.IO rooms are named channels. A socket can be in multiple rooms at once.

```typescript
socket.join('lobby')      // add this socket to the 'lobby' room
socket.leave('lobby')     // remove from room
socket.join(gameId)       // add to a game-specific room

io.to('lobby').emit(...)  // broadcast to everyone in lobby
io.to(gameId).emit(...)   // broadcast to everyone in this specific game
socket.emit(...)          // only to this socket (private response)
```

**Pattern used in this skeleton:**
- All lobby users are in the `'lobby'` room.
- When a game starts, players move from `'lobby'` to `gameId` room.
- Chat uses the same room for routing (lobby chat vs game chat).

### 9.3 Events Reference

**Client → Server:**

| Event | Payload | When |
|---|---|---|
| `joinLobby` | — | User enters lobby page |
| `leaveLobby` | — | User leaves lobby page (component unmount) |
| `startGame` | — | Host clicks Start |
| `takeAction` | `{ gameId, action }` | Any game action |
| `sendMessage` | `{ gameId?, message }` | Chat (no gameId = lobby) |
| `rejoinGame` | `{ gameId }` | Page reload while game is active |
| `joinPrivateLobby` | `{ code }` | Join private room by code |
| `leavePrivateLobby` | `{ code }` | Leave private room |
| `startPrivateGame` | `{ code }` | Host starts private game |

**Server → Client:**

| Event | Payload | When |
|---|---|---|
| `lobbyUpdate` | `{ players }` | Anyone joins/leaves lobby |
| `chatHistory` | `ChatMsg[]` | On joinLobby (last 50 msgs) |
| `newMessage` | `{ username, text, type }` | Chat message sent |
| `gameStarted` | `{ gameState }` | Game begins, navigate to /game |
| `gameStateUpdate` | `{ gameState }` | Any state change |
| `gameOver` | `{ gameState, rankings }` | Game finishes |
| `error` | `{ message }` | Any error |
| `privateLobbyUpdate` | `{ players, code }` | Private lobby change |

### 9.4 Auth Middleware for Sockets

Every socket connection is authenticated before the `connection` event fires:

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; username: string };
    socket.userId   = payload.id;
    socket.username = payload.username;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});
```

After this, every handler inside `io.on('connection', ...)` can safely read `socket.userId` and `socket.username`.

### 9.5 Common Socket Bugs

**Duplicate listeners:** If you call `socket.on('event', handler)` inside a component that re-renders, you get multiple listeners. Fix: always clean up in `useEffect` return:
```typescript
return () => {
  socket.off('event', handler);  // pass the same named function reference
};
```

**Stale closure in useCallback:** If a `useCallback` function captures `gameState` and the dep array is wrong, it may use an old state. Fix: always include `gameState` in the dependency array of actions that read it.

**Socket not in game room on reconnect:** After a page refresh, the socket reconnects but the server-side room membership is lost. The `rejoinGame` event re-runs `socket.join(gameId)` to fix this.

---

## 10. API Design Guide

### 10.1 Existing Endpoints

```
POST /api/auth/signup       { username, email, password } → { token, user }
POST /api/auth/login        { email, password }           → { token, user }
POST /api/auth/logout       —                             → { message }
GET  /api/auth/me           (auth required)               → user object
PUT  /api/auth/update       (auth required) { username, email } → user object

GET  /api/users/leaderboard (auth required) ?page=1       → { users, pages }
GET  /api/users/history     (auth required) ?page=1       → { history, pages }
GET  /api/stats             (auth required)               → { ...user, winRate }
```

### 10.2 Adding a New Endpoint (step-by-step)

1. **Write the handler** in a controller file (new or existing):
```typescript
// serverv1/controllers/myController.ts
export async function myHandler(req: AuthRequest, res: Response) {
  const data = await SomeModel.find({ userId: req.userId });
  res.json({ data });
}
```

2. **Add the route** (new or existing routes file):
```typescript
// serverv1/routes/myRoutes.ts
import { Router } from 'express';
import { myHandler } from '../controllers/myController';
import { requireAuth } from '../middleware/auth';
const router = Router();
router.get('/', requireAuth, myHandler);
export default router;
```

3. **Mount it** in `server.ts`:
```typescript
import myRoutes from './routes/myRoutes';
app.use('/api/my', myRoutes);
```

4. **Call it** from the client with `apiFetch`:
```typescript
const data = await apiFetch('/my');
```

### 10.3 Auth Pattern Summary

Every protected route:
```typescript
router.get('/protected', requireAuth, async (req: AuthRequest, res) => {
  // req.userId is guaranteed to be set here
  const user = await User.findById(req.userId);
});
```

Unprotected routes (login, signup):
```typescript
router.post('/login', login);  // no requireAuth
```

### 10.4 Adding Search/Filter to Leaderboard

```typescript
export async function getLeaderboard(req: AuthRequest, res: Response) {
  const page   = parseInt(String(req.query.page)) || 1;
  const limit  = 10;
  const skip   = (page - 1) * limit;
  const sort   = req.query.sort === 'wins'
    ? { wins: -1 }
    : { coins: -1, wins: -1 };
  const filter = req.query.search
    ? { username: { $regex: req.query.search, $options: 'i' } }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).select('-password'),
    User.countDocuments(filter),
  ]);

  res.json({ users, pages: Math.ceil(total / limit) });
}
```

---

## 11. Database / Data Model Guide

### 11.1 User Schema

```typescript
{
  username:     String (unique, required)
  email:        String (unique, required, lowercase)
  password:     String (required)  // plain text in skeleton — use bcrypt in prod
  coins:        Number (default: 500)
  total_played: Number (default: 0)
  wins:         Number (default: 0)
  createdAt:    Date   (default: Date.now)
  // optional additions:
  friends:      [ObjectId]  // refs to User
  friendRequests: [ObjectId]
  avatar:       String     // URL or enum
  stats:        Mixed      // game-specific extended stats
}
```

**Adding a new field:**
1. Add to the TypeScript interface in `User.ts`.
2. Add to the Mongoose schema object in `User.ts`.
3. Update `finishGame()` in `gameHandlers.ts` to `$inc` or `$set` the field.
4. Update leaderboard query if it should be sortable.

### 11.2 Game Schema

```typescript
{
  players: [{
    userId:      String
    username:    String
    rank:        Number
    coinsEarned: Number
  }]
  status:    String (default: 'waiting' → 'playing' → 'finished')
  startedAt: Date
  finishedAt: Date
}
```

**To add game-specific fields:**
```typescript
// In Game.ts:
gameType: { type: String, default: 'counter' },
duration:  Number,  // seconds

// In finishGame():
await Game.create({
  players: playerResults,
  status: 'finished',
  startedAt: new Date(state.startedAt),
  finishedAt: new Date(),
  gameType: 'ludo',
  duration: Math.floor((Date.now() - state.startedAt) / 1000),
});
```

### 11.3 Common MongoDB Operations

```typescript
// Find one
await User.findById(userId)
await User.findOne({ email })
await User.findOne({ 'players.userId': userId })  // nested field search

// Update
await User.findByIdAndUpdate(userId, {
  $inc:  { coins: 100, total_played: 1 },  // increment
  $set:  { username: 'newname' },           // overwrite
  $push: { friends: friendId },             // append to array
  $pull: { friends: friendId },             // remove from array
}, { new: true })  // new: true returns updated document

// Create
await User.create({ username, email, password })

// Paginated query
await User.find(filter)
  .sort({ coins: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .select('-password')  // exclude password field
```

---

## 12. Common Exam Modifications

### A) New game type (e.g., Tic-Tac-Toe, Checkers, Hangman)

Files to change: `gameTypes.ts`, `gameEngine.ts`, `gameHandlers.ts` (rename event), `useGame.ts` (mirror state + rename), `GamePage.tsx` (replace board).
Files to keep: everything else.
Time: 25–40 min.

### B) Turn-based game with dice

Add `diceValue: number | null` and `phase: 'roll' | 'move'` to `GameState`.
In `validateAction`: check phase before allowing roll or move.
In socket events: separate `rollDice` and `moveToken` handlers (or use `action.type`).
The client needs two buttons: Roll (disabled unless phase=roll and isMyTurn) and Move (disabled unless phase=move).

### C) Game timer / auto-move

```typescript
// In socketHandler.ts, at top:
const turnTimers = new Map<string, NodeJS.Timeout>();

// After emitting gameStateUpdate:
clearTimeout(turnTimers.get(gameId));
const timer = setTimeout(() => {
  const s = activeGames.get(gameId);
  if (!s || s.status !== 'playing') return;
  // auto-apply a default action
  const newState = applyAction(s, s.players[s.currentPlayerIndex].userId, { type: 'skip' });
  activeGames.set(gameId, newState);
  io.to(gameId).emit('gameStateUpdate', { gameState: newState });
  if (isGameOver(newState)) finishGame(gameId, newState, activeGames, io);
}, 20000); // 20 seconds
turnTimers.set(gameId, timer);
```

### D) Team-based game

Add `team: 'red' | 'blue'` to `Player` interface.
In `validateAction`: check same-team rules.
In `rankPlayers`: rank by team (all players of winning team get rank 1).
In `finishGame`: call `getCoinReward` with team rank, not individual rank.

### E) Spectators

```typescript
// In socketHandler.ts:
socket.on('joinAsSpectator', ({ gameId }: { gameId: string }) => {
  const state = activeGames.get(gameId);
  if (!state) return socket.emit('error', { message: 'Game not found' });
  socket.join(gameId);
  socket.emit('gameStateUpdate', { gameState: state }); // send full state
});
```

Add a `/spectate/:gameId` route on the client. That page calls `rejoinGame` but never shows action buttons (since `isMyTurn` will always be false for a spectator).

### F) Ready system before game starts

Add `isReady: boolean` to `Player` (already in the skeleton).

```typescript
socket.on('setReady', ({ ready }: { ready: boolean }) => {
  const player = lobbyPlayers.find(p => p.userId === userId);
  if (player) player.isReady = ready;
  io.to('lobby').emit('lobbyUpdate', { players: lobbyPlayers });
});

// In startGame: check all players ready
if (!players.every(p => p.isReady)) {
  return socket.emit('error', { message: 'Not all players are ready' });
}
```

### G) Reconnect handling / mark player as AFK

```typescript
// In disconnect handler:
socket.on('disconnect', () => {
  // Find player in active games and mark as disconnected
  for (const [gameId, state] of activeGames) {
    const player = state.players.find(p => p.userId === userId);
    if (player) {
      player.isConnected = false;
      io.to(gameId).emit('gameStateUpdate', { gameState: state });
    }
  }
});

// In rejoinGame:
socket.on('rejoinGame', ({ gameId }) => {
  const state = activeGames.get(gameId);
  const player = state?.players.find(p => p.userId === userId);
  if (player) {
    player.socketId = socket.id;
    player.isConnected = true;
    socket.join(gameId);
    socket.emit('gameStateUpdate', { gameState: state });
  }
});
```

### H) Win by achieving something specific (not score)

Replace `isGameOver` check in `gameEngine.ts`:
```typescript
// Example: first player to move all 4 tokens to goal
export function isGameOver(state: GameState): boolean {
  return state.players.some(p => p.tokens.every(t => t === GOAL_POSITION));
}

// In rankPlayers: player who finished first gets rank 1
export function rankPlayers(state: GameState): { userId: string; rank: number }[] {
  // use state.finishOrder array you added to GameState
  return state.finishOrder.map((userId, i) => ({ userId, rank: i + 1 }));
}
```

---

## 13. Common Mistakes

| Mistake | What breaks | Fix |
|---|---|---|
| `GameState` interface in `useGame.ts` doesn't match `gameTypes.ts` | TypeScript errors or runtime undefined access | Copy fields exactly — same names, same types |
| Socket event name mismatch | Client emits `'rollDice'`, server listens for `'roll_dice'` — nothing happens | Use the same string in both files |
| Mutating state directly in `applyAction` | Other references to old state get corrupted | Always `const s = { ...state, players: state.players.map(p => ({ ...p })) }` |
| `socket.on()` called without `socket.off()` in cleanup | Multiple listeners accumulate on re-renders — events fire multiple times | Use named function variables and unregister them in `useEffect` return |
| Socket created inside a component | New socket on every render | Always use `getSocket()` singleton |
| `finishGame` called but game keeps playing | `isGameOver` returned true but `finishGame` rejected — missing `await` | All DB writes in `finishGame` must be `await`ed |
| New route not protected | Unauthenticated users can hit the endpoint | Add `requireAuth` middleware in the route file |
| `req.userId` undefined in controller | Forgot `requireAuth` in route, or accessing `req.userId` without TypeScript cast | Use `AuthRequest` type from `middleware/auth.ts`, always add `requireAuth` |
| Lobby not cleared after game starts | `lobbyPlayers.length = 0` skipped — second game starts with old players | `lobbyPlayers.length = 0` is correct and intentional — don't change to `splice` |
| Forgetting `socket.join(gameId)` in rejoinGame | Player reconnects but doesn't receive game broadcasts | Always `socket.join(gameId)` before emitting state back |
| Navigation after game uses wrong path | `/newgame/123` doesn't exist in routes | Check `App.tsx` routes — the default is `/game` |
| `apiFetch` path starts with `/api/...` | Results in `http://localhost:8001/api/api/...` — 404 | `apiFetch` prepends the base URL including `/api`. Pass `/auth/login`, not `/api/auth/login` |

---

## 14. Quick Edit Checklist

Use this during exam time to verify you haven't missed anything.

### Adding a new game:
- [ ] `gameTypes.ts`: Updated `Player` and `GameState` interfaces, removed demo fields (`counter`, `lastAction`)
- [ ] `gameEngine.ts`: Implemented all 5 functions (`createGameState`, `validateAction`, `applyAction`, `isGameOver`, `rankPlayers`)
- [ ] `gameHandlers.ts`: Renamed `takeAction` or added new handlers, updated `registerGameHandlers()`
- [ ] `useGame.ts`: `GameState` interface matches `gameTypes.ts` exactly, actions renamed/added
- [ ] `GamePage.tsx`: Board section replaced, action imports updated from `useGame()`
- [ ] Full manual test: two browser tabs, play through to game over, check MongoDB has a `Game` document

### Adding a new REST endpoint:
- [ ] Handler written in a controller file
- [ ] Route file updated (or new file created)
- [ ] `server.ts` has `app.use('/api/...', routes)` for new route file
- [ ] Protected with `requireAuth` if needed
- [ ] Client calls it with correct path (no `/api` prefix in `apiFetch()`)

### Adding a new socket event:
- [ ] Handler registered in `registerGameHandlers()` (or directly in `socketHandler.ts`)
- [ ] Client `useGame.ts` emits matching event name
- [ ] Client listens for any new server-emitted events in `useEffect`
- [ ] Cleanup: `socket.off('eventName', handler)` in `useEffect` return

### Before submitting:
- [ ] `npm run dev` starts without errors in both terminals
- [ ] Login, signup, play a full game, check leaderboard/history all work
- [ ] MongoDB collections have expected documents (User, Game)
- [ ] No hardcoded user IDs or test-only values left in code

---

## 15. Starting the Dev Environment

```bash
# Terminal 1 — Backend (port 8001)
cd serverv1
npm run dev

# Terminal 2 — Frontend (port 5174)
cd clientv1
npm run dev
```

No `npm install` needed if `node_modules` already exist from a previous run.

### Test socket events from browser console:

```javascript
// Load the socket.io client library and connect:
var s = document.createElement('script');
s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
s.onload = function() {
  var socket = io('http://localhost:8001', {
    auth: { token: localStorage.getItem('token') }
  });
  socket.on('connect', () => console.log('Connected:', socket.id));
  socket.on('lobbyUpdate', d => console.log('Lobby:', d));
  socket.on('gameStateUpdate', d => console.log('State:', d));
  socket.emit('joinLobby');
  window.sock = socket;
};
document.head.appendChild(s);

// Then: sock.emit('startGame'), sock.emit('takeAction', { gameId: '...', action: {} })
```

### Test REST endpoints programmatically:

```bash
cd serverv1
npm run test   # runs test/apiTester.ts — server must be running
```

---

## 16. Mental Model Summary

```
USER ACTION → client emits socket event
           → server validates with gameEngine
           → server updates activeGames Map
           → server broadcasts new state to room
           → all clients receive gameStateUpdate
           → React re-renders with new state

GAME OVER  → isGameOver() returns true
           → finishGame() writes to MongoDB
           → server emits gameOver
           → clients show results screen

REST CALLS → for data that doesn't need real-time (auth, leaderboard, history)
           → always protected with requireAuth middleware
           → client uses apiFetch() which auto-adds Bearer token

KEY RULE   → gameEngine.ts is PURE — no sockets, no DB
           → server is AUTHORITATIVE — client only sends intent
           → getSocket() is a SINGLETON — never create inside a component
```
