# PROJECT MASTER GUIDE
## CS300 PA3 — Real-Time Multiplayer Ludo Game (MERN Stack)
### Fully Updated — Reflects All Applied Fixes

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Full Architecture](#2-full-architecture)
3. [Folder Structure](#3-folder-structure)
4. [File-by-File Deep Dive](#4-file-by-file-deep-dive)
5. [Core Concepts From First Principles](#5-core-concepts-from-first-principles)
6. [Game Logic Deep Dive](#6-game-logic-deep-dive)
7. [Database Design](#7-database-design)
8. [Authentication & Session Management](#8-authentication--session-management)
9. [TypeScript Typing — No-Any Policy](#9-typescript-typing--no-any-policy)
10. [Common Pitfalls and How We Fixed Them](#10-common-pitfalls-and-how-we-fixed-them)
11. [How Every Requirement Is Met](#11-how-every-requirement-is-met)
12. [Final Mental Model](#12-final-mental-model)

---

## 1. High-Level Overview

This project is a **real-time, browser-based multiplayer Ludo game** built as a full-stack web application. Up to 4 players join a shared lobby, then play on a classic 15×15 Ludo board. Everything during the game — dice rolls, token movement, captures, chat — is synchronized in real-time using **Socket.IO**. No polling. No page refreshes.

### How the three layers interact:

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (React)                         │
│  Renders board  │  Displays chat  │  Shows player cards     │
│  Listens to socket events        │  Emits user actions      │
└──────────────────────┬──────────────────────────────────────┘
                       │ Socket.IO (WebSocket)
                       │ REST API (HTTP)
┌──────────────────────▼──────────────────────────────────────┐
│              NODE.JS / EXPRESS SERVER                       │
│  Owns all game state (activeGames Map)                      │
│  Validates moves  │  Runs timers  │  Broadcasts state       │
└──────────────────────┬──────────────────────────────────────┘
                       │ Mongoose (MongoDB driver)
┌──────────────────────▼──────────────────────────────────────┐
│                   MONGODB ATLAS                             │
│  Stores: User accounts │ Game records │ Coin balances       │
└─────────────────────────────────────────────────────────────┘
```

**Key design principle:** The server is the **single source of truth** for all game state. Clients can only *request* actions (roll dice, move token). They never *decide* the outcome.

---

## 2. Full Architecture

### 2.1 REST Request Flow (Authentication & Stats)

```
Browser                         Express Server                  MongoDB
  │                                   │                            │
  │── POST /api/auth/signup ──────────►│                            │
  │                                   │── User.create() ──────────►│
  │                                   │◄─ { _id, username, ... } ──│
  │◄── { token, user } ───────────────│                            │
  │                                   │                            │
  │  [token stored in browser COOKIE] │                            │
  │                                   │                            │
  │── GET /api/game/leaderboard ──────►│                            │
  │  [Authorization: Bearer <token>]  │── protect middleware ──────►│
  │                                   │── User.find().sort() ──────►│
  │◄── { users: [...] } ──────────────│◄─ sorted results ──────────│
```

**Important:** The JWT token is stored in a **browser cookie** (`ludo_token`), NOT `localStorage`. This was a spec requirement. The token is read from the cookie and placed in the `Authorization: Bearer` header by `api.ts` on every request.

### 2.2 Socket.IO Game Flow (Real-Time Events)

```
Player A Browser        Server (socketHandler.ts)       Player B Browser
    │                           │                               │
    │──── connect (auth JWT) ──►│                               │
    │                           │◄───── connect (auth JWT) ─────│
    │                           │                               │
    │──── joinLobby ───────────►│                               │
    │                           │◄──── joinLobby ───────────────│
    │                           │                               │
    │                     lobbyPlayers array updated            │
    │◄── lobbyUpdate(players) ──┤──── lobbyUpdate(players) ────►│
    │                           │                               │
    │──── startGame ───────────►│                               │
    │                     Game record created in MongoDB        │
    │                     initGameState() creates in-memory state│
    │◄── gameStarted(state) ────┤──── gameStarted(state) ───────►│
    │                           │                               │
    │  [navigate to /game/id]   │            [navigate to /game/id]
    │                           │                               │
    │──── rollDice(gameId) ────►│                               │
    │                     server calls rollDice()               │
    │                     state.diceValue = result              │
    │                     startTurnTimer() reset                │
    │◄── diceRolled(state) ─────┤──── diceRolled(state) ────────►│
    │                           │                               │
    │──── moveToken(idx) ───────►│                               │
    │                     validateMove(state, idx)              │
    │                     applyMove(state, idx)                 │
    │                     check capture / finish / game over    │
    │◄── gameStateUpdate(state) ┤── gameStateUpdate(state) ────►│
    │                           │                               │
    │  (if game over)           │                               │
    │                     finishGame(): save to MongoDB         │
    │◄── gameOver(state) ───────┤──── gameOver(state) ──────────►│
```

### 2.3 State Ownership

| State | Owned By | Why |
|---|---|---|
| Token positions, dice value, turn index | Server (`activeGames` Map) | Prevents cheating; single source of truth |
| Chat messages (during game) | Server broadcasts; client caches locally | Real-time with Socket.IO |
| Auth token | Client (browser **cookie** `ludo_token`) | Stateless JWT — server validates on each request |
| User profile, coins, history | MongoDB | Persistence across sessions |
| Board rendering, UI state | React component state | Visual-only, not game-authoritative |

---

## 3. Folder Structure (Detailed)

```
/
├── design/           # Static HTML/CSS reference files — DO NOT SERVE
│                     # These are visual mockups to guide your React UI
│
├── client/
│   ├── package.json  # DELEGATION package — scripts delegate to APP/
│   └── APP/          # The actual React (Vite) application
│       ├── src/
│       │   ├── pages/        # One file per route (/home, /game, etc.)
│       │   ├── components/   # Reusable UI pieces (Navbar)
│       │   ├── context/      # AuthContext — shared login state (uses cookies)
│       │   ├── utils/
│       │   │   ├── socket.ts # Socket.IO singleton (reads token from cookie)
│       │   │   └── api.ts    # Fetch wrapper for REST calls (reads token from cookie)
│       │   ├── App.tsx       # Router setup + protected routes
│       │   ├── main.tsx      # React root render
│       │   └── index.css     # Global styles
│       └── vite.config.ts    # Dev server with proxy: /api → localhost:8000
│
└── server/
    ├── server.ts     # Entry point: HTTP server + Socket.IO bootstrap + MongoDB connect
    ├── app.ts        # Express app: middleware, route mounting, global error handler
    ├── config.env    # Environment variables (never commit with real credentials)
    ├── config.env.example  # Template showing required variable names
    │
    ├── controllers/  # Request handler functions — business logic for REST
    │   ├── authController.ts    # signup, login, getMe
    │   ├── gameController.ts    # getLeaderboard, getHistory
    │   └── profileController.ts # updateProfile
    │
    ├── routes/       # Express Router — maps URL patterns to controllers
    │   ├── authRoutes.ts    # /api/auth/*
    │   ├── gameRoutes.ts    # /api/game/*
    │   └── profileRoutes.ts # /api/profile/*
    │
    ├── middleware/
    │   └── auth.ts   # JWT verification middleware (protect); uses IUser type
    │
    ├── models/       # Mongoose schemas — define DB document structure
    │   ├── User.ts   # User document + password hashing pre-save hook
    │   └── Game.ts   # Game record with players, ranks, coins
    │
    └── utils/        # Pure logic, no Express/DB dependencies
        ├── ludoEngine.ts    # Game rules: movement, captures, win detection, AI
        └── socketHandler.ts # All Socket.IO event wiring; AuthenticatedSocket interface
```

**Why this structure?** Separation of concerns: each folder has a single responsibility. If you need to change how moves are validated, you touch `ludoEngine.ts`. If you need to change how sockets wire up, you touch `socketHandler.ts`. If you need to add a REST endpoint, you add to `controllers/` + `routes/`. Nothing bleeds into unrelated files.

### 3.1 The client/package.json Problem and Fix

The React app lives at `client/APP/`, but graders run `npm install` from `client/`. Without a proper `client/package.json`, installation silently fails. The fix:

```json
{
  "name": "ludo-client-root",
  "scripts": {
    "postinstall": "cd APP && npm install",
    "dev": "cd APP && npm run dev",
    "build": "cd APP && npm run build",
    "preview": "cd APP && npm run preview"
  }
}
```

`postinstall` is a special npm lifecycle hook that runs **automatically after `npm install`** completes. So running `npm install` in `client/` automatically runs `npm install` inside `APP/`. No manual `cd` needed.

---

## 4. File-by-File Deep Dive

### `server/server.ts`
**Purpose:** The entry point. Starts everything.

**What it does (in order):**
1. Loads `.env` variables via `dotenv.config()`
2. Creates an HTTP server wrapping the Express `app`
3. Creates a Socket.IO `Server` on top of the HTTP server (same port!)
4. Calls `setupSocket(io)` to attach all game event listeners
5. Connects to MongoDB — only starts listening on `PORT` after DB connection succeeds

**Why one port for both REST and WebSockets?** Socket.IO works over HTTP — the WebSocket upgrade handshake happens on the same TCP connection. No need for a second server or port.

---

### `server/app.ts`
**Purpose:** Express configuration — middleware, route mounting, error handler.

**Key parts:**
- `cors({ origin: '*' })` — allows the React dev server (port 5173) to call this API
- `express.json()` — parses JSON request bodies
- Route mounting: `/api/auth`, `/api/game`, `/api/profile`
- Global error handler — the signature `(err, req, res, next)` with **four parameters** is how Express recognizes it as an error handler

**Properly typed error handler (no `any`):**
```typescript
import express, { Request, Response, NextFunction } from 'express';

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});
```

The intersection type `Error & { status?: number }` says: "This is an Error object that optionally also has a `status` field." The `_req` and `_next` prefixes signal intentionally unused parameters to TypeScript.

---

### `server/middleware/auth.ts`
**Purpose:** The gatekeeper — protects routes that require login.

**Full flow:**
1. Extracts `token` from `Authorization: Bearer <token>` header
2. Calls `jwt.verify(token, JWT_SECRET)` → throws if expired or tampered
3. Decodes payload → gets `decoded.id` (user's MongoDB `_id`)
4. Looks up `User.findById(decoded.id)` in database
5. Attaches the full user object to `req.user`
6. Calls `next()` — proceeds to the actual controller

**Properly typed (no `any`):**
```typescript
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;  // typed with IUser, not any
}

const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
// decoded.id is string because JwtPayload has index signature
```

`AuthRequest` extends `Request` to add the `user` field. Any controller that uses `protect` middleware should accept `AuthRequest` instead of plain `Request`.

---

### `server/utils/ludoEngine.ts`
**Purpose:** The brain of the game. Pure functions — takes state in, returns new state out. Zero side effects. No Express, no DB, no sockets.

**Key exports:**

| Function | What it does |
|---|---|
| `initGameState(gameId, players)` | Creates a fresh game state with all tokens at home (steps=0) |
| `rollDice()` | Returns a random integer 1–6 |
| `canTokenMove(token, dice)` | Returns true if a token can legally move given the dice value |
| `getValidTokenIndices(player, dice)` | Returns array of token indices the current player can move |
| `applyMove(state, tokenIndex)` | Clones state, moves token, checks capture/finish/game-over, advances turn |
| `autoMove(state)` | Picks best valid token for AI; if no valid moves, just advances turn |
| `getNextPlayerIndex(state)` | Skips finished players when advancing the turn |
| `getCoinReward(rank, totalPlayers)` | Returns coins based on finish position AND player count |

**Why pure functions?** Easy to unit-test in isolation. `socketHandler.ts` calls these and then decides what to emit. Game rules never need to know about network protocol.

**`getCoinReward` signature (CRITICAL — must vary by player count):**
```typescript
export function getCoinReward(rank: number, totalPlayers: number): number {
  const rewardTable: Record<number, Record<number, number>> = {
    4: { 1: 100, 2: 50,  3: 25, 4: 0 },
    3: { 1: 50,  2: 25,  3: 0 },
    2: { 1: 25,  2: 0 },
  };
  return rewardTable[totalPlayers]?.[rank] ?? 0;
}
```

The outer key is `totalPlayers`, the inner key is `rank`. Using `??` (nullish coalescing) returns 0 if the combination doesn't exist.

---

### `server/utils/socketHandler.ts`
**Purpose:** The bridge between network (sockets) and game logic (ludoEngine).

**In-memory state it manages:**
```typescript
const activeGames = new Map<string, GameState>(); // gameId → live game state
const lobbyPlayers: LobbyEntry[] = [];             // players waiting to start
const turnTimers = new Map<string, NodeJS.Timeout>(); // gameId → timer handle
```

**Why `Map` and not an object?** Maps preserve insertion order, have O(1) lookup by key (like objects), but also have `.size`, `.has()`, `.delete()` — cleaner API for key-value storage where you add/remove at runtime.

**`AuthenticatedSocket` interface:**
```typescript
interface AuthenticatedSocket extends Socket {
  userId: string;
}
```

When a socket connects, the server middleware decodes the JWT and attaches `userId` to the socket object. Without this interface, TypeScript would complain that `Socket` has no `userId` property. The interface tells TypeScript: "Our sockets always have `userId` after auth."

Usage:
```typescript
io.use((socket, next) => {
  const token = (socket.handshake.auth as { token?: string }).token || '';
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
  (socket as AuthenticatedSocket).userId = decoded.id as string;
  next();
});

io.on('connection', (socket) => {
  const { userId } = socket as AuthenticatedSocket; // clean cast once
  // use userId throughout without casting
});
```

**Turn timer logic:**
```typescript
function startTurnTimer(gameId: string) {
  clearTurnTimer(gameId); // always cancel previous timer first!
  const timer = setTimeout(() => {
    const state = activeGames.get(gameId);
    if (!state || state.status !== 'playing') return;
    // Auto-roll if needed, then auto-move
    if (!state.diceRolled) {
      state.diceValue = rollDice();
      state.diceRolled = true;
    }
    const newState = autoMove(state);
    activeGames.set(gameId, newState);
    io.to(gameId).emit('gameStateUpdate', { gameState: newState });
    startTurnTimer(gameId); // start timer for next turn
  }, 20000);
  turnTimers.set(gameId, timer);
}
```

`clearTurnTimer` is called before `setTimeout` because if you don't clear it, two timers can exist simultaneously for the same game, causing double-moves.

**`finishGame` with correct coin rewards:**
```typescript
async function finishGame(gameId: string, state: GameState) {
  const totalPlayers = state.players.length; // capture before any changes
  for (const p of state.players) {
    const rank = p.rank ?? state.players.length;
    const coins = getCoinReward(rank, totalPlayers); // pass totalPlayers!
    await User.findByIdAndUpdate(p.userId, { $inc: { coins, total_played: 1 } });
    // ... update game record
  }
}
```

---

### `server/controllers/authController.ts`
**Purpose:** Handles signup, login, and "get current user" REST endpoints.

**Completely `any`-free implementation:**

```typescript
export const signup = async (req: Request, res: Response) => {
  try {
    const { username, password, dob } = req.body as { username: string; password: string; dob: string };
    const user = await User.create({ username, password, dob });
    const token = signToken(user._id.toString());
    res.status(201).json({ token, user });
  } catch (err) {
    const mongoErr = err as { code?: number; message?: string };
    if (mongoErr.code === 11000) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: 'Server error', error: mongoErr.message });
  }
};
```

MongoDB duplicate key errors have `code === 11000`. This is how you detect "username already taken" without querying first.

**No debug `console.log` calls** — the original had `console.log("res is ", res)` which would dump the entire Express response object on every request. Removed.

---

### `server/controllers/gameController.ts`
**Purpose:** Leaderboard and game history REST endpoints.

**History players sorted by rank:**
```typescript
players: game.players
  .slice()  // .slice() creates a copy so we don't mutate the original array
  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
  .map(p => ({ username: p.username, color: p.color, rank: p.rank })),
```

`?? 99` handles the case where a player never finished (rank is null/undefined) — they sort to the bottom.

---

### `server/controllers/profileController.ts`
**Purpose:** Handle profile updates (DOB, password change).

**Password change flow:**
1. Verify `currentPassword` matches stored hash via `user.comparePassword(currentPassword)`
2. Set `user.password = newPassword` — the **pre-save hook** automatically bcrypt-hashes it
3. `user.save()` — triggers the hook

This is why we don't import or call `bcrypt` directly in this controller — the model handles it automatically. Importing `bcrypt` here would be unused code, removed.

---

### `server/models/User.ts`
**Purpose:** Defines what a user document looks like in MongoDB, plus password hashing.

**Schema fields:**
```typescript
username:     String (unique, 2-20 chars)
password:     String (bcrypt hashed automatically via pre-save hook)
dob:          Date
coins:        Number (default: 100)
total_played: Number (default: 0)
createdAt:    Date
```

**Pre-save hook:**
```typescript
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); // only hash if password changed
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
```

`this.isModified('password')` is important — without it, updating the DOB would re-hash an already-hashed password, making it impossible to login afterwards.

**`IUser` interface exported:**
```typescript
export interface IUser {
  _id: Types.ObjectId;
  username: string;
  password: string;
  dob: Date;
  coins: number;
  total_played: number;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}
```

This interface is used in `auth.ts` middleware to type `req.user` properly.

---

### `server/models/Game.ts`
**Purpose:** Persists game records for history and leaderboard queries.

**Schema:**
```typescript
total_players: Number
players: [{
  userId:      ObjectId (references User)
  username:    String
  color:       'red' | 'blue' | 'green' | 'yellow'
  rank:        Number (1=winner, null during game)
  coinsEarned: Number
}]
status:     'waiting' | 'playing' | 'finished'
createdAt:  Date (auto)
finishedAt: Date (set when game ends)
```

---

### `client/APP/src/context/AuthContext.tsx`
**Purpose:** React Context that makes login state available to every component without prop drilling. Uses **browser cookies** (not `localStorage`) per spec requirement.

**The three cookie helper functions:**
```typescript
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const entry = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.split('=')[1]) : null;
}

function removeCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}
```

**Why `encodeURIComponent`?** Cookie values cannot contain spaces, commas, semicolons, or `=` signs. The JWT string contains `.` (dots) which are fine, but the user JSON string contains `{`, `}`, `"`, `:` which are not. Encoding makes it safe.

**Why `SameSite=Lax`?** Prevents CSRF attacks — the cookie is only sent on same-site requests and top-level cross-site navigations (like following a link), not on cross-site POST requests or AJAX from other origins.

**Why `path=/`?** Without `path=/`, the cookie is only sent for the exact path it was created on. With `path=/`, it's available across all routes.

**Cookie names used:** `ludo_token` (the JWT) and `ludo_user` (the serialized user object).

**How persistence works:**
```typescript
useEffect(() => {
  const savedToken = getCookie('ludo_token');
  const savedUser = getCookie('ludo_user');
  if (savedToken && savedUser) {
    try {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } catch {
      removeCookie('ludo_token');
      removeCookie('ludo_user');
    }
  }
  setIsLoading(false);
}, []);
```

On mount, reads cookies. If both exist, restores session. The `try/catch` handles corrupted cookie data gracefully.

**`updateUser` function:**
```typescript
const updateUser = useCallback((updatedUser: UserType) => {
  setUser(updatedUser);
  setCookie('ludo_user', JSON.stringify(updatedUser));
}, []);
```

Called after profile updates or game-over to refresh coin balance in Navbar without requiring a full logout/login.

---

### `client/APP/src/utils/api.ts`
**Purpose:** A fetch wrapper that automatically attaches the JWT from cookie to all requests.

**Token extraction from cookie:**
```typescript
function getTokenFromCookie(): string {
  const entry = document.cookie.split('; ').find(row => row.startsWith('ludo_token='));
  return entry ? decodeURIComponent(entry.split('=')[1]) : '';
}
```

This is duplicated from `AuthContext.tsx` intentionally — `api.ts` and `socket.ts` must be usable before the React context mounts, so they can't call `useAuth()`. They read the cookie directly.

**Every fetch call includes:**
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getTokenFromCookie()}`,
}
```

This is how JWT-based APIs authenticate requests — the token travels in the HTTP header, not in the URL or body.

---

### `client/APP/src/utils/socket.ts`
**Purpose:** Socket.IO singleton — guarantees only ONE socket connection exists per browser tab.

```typescript
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    const token = getTokenFromCookie();
    socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
```

**Why a singleton matters:** If you call `io(...)` inside a React component, every re-render creates a new connection. With 10 re-renders, you'd have 10 sockets each receiving and emitting events. With the singleton, one socket exists per tab for the entire session.

**The socket sends its JWT via `auth: { token }`** — this is the Socket.IO auth mechanism. On the server, `socket.handshake.auth.token` contains this value, which the server middleware decodes.

---

### `client/APP/src/pages/Game.tsx`
**Purpose:** The most complex component — renders the board and handles all game interactions.

**State it manages:**
- `gameState` — the authoritative state received from server via socket events
- `chatMessages` — accumulated chat messages (local cache)
- `diceHistory` — last N dice values for display
- `selectedToken` — which token the current player has clicked
- `timer` — visual countdown (mirrors server-side 20s timer)
- `showVictory` — whether to show the end-game overlay

**Key socket event handlers:**

```typescript
// When server confirms dice roll
socket.on('diceRolled', ({ gameState: gs }) => {
  setGameState(gs);
});

// When server broadcasts updated board state
socket.on('gameStateUpdate', ({ gameState: gs }) => {
  setGameState(gs);
});

// Chat deduplication fix
socket.on('chatMessage', (msg: ChatMsg) => {
  if (msg.userId === user?._id) return; // skip own — already added locally
  setChatMessages(prev => [...prev, msg]);
});

// Coin refresh fix: re-fetch user from server on game over
socket.on('gameOver', ({ gameState: gs }) => {
  setGameState(gs);
  setShowVictory(true);
  authApi.me()
    .then(data => updateUser((data as { user: Parameters<typeof updateUser>[0] }).user))
    .catch(console.error);
});
```

**Why call `authApi.me()` on game over?** The server updates `coins` in MongoDB when the game ends. The React context only knows the user's balance at login time. Without refreshing, the Navbar still shows the old coin count. Calling `/api/auth/me` fetches the updated user from DB and syncs the context.

**Typed location state (no `any`):**
```typescript
const locationState = location.state as { gameState?: GameState } | null;
const [gameState, setGameState] = useState<GameState | null>(locationState?.gameState ?? null);
```

React Router's `location.state` is typed as `unknown`. Casting to a union with `null` and using optional chaining `?.gameState` safely handles both cases (navigated with state vs. direct URL access).

---

### `client/APP/src/pages/Lobby.tsx`
**Purpose:** Waiting room before the game starts.

**Typed socket events (no `any`):**
```typescript
socket.on('gameStarted', ({ gameState }: { gameState: { gameId: string } }) => {
  navigate(`/newgame/${gameState.gameId}`, { state: { gameState } });
});
```

The type annotation `{ gameState: { gameId: string } }` is inlined as the destructuring parameter type. This tells TypeScript exactly what shape the server sends.

---

## 5. Core Concepts From First Principles

### 5.1 What is a WebSocket?

HTTP is **request-response**: browser asks, server answers, connection closes. It's half-duplex — only one direction at a time.

WebSocket is **persistent and bidirectional**: browser and server open one connection that stays open indefinitely. Either side can send data to the other at any time, without the other having to ask. This is what makes real-time games possible.

Socket.IO wraps WebSockets with fallbacks (long-polling) and adds rooms, reconnection, and event namespaces on top.

### 5.2 JWT (JSON Web Token) Explained

A JWT looks like this:
```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjY3YWJjIn0.XYZ...
```

It's three base64-encoded parts joined by dots:
1. **Header:** `{ "alg": "HS256" }` — which algorithm to use
2. **Payload:** `{ "id": "67abc", "iat": 1234, "exp": 9999 }` — the data
3. **Signature:** `HMACSHA256(header + "." + payload, SECRET_KEY)` — the proof

**The key insight:** Anyone can *decode* the payload (it's just base64). Nobody can *forge* it without the `SECRET_KEY`. So the server can verify it came from itself.

```typescript
// Creating a token on login:
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Verifying on protected routes:
const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
// decoded.id is the user's _id — use it to look up from DB
```

If `jwt.verify` throws, the token is expired, tampered, or invalid. The middleware catches this and returns 401.

### 5.3 React Context API

Without Context, passing data through components looks like this (prop drilling):
```
App (has user) → Router → Layout → Sidebar → Navbar → UserAvatar (needs user)
```

Every intermediate component must pass `user` as a prop even if it doesn't use it.

With Context:
```typescript
// Provider wraps the app:
<AuthContext.Provider value={{ user, token, login, logout }}>
  <RouterProvider router={router} />
</AuthContext.Provider>

// Any component, no matter how deep, can access it:
function UserAvatar() {
  const { user } = useAuth(); // directly from context
}
```

The Context is like a broadcast channel — the Provider is the broadcaster, any component using `useContext` is a subscriber.

### 5.4 React Router v6 Protected Routes

```typescript
function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return !user ? <Outlet /> : <Navigate to="/home" replace />;
}
```

`<Outlet />` renders the matched child route. `<Navigate replace />` redirects without adding a history entry (back button won't re-trigger the redirect).

The `isLoading` check is critical — without it, on initial load the context hasn't read the cookie yet so `user` is null, and every protected route would redirect to login before the session is restored.

### 5.5 The `document.cookie` API

Unlike `localStorage` (simple key-value), `document.cookie` is a semicolon-delimited string of `name=value` pairs:
```
"ludo_token=eyJ...; ludo_user=%7B%22username%22..."
```

Reading requires string parsing:
```typescript
document.cookie.split('; ').find(row => row.startsWith('ludo_token='))?.split('=')[1]
```

Writing adds/updates one cookie at a time:
```typescript
document.cookie = 'ludo_token=eyJ...; path=/; max-age=604800; SameSite=Lax';
```

Deleting sets `max-age=0`:
```typescript
document.cookie = 'ludo_token=; path=/; max-age=0; SameSite=Lax';
```

**`max-age` vs `expires`:** `max-age` is in seconds from now; `expires` is an absolute date string. `max-age` is preferred because it's relative (no clock skew issues). 7 days = `60 * 60 * 24 * 7 = 604800` seconds.

### 5.6 bcrypt Password Hashing

Plaintext password storage is catastrophically bad — if the database leaks, every user's password is exposed.

bcrypt does:
1. Generates a random **salt** (e.g., `$2a$12$<22-char-salt>`)
2. Hashes `salt + password` thousands of times (cost factor 12 = 2^12 = 4096 iterations)
3. Embeds the salt in the result

```typescript
// Hash once (on signup/password change):
const hash = await bcrypt.hash('mypassword123', 12);
// Result: "$2a$12$Vd0oR8t9xQ6uP7mQ1kL3Ne..."

// Verify (on login):
const match = await bcrypt.compare('mypassword123', hash); // true
const match2 = await bcrypt.compare('wrongpassword', hash); // false
```

**Why bcrypt over SHA256?** SHA256 is fast — attackers can hash billions of guesses per second. bcrypt is intentionally slow (0.25ms/hash at cost=12). Brute-forcing becomes infeasible.

### 5.7 Mongoose Pre-Save Hooks

```typescript
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
```

The `pre('save', ...)` hook runs before any `.save()` call. `this` refers to the document being saved. `isModified('password')` returns true only if the password field was changed since the document was last saved — prevents double-hashing when you update unrelated fields like `dob`.

### 5.8 TypeScript Generics and Intersection Types

**Intersection types** combine multiple types:
```typescript
type ErrorWithStatus = Error & { status?: number };
// This type has all fields of Error PLUS an optional status field
```

**Generic types** let you write one function/interface that works with different types:
```typescript
const activeGames = new Map<string, GameState>();
// string = key type, GameState = value type
// .get() returns GameState | undefined
// .set() requires (string, GameState)
```

**`Record<K, V>`** is shorthand for `{ [key: K]: V }`:
```typescript
const rewardTable: Record<number, Record<number, number>> = {
  4: { 1: 100, 2: 50 },
  3: { 1: 50, 2: 25 },
};
```

---

## 6. Game Logic Deep Dive

### 6.1 Board Representation

The board is represented as a **linear step count** per token, not as (row, col) coordinates.

```
steps = 0          → Token is in the home yard (not yet on board)
steps = 1 to 51    → Token is on the main outer track
steps = 52 to 56   → Token is in the home stretch (colored path to center)
steps = 57         → Token has finished (in the center)
```

**Why steps instead of coordinates?** Movement is just `token.steps += dice`. The coordinate mapping (steps → row/col on the board) only happens in the frontend for rendering. This clean separation means the engine never needs to know about board layout.

### 6.2 Absolute Square System

Different colors start at different points on the outer track. `COLOR_OFFSETS` maps each color's "step 1" to an absolute square on the 52-square outer loop:

```typescript
const COLOR_OFFSETS: Record<string, number> = {
  red: 0, blue: 13, yellow: 26, green: 39,
};
```

```
Red:    offset 0  → step 1 = absolute square 0  (TRACK[0]  = [6,1])
Blue:   offset 13 → step 1 = absolute square 13 (TRACK[13] = [1,8])
Yellow: offset 26 → step 1 = absolute square 26 (TRACK[26] = [8,13])
Green:  offset 39 → step 1 = absolute square 39 (TRACK[39] = [13,6])
```

Converting: `getAbsSquare(steps, color) = (steps - 1 + offset) % 52`

**Why absolute squares?** To detect captures. Two tokens are on the same square if their absolute squares are equal. Without this conversion, a red token at step 3 and a blue token at step 3 would appear to overlap but they're actually 13 squares apart on the board.

### 6.3 Movement Rules

```typescript
function canTokenMove(token: Token, dice: number): boolean {
  if (token.steps === 57) return false;      // already finished
  if (token.steps === 0) return dice === 6;  // need 6 to leave yard
  const newSteps = token.steps + dice;
  if (newSteps > 57) return false;           // would overshoot (exact required)
  return true;
}
```

**Key rule:** A token cannot overshoot step 57. If a token is at step 55 and rolls 4 (55+4=59>57), it cannot move. The roll is wasted. This forces exact entry into the finish.

### 6.4 Captures

```typescript
// In applyMove(), after moving the token:
if (token.steps >= 1 && token.steps <= 51) {          // only on main track
  const myAbs = getAbsSquare(token.steps, player.color);
  if (!SAFE_SQUARES.has(myAbs)) {                     // not on a safe square
    for (const opponent of newState.players) {
      if (opponent.color === player.color) continue;  // skip yourself
      for (const oppToken of opponent.tokens) {
        if (oppToken.steps >= 1 && oppToken.steps <= 51) { // on main track
          const oppAbs = getAbsSquare(oppToken.steps, opponent.color);
          if (oppAbs === myAbs) {                     // same absolute square!
            oppToken.steps = 0;                       // send back to yard
          }
        }
      }
    }
  }
}
```

**Safe squares** (`SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47])`) — immune to capture. These are the start squares for each color plus the starred squares.

**Why `oppToken.steps <= 51` check?** Tokens in the home stretch (52–56) share the same step numbers across colors but are on completely different board locations. Without this check, a red token at step 52 and a blue token at step 52 would (incorrectly) appear to be on the same square.

### 6.5 Win Conditions

**Individual player finishes:** When ALL 4 of their tokens reach step 57, they're assigned a rank. First to finish = rank 1.

**Game ends:** When `activePlayers.length <= 1` (only one player still has tokens not at 57). The last remaining player gets the next rank automatically — they don't need to finish all tokens.

**Coin awards (varies by player count):**
| Players | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| 4 | 100 | 50 | 25 | 0 |
| 3 | 50 | 25 | 0 | — |
| 2 | 25 | 0 | — | — |

### 6.6 Turn Management

```typescript
// In applyMove(), at the end:
const rolledSix = newState.diceValue === 6;
const extraTurn = rolledSix && newState.consecutiveSixes < 3;

if (!extraTurn && newState.status === 'playing') {
  newState.currentPlayerIndex = getNextPlayerIndex(newState);
  newState.consecutiveSixes = 0;
} else if (rolledSix) {
  newState.consecutiveSixes++;
}
```

- Rolling a 6 → `extraTurn = true` → same player goes again
- Three consecutive 6s → extra turn denied (anti-abuse rule)
- `getNextPlayerIndex` skips any player whose all tokens are at step 57

### 6.7 AI Takeover on Disconnect

```typescript
socket.on('disconnect', () => {
  const { userId } = socket as AuthenticatedSocket;
  for (const [gameId, state] of activeGames) {
    const player = state.players.find(p => p.userId === userId);
    if (player) {
      player.isAI = true;
      player.isConnected = false;
      io.to(gameId).emit('gameStateUpdate', { gameState: state });
    }
  }
});
```

When `isAI=true`, the turn timer calls `autoMove()` instead of waiting for the player. When the player reconnects (`rejoinGame` event), `isAI` is set back to `false` and control is restored.

---

## 7. Database Design

### 7.1 User Document
```
{
  _id:          ObjectId (auto-generated, used as userId throughout the app)
  username:     "alice"           (unique index enforced by MongoDB)
  password:     "$2a$12$..."      (bcrypt hash — NEVER plaintext)
  dob:          ISODate("1995-06-15")
  coins:        150               (starts at 100, modified by game results)
  total_played: 3                 (atomically incremented when any game finishes)
  createdAt:    ISODate(...)
}
```

### 7.2 Game Document
```
{
  _id:           ObjectId (used as gameId in sockets and URL)
  total_players: 3
  players: [
    { userId: ObjectId, username: "alice", color: "red",   rank: 1, coinsEarned: 50 },
    { userId: ObjectId, username: "bob",   color: "blue",  rank: 2, coinsEarned: 25 },
    { userId: ObjectId, username: "carol", color: "green", rank: 3, coinsEarned: 0  }
  ]
  status:      "finished"          ('waiting' → 'playing' → 'finished')
  createdAt:   ISODate(...)
  finishedAt:  ISODate(...)
}
```

### 7.3 Why Two Separate Collections?

Users and Games are separate because:
- A user exists independently of any game
- A game has multiple users, and a user participates in multiple games (many-to-many relationship)
- Game history is queried by finding games where `players.userId` matches the current user

MongoDB doesn't have JOINs like SQL, but Mongoose's `populate()` can dereference ObjectId references. However, since we embed username and color directly in the game document, we avoid the need to populate on history queries.

### 7.4 Atomic Coin Update

```typescript
await User.findByIdAndUpdate(p.userId, {
  $inc: { coins: coinsEarned, total_played: 1 }
});
```

`$inc` is a MongoDB atomic operation — it adds to the current value. This prevents a race condition:

```
Without $inc:
  Thread A: read coins=100, add 50, write 150
  Thread B: read coins=100, add 25, write 125  ← overwrites A's update!
  Result: 125 (wrong)

With $inc:
  Thread A: $inc: { coins: 50 }  (atomic read-modify-write at DB level)
  Thread B: $inc: { coins: 25 }  (atomic)
  Result: 175 (correct)
```

### 7.5 Leaderboard Query

```typescript
User.find({})
  .sort({ coins: -1, total_played: 1 })
  .limit(50)
  .select('username coins total_played createdAt')
```

- Primary sort: `coins: -1` → highest coins first
- Tiebreaker: `total_played: 1` → fewer games = higher rank (more efficient earner)
- `.select()` returns only needed fields, not the password hash

---

## 8. Authentication & Session Management

### 8.1 The Full Auth Lifecycle

```
SIGNUP:
  1. Client sends { username, password, dob }
  2. Server creates User in MongoDB (pre-save hook hashes password)
  3. Server calls jwt.sign({ id: user._id }, SECRET, { expiresIn: '7d' })
  4. Server returns { token, user }
  5. Client: setCookie('ludo_token', token) + setCookie('ludo_user', JSON.stringify(user))
  6. Client: setUser(user) + setToken(token) in React context

LOGIN:
  1. Client sends { username, password }
  2. Server finds User by username
  3. Server calls user.comparePassword(password) → bcrypt.compare()
  4. If match, signs new JWT and returns { token, user }
  5. Client: same as step 5-6 above

PROTECTED REQUEST:
  1. Client reads ludo_token from cookie
  2. Client sets Authorization: Bearer <token> header
  3. Server middleware: jwt.verify(token, SECRET) → decodes { id }
  4. Server: User.findById(id) → attaches to req.user
  5. Controller proceeds with req.user available

LOGOUT:
  1. Client: removeCookie('ludo_token') + removeCookie('ludo_user')
  2. Client: setUser(null) + setToken(null) in React context
  3. Router detects user=null → redirects to /login
  (No server call needed — JWT is stateless; it just expires on its own)

PAGE REFRESH:
  1. React mounts → AuthContext useEffect runs
  2. getCookie('ludo_token') + getCookie('ludo_user') → both found
  3. setUser(JSON.parse(savedUser)) + setToken(savedToken)
  4. isLoading = false → ProtectedRoute renders children normally
```

### 8.2 Why Cookies Over localStorage?

| | localStorage | Cookie |
|---|---|---|
| Spec requirement | No | **Yes** |
| XSS accessible | Yes (vulnerable) | Yes (without HttpOnly) |
| CSRF protection | N/A | `SameSite=Lax` |
| Expiry control | Manual | `max-age` attribute |
| Size limit | ~5MB | ~4KB |
| Available in SW | Yes | No |

The assignment spec explicitly required browser cookies. Our implementation uses `document.cookie` with `SameSite=Lax` and `max-age=604800` (7 days, matching JWT expiry).

**Note on HttpOnly:** True HttpOnly cookies (set by the server via `Set-Cookie` header with the `HttpOnly` flag) cannot be read by JavaScript at all — they're sent automatically by the browser. Our implementation uses client-side `document.cookie` instead, which is JavaScript-accessible. The spec's "browser cookies" requirement is met either way; client-side cookies are simpler to implement without backend session management changes.

### 8.3 JWT Secret and Security

```
config.env:
  JWT_SECRET=some_long_random_string_here
  JWT_EXPIRES_IN=7d
```

The `JWT_SECRET` should be a long random string (32+ characters). Anyone who knows this secret can forge tokens. It must never be committed to git — hence `config.env.example` contains only placeholder values, and `config.env` is gitignored.

---

## 9. TypeScript Typing — No-Any Policy

### 9.1 Why `any` is Banned

Using `any` turns off type checking for that variable. It defeats the purpose of TypeScript — you lose:
- Autocomplete
- Compile-time error detection
- Documentation through types

The assignment spec deducts points for `any` usage. Every `any` in the original codebase was replaced.

### 9.2 Common Replacements

**Catch blocks:**
```typescript
// Before:
} catch (err: any) { res.status(500).json({ message: err.message }); }

// After:
} catch (err) {
  const message = err instanceof Error ? err.message : 'Server error';
  res.status(500).json({ message });
}
```

`instanceof Error` is the correct TypeScript way to narrow a caught value. In TypeScript 4+, `catch` binds `err` as `unknown`, not `any` — you must narrow it.

**JWT decode:**
```typescript
// Before:
const decoded: any = jwt.verify(token, secret);

// After:
const decoded = jwt.verify(token, secret) as JwtPayload;
// JwtPayload from 'jsonwebtoken' has: iss, sub, aud, exp, iat, jti + index signature
```

**Socket with custom properties:**
```typescript
// Before:
(socket as any).userId = decoded.id;

// After:
interface AuthenticatedSocket extends Socket {
  userId: string;
}
(socket as AuthenticatedSocket).userId = decoded.id as string;
```

**Error handler in Express:**
```typescript
// Before:
app.use((err: any, req: any, res: any, next: any) => { ... });

// After:
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => { ... });
```

**MongoDB error codes:**
```typescript
// Before:
} catch (err: any) { if (err.code === 11000) { ... } }

// After:
} catch (err) {
  const mongoErr = err as { code?: number; message?: string };
  if (mongoErr.code === 11000) { ... }
}
```

**React Router location state:**
```typescript
// Before:
const state = location.state as any;

// After:
const locationState = location.state as { gameState?: GameState } | null;
```

### 9.3 Key TypeScript Patterns Used

**Optional chaining `?.`:**
```typescript
user?.coins  // undefined if user is null, user.coins otherwise
```

**Nullish coalescing `??`:**
```typescript
user?.coins ?? 0  // 0 if coins is null or undefined (not 0 or '')
```

**Non-null assertion `!`:** (use sparingly)
```typescript
process.env.JWT_SECRET!  // tells TS: "I know this isn't undefined"
```

**Type narrowing with `instanceof`:**
```typescript
if (err instanceof Error) {
  console.log(err.message); // TypeScript knows err.message exists here
}
```

**Intersection types:**
```typescript
type ErrorWithStatus = Error & { status?: number };
// Can be used anywhere Error is expected, plus has .status
```

---

## 10. Common Pitfalls and How We Fixed Them

### Pitfall 1: Multiple Socket Connections
```typescript
// WRONG — creates new socket on every render:
function Game() {
  const socket = io('http://localhost:8000'); // new connection each render!
}

// RIGHT — use the singleton:
function Game() {
  const socket = getSocket(); // same socket instance always
}
```

### Pitfall 2: Generating Dice on the Client
```typescript
// WRONG — client can always send 6:
socket.emit('rollDice', { gameId, value: 6 });

// RIGHT — server generates:
socket.on('rollDice', ({ gameId }) => {
  state.diceValue = rollDice(); // server decides
  io.to(gameId).emit('diceRolled', { gameState: state });
});
```

### Pitfall 3: Chat Duplication
```typescript
// WRONG — message appears twice for sender:
socket.on('chatMessage', msg => setChatMessages(prev => [...prev, msg]));
// (already added locally when user hit Send)

// RIGHT — skip own messages from server broadcast:
socket.on('chatMessage', msg => {
  if (msg.userId === user?._id) return;
  setChatMessages(prev => [...prev, msg]);
});
```

### Pitfall 4: Hardcoded 4-Player Coin Rewards
```typescript
// WRONG — always awards 4-player amounts:
function getCoinReward(rank: number): number {
  return { 1: 100, 2: 50, 3: 25, 4: 0 }[rank] ?? 0;
}

// RIGHT — varies by actual player count:
function getCoinReward(rank: number, totalPlayers: number): number {
  const table = { 4: { 1: 100, 2: 50, 3: 25, 4: 0 },
                  3: { 1: 50, 2: 25, 3: 0 },
                  2: { 1: 25, 2: 0 } };
  return table[totalPlayers]?.[rank] ?? 0;
}
```

### Pitfall 5: Stale Coin Balance After Game
```typescript
// WRONG — coins in Navbar never update after game:
// (AuthContext still has the pre-game coin balance)

// RIGHT — refresh user from server on game over:
socket.on('gameOver', ({ gameState: gs }) => {
  setGameState(gs);
  setShowVictory(true);
  authApi.me().then(data => updateUser(data.user)).catch(console.error);
});
```

### Pitfall 6: Not Cleaning Up Socket Listeners
```typescript
// WRONG — listeners accumulate on every re-mount:
useEffect(() => {
  socket.on('gameStateUpdate', handler);
}); // no cleanup!

// RIGHT:
useEffect(() => {
  socket.on('gameStateUpdate', handler);
  return () => {
    socket.off('gameStateUpdate', handler); // cleanup on unmount
  };
}, []);
```

### Pitfall 7: Captures in Home Stretch
```typescript
// WRONG — can capture inside home stretch (steps 52-56):
if (oppAbs === myAbs) { oppToken.steps = 0; } // no range check!

// RIGHT — only capture on main track (steps 1-51):
if (oppToken.steps >= 1 && oppToken.steps <= 51) {
  const oppAbs = getAbsSquare(oppToken.steps, opponent.color);
  if (oppAbs === myAbs) { oppToken.steps = 0; }
}
```

### Pitfall 8: Overshoot Not Checked
```typescript
// WRONG — token can reach step 60, 65, never finishes:
token.steps += dice;

// RIGHT — validate first:
if (token.steps + dice <= 57) { token.steps += dice; }
```

### Pitfall 9: Missing `config.env.example`
The spec deducts 5 points for missing this file. The file must contain placeholder values (not real credentials) so graders know what variables to set:
```
PORT=8000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ludo
JWT_SECRET=your_long_random_secret_key_here
JWT_EXPIRES_IN=7d
```

### Pitfall 10: Debug Console.logs in Production Code
```typescript
// WRONG — logs entire Express req/res objects:
console.log("req is", req);
console.log("res is", res);

// RIGHT — remove all debug logs before submission
// (keeps console clean; doesn't expose internal data)
```

---

## 11. How Every Requirement Is Met

### Frontend Requirements

| Requirement | Implementation | File |
|---|---|---|
| React functional components | All components use `function` keyword | All pages |
| useState / useEffect | State and side effects throughout | Game.tsx, Leaderboard.tsx, etc. |
| useContext for auth state | AuthContext wraps entire app | AuthContext.tsx, App.tsx |
| React Router, no window.location | `useNavigate()` and `<Link>` everywhere | All pages |
| No page reloads during gameplay | Socket events call `setGameState()` | Game.tsx |
| Form validation client-side | Passwords match, length, dob required | Login.tsx, Signup.tsx |
| Styling from provided CSS | index.css adapted from design/styles.css | index.css |
| Socket.IO client integration | Singleton connects to server with JWT | utils/socket.ts |
| Token storage in browser cookies | `document.cookie` with `max-age`, `SameSite=Lax` | AuthContext.tsx |
| No `any` types | All replaced with proper interfaces | All files |

### Backend Requirements

| Requirement | Implementation | File |
|---|---|---|
| Socket.IO for all real-time events | All game actions via socket, zero polling | socketHandler.ts |
| Server-side game logic only | ludoEngine.ts has all rules | ludoEngine.ts |
| Server-side dice generation | `rollDice()` called on server only | socketHandler.ts |
| AI auto-play for disconnected players | `disconnect` → `isAI=true`; timer calls `autoMove` | socketHandler.ts |
| 20-second auto-roll timer (server-side) | `startTurnTimer()` with `setTimeout(20000)` | socketHandler.ts |
| Game results persisted to MongoDB | `finishGame()` updates User coins, saves Game | socketHandler.ts |
| config.env.example file | Created with all required placeholder values | server/config.env.example |

### Database Requirements

| Requirement | Implementation | File |
|---|---|---|
| User schema: all required fields | username, password, dob, coins=100, total_played | models/User.ts |
| Game schema: all required fields | total_players, players[], status, timestamps | models/Game.ts |
| History endpoint: games by user | Queries games by userId, status=finished | controllers/gameController.ts |
| Leaderboard sorted by coins + tiebreaker | `.sort({ coins: -1, total_played: 1 })` | controllers/gameController.ts |
| Atomic coin updates | `$inc` operator prevents race conditions | socketHandler.ts |

### REST API Endpoints

| Method | Route | Auth | Handler |
|---|---|---|---|
| POST | `/api/auth/signup` | None | `signup` |
| POST | `/api/auth/login` | None | `login` |
| GET | `/api/auth/me` | `protect` | `getMe` |
| GET | `/api/game/leaderboard` | `protect` | `getLeaderboard` |
| GET | `/api/game/history` | `protect` | `getHistory` |
| PUT | `/api/profile/update` | `protect` | `updateProfile` |

### Socket.IO Events

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `joinLobby` | — |
| Client → Server | `leaveLobby` | — |
| Client → Server | `startGame` | — |
| Client → Server | `rollDice` | `{ gameId }` |
| Client → Server | `moveToken` | `{ gameId, tokenIndex }` |
| Client → Server | `rejoinGame` | `{ gameId }` |
| Client → Server | `sendMessage` | `{ gameId, message }` |
| Server → Client | `lobbyUpdate` | `{ players }` |
| Server → Client | `gameStarted` | `{ gameState }` |
| Server → Client | `diceRolled` | `{ gameState }` |
| Server → Client | `gameStateUpdate` | `{ gameState }` |
| Server → Client | `gameOver` | `{ gameState }` |
| Server → Client | `chatMessage` | `{ userId, username, message, timestamp }` |
| Server → Client | `error` | `{ message }` |

---

## 12. Final Mental Model

**Think of the server as a casino dealer:**

1. Players sit at the table (join lobby via socket)
2. When everyone is ready, the dealer starts the game (server creates in-memory game state)
3. Each turn, the player says "deal" (emit `rollDice`) — the **dealer** rolls the dice (server calls `rollDice()`), not the player
4. The player says "move token 2" — the **dealer** checks if it's legal (`canTokenMove`), then moves it (`applyMove`)
5. All other players watch the dealer's board update (server broadcasts `gameStateUpdate` to all in the room)
6. Nobody has a secret board at home — there is only ONE board, held by the dealer (server's `activeGames` Map)
7. When the game ends, the dealer pays out chips (server updates MongoDB with coin awards via `$inc`) and records the session in the Game document

**The React frontend is just a window** into whatever state the server currently holds. It renders what the server tells it to render. It can request actions, but the server decides if they're valid and what the outcome is.

This is why:
- **Cheating is impossible** — client never decides outcomes (server generates dice, server validates moves)
- **All players always see the same board** — single source of truth in server memory
- **Disconnecting and reconnecting works** — state is on server, not in the browser
- **The 20-second timer is enforced without trusting the browser** — server holds the `setTimeout`
- **AI takeover is seamless** — setting `isAI=true` on the player object is enough; the timer loop handles the rest

---

## Appendix A: Environment Setup

```bash
# Backend
cd server
cp config.env.example config.env   # fill in your MongoDB URI and JWT_SECRET
npm install
npm run dev                         # starts on port 8000

# Frontend (option 1 — from client/ root)
cd client
npm install                         # postinstall hook runs npm install in APP/ automatically
npm run dev                         # starts on port 5173

# Frontend (option 2 — direct)
cd client/APP
npm install
npm run dev
```

**Required environment variables (`server/config.env`):**
```
PORT=8000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ludo
JWT_SECRET=<any long random string, 32+ chars>
JWT_EXPIRES_IN=7d
```

**Vite proxy** (`client/APP/vite.config.ts`) makes all `/api` calls in development route to `http://localhost:8000`. This means you can write `fetch('/api/auth/login')` in React without hardcoding the server URL. In production, you'd configure your reverse proxy (nginx) the same way.

---

## Appendix B: Applied Fixes Summary

| # | Issue | Fix | Files Changed |
|---|---|---|---|
| 1 | `getCoinReward` always used 4-player table | Added `totalPlayers` parameter; nested reward table | `ludoEngine.ts`, `socketHandler.ts` |
| 2 | Chat messages doubled for sender | Skip `chatMessage` event if `msg.userId === user._id` | `Game.tsx` |
| 3 | Coin balance stale after game over | Call `authApi.me()` + `updateUser()` on `gameOver` event | `Game.tsx` |
| 4 | Missing `config.env.example` | Created file with placeholder values | `server/config.env.example` |
| 5 | Debug `console.log` in authController | Removed all debug logs | `authController.ts` |
| 6 | `client/npm install` fails | Added delegation scripts with `postinstall` hook | `client/package.json` |
| 7 | `any` types throughout server | `JwtPayload`, `IUser`, `AuthenticatedSocket`, `Error & {status?}` | `auth.ts`, `socketHandler.ts`, `app.ts`, `authController.ts`, `gameController.ts`, `profileController.ts` |
| 8 | `any` types throughout client | Typed interfaces, `instanceof Error`, typed location state | `AuthContext.tsx`, `api.ts`, `socket.ts`, `Game.tsx`, `Lobby.tsx`, `Login.tsx`, `Signup.tsx`, `UpdateProfile.tsx` |
| 9 | `localStorage` in AuthContext/api/socket | Replaced with `document.cookie` helpers | `AuthContext.tsx`, `api.ts`, `socket.ts` |
| 10 | `YARD_SLOTS` dead code constant | Removed unused constant | `Game.tsx` |
| 11 | Unused imports | Removed `bcrypt` from profileController, `mongoose` from gameController | `profileController.ts`, `gameController.ts` |
