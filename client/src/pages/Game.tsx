import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../utils/socket';
import { authApi } from '../utils/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Token { id: number; steps: number; }
interface Player { userId: string; username: string; color: Color; tokens: Token[]; rank: number | null; isConnected: boolean; isAI: boolean; }
interface LogEntry { time: string; color: string; text: string; type: string; }
interface GameState { gameId: string; players: Player[]; currentPlayerIndex: number; diceValue: number | null; diceRolled: boolean; status: string; consecutiveSixes: number; rankings: string[]; log: LogEntry[]; turnCount: number; }
interface ChatMsg { username: string; color: string; message: string; time: string; userId: string; }
type Color = 'red' | 'blue' | 'green' | 'yellow';

// ── Board coordinate mapping ──────────────────────────────────────────────────
const COLOR_OFFSETS: Record<Color, number> = { red: 0, blue: 13, yellow: 26, green: 39 };

// 52 main track squares [row, col] in 15x15 grid
const TRACK: [number, number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],   // 0-4
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6], // 5-10
  [0,7],[0,8],                     // 11-12
  [1,8],[2,8],[3,8],[4,8],[5,8],   // 13-17
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14], // 18-23
  [7,14],[8,14],                   // 24-25
  [8,13],[8,12],[8,11],[8,10],[8,9], // 26-30
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8], // 31-36
  [14,7],[14,6],                   // 37-38
  [13,6],[12,6],[11,6],[10,6],[9,6], // 39-43
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0], // 44-49
  [7,0],[6,0]                      // 50-51
];
const SAFE_ABS = new Set([0,8,13,21,26,34,39,47]);

// Home column grids [row,col] for steps 52-56
const HOME_COLS: Record<Color, [number,number][]> = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],
  blue:   [[1,7],[2,7],[3,7],[4,7],[5,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
  green:  [[13,7],[12,7],[11,7],[10,7],[9,7]]
};

function getAbsSquare(steps: number, color: Color) {
  return (steps - 1 + COLOR_OFFSETS[color]) % 52;
}

// Returns cell key: "r,c" or "finish:color"
function tokenCell(color: Color, steps: number): string {
  if (steps === 0) return `yard:${color}`;
  if (steps >= 1 && steps <= 51) {
    const abs = getAbsSquare(steps, color);
    const [r, c] = TRACK[abs];
    return `${r},${c}`;
  }
  if (steps >= 52 && steps <= 56) {
    const [r, c] = HOME_COLS[color][steps - 52];
    return `${r},${c}`;
  }
  return `finish:${color}`;
}

function canMove(token: Token, dice: number | null): boolean {
  if (dice === null) return false;
  if (token.steps === 57) return false;
  if (token.steps === 0) return dice === 6;
  return token.steps + dice <= 57;
}

// ── Board square classname helper ─────────────────────────────────────────────
function sqClass(row: number, col: number): string {
  // Check safe
  const abs = TRACK.findIndex(([r, c]) => r === row && c === col);
  const base = 'sq';
  const classes = [base];
  if (abs !== -1 && SAFE_ABS.has(abs)) classes.push('sq--safe');
  // Start squares
  if (abs === 0) classes.push('sq--start-red');
  if (abs === 13) classes.push('sq--start-blue');
  if (abs === 26) classes.push('sq--start-yellow');
  if (abs === 39) classes.push('sq--start-green');
  return classes.join(' ');
}

// ── Token color class ─────────────────────────────────────────────────────────
function tokenClass(color: Color) {
  return color === 'yellow' ? 'token token--yel' : `token token--${color}`;
}
function dotClass(color: Color) { return `p-dot dot-${color}`; }
function logDotClass(color: string) { return `log-dot log-dot-${color === 'system' ? 'system' : color}`; }

// ── Progress (0-100) ──────────────────────────────────────────────────────────
function progress(player: Player) {
  const total = player.tokens.reduce((s, t) => s + Math.min(t.steps, 57), 0);
  return Math.round((total / (57 * 4)) * 100);
}

// ── BOARD COMPONENT ───────────────────────────────────────────────────────────
function LudoBoard({ gameState, myColor, onTokenClick, selectedToken, validIndices }: {
  gameState: GameState;
  myColor: Color | null;
  onTokenClick: (color: Color, tokenIndex: number) => void;
  selectedToken: { color: Color; index: number } | null;
  validIndices: number[];
}) {
  // Build cell → tokens mapping
  const cellTokens = new Map<string, { color: Color; tokenId: number; tokenIndex: number; steps: number }[]>();

  for (const player of gameState.players) {
    player.tokens.forEach((token, idx) => {
      if (token.steps === 57) return; // finished
      const key = tokenCell(player.color, token.steps);
      if (!cellTokens.has(key)) cellTokens.set(key, []);
      cellTokens.get(key)!.push({ color: player.color, tokenId: token.id, tokenIndex: idx, steps: token.steps });
    });
  }

  function renderTokensInCell(row: number, col: number) {
    const key = `${row},${col}`;
    const tokens = cellTokens.get(key) || [];
    return tokens.map(t => {
      const isSelected = selectedToken?.color === t.color && selectedToken?.index === t.tokenIndex;
      const isMyToken = t.color === myColor;
      const isValid = isMyToken && validIndices.includes(t.tokenIndex);
      return (
        <div
          key={`${t.color}-${t.tokenId}`}
          className={`${tokenClass(t.color)}${isSelected ? ' token--selected' : ''}`}
          style={{ width: 26, height: 26, fontSize: 8, cursor: isValid ? 'pointer' : 'default', margin: '1px' }}
          onClick={() => isMyToken && onTokenClick(t.color, t.tokenIndex)}
          title={`${t.color} token ${t.tokenId} (step ${t.steps})`}
        >
          {t.tokenId + 1}
        </div>
      );
    });
  }

  function renderYardTokens(color: Color) {
    const player = gameState.players.find(p => p.color === color);
    if (!player) return [null, null, null, null];
    return player.tokens.map((token, idx) => {
      if (token.steps !== 0) return <div key={idx} className="token-slot" />;
      const isValid = color === myColor && validIndices.includes(idx);
      const isSelected = selectedToken?.color === color && selectedToken?.index === idx;
      return (
        <div key={idx} className="token-slot">
          <div
            className={`${tokenClass(color)}${isSelected ? ' token--selected' : ''}`}
            style={{ cursor: isValid ? 'pointer' : 'default' }}
            onClick={() => color === myColor && onTokenClick(color, idx)}
            title={`${color} token ${idx}`}
          >
            {idx + 1}
          </div>
        </div>
      );
    });
  }

  // Track squares helpers
  function Sq({ row, col }: { row: number; col: number }) {
    const tokens = cellTokens.get(`${row},${col}`) || [];
    const hasClickable = tokens.some(t => t.color === myColor && validIndices.includes(t.tokenIndex));
    return (
      <div className={`${sqClass(row, col)}${hasClickable ? ' sq--clickable' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 1, overflow: 'visible' }}>
        {renderTokensInCell(row, col)}
      </div>
    );
  }

  function HomeSq({ color, step }: { color: Color; step: number }) {
    const [r, c] = HOME_COLS[color][step];
    const tokens = cellTokens.get(`${r},${c}`) || [];
    const hasClickable = tokens.some(t => t.color === myColor && validIndices.includes(t.tokenIndex));
    const homeClass = `sq sq--home-${color}${hasClickable ? ' sq--clickable' : ''}`;
    return (
      <div className={homeClass} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
        {renderTokensInCell(r, c)}
      </div>
    );
  }

  // Finished tokens in center
  const finishedTokens = gameState.players.flatMap(p =>
    p.tokens.filter(t => t.steps === 57).map(t => ({ color: p.color, id: t.id }))
  );

  return (
    <div className="ludo-board">
      {/* ROW TOP */}
      <div className="board-row board-row--top">
        {/* Red Home */}
        <div className="home home--red">
          <div className="yard">{renderYardTokens('red')}</div>
        </div>
        {/* Top Track */}
        <div className="track-col track-col--top">
          {/* Row 0 */}
          <Sq row={0} col={6}/><div className="sq" /><Sq row={0} col={8}/>
          {/* Row 1 */}
          <Sq row={1} col={6}/><HomeSq color="blue" step={0}/><div className="sq sq--safe sq--start-blue" style={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:1}}>{renderTokensInCell(1,8)}</div>
          {/* Row 2 */}
          <Sq row={2} col={6}/><HomeSq color="blue" step={1}/><Sq row={2} col={8}/>
          {/* Row 3 */}
          <Sq row={3} col={6}/><HomeSq color="blue" step={2}/><Sq row={3} col={8}/>
          {/* Row 4 */}
          <Sq row={4} col={6}/><HomeSq color="blue" step={3}/><Sq row={4} col={8}/>
          {/* Row 5 */}
          <Sq row={5} col={6}/><HomeSq color="blue" step={4}/><Sq row={5} col={8}/>
        </div>
        {/* Blue Home */}
        <div className="home home--blue">
          <div className="yard">{renderYardTokens('blue')}</div>
        </div>
      </div>

      {/* ROW MID */}
      <div className="board-row board-row--mid">
        {/* Left Track */}
        <div className="track-col track-col--left">
          {/* Row A (6,0)-(6,5) */}
          <Sq row={6} col={0}/><div className="sq sq--start-red" style={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:1}}>{renderTokensInCell(6,1)}</div><Sq row={6} col={2}/><Sq row={6} col={3}/><Sq row={6} col={4}/><Sq row={6} col={5}/>
          {/* Row B - Red home col (7,0) then home col squares */}
          <Sq row={7} col={0}/>
          <HomeSq color="red" step={0}/>
          <HomeSq color="red" step={1}/>
          <HomeSq color="red" step={2}/>
          <HomeSq color="red" step={3}/>
          <HomeSq color="red" step={4}/>
          {/* Row C (8,0)-(8,5) */}
          <Sq row={8} col={0}/><Sq row={8} col={1}/><Sq row={8} col={2}/><Sq row={8} col={3}/><Sq row={8} col={4}/><Sq row={8} col={5}/>
        </div>

        {/* Centre */}
        <div className="centre">
          <div className="tri tri--top" />
          <div className="tri tri--right" />
          <div className="tri tri--bot" />
          <div className="tri tri--left" />
          <span className="centre-star">★</span>
          {finishedTokens.map(t => (
            <div key={`fin-${t.color}-${t.id}`} className={tokenClass(t.color)} style={{ position: 'absolute', width: 18, height: 18, fontSize: 7, zIndex: 10, top: '50%', left: '50%', transform: `translate(${(t.id - 1.5) * 12}px, ${(t.color === 'red' || t.color === 'blue' ? -10 : 6)}px) translate(-50%,-50%)` }}>
              {t.id + 1}
            </div>
          ))}
        </div>

        {/* Right Track */}
        <div className="track-col track-col--right">
          {/* Row A (6,9)-(6,14) */}
          <Sq row={6} col={9}/><Sq row={6} col={10}/><Sq row={6} col={11}/><Sq row={6} col={12}/><Sq row={6} col={13}/>
          <div className="sq" style={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:1}}>{renderTokensInCell(6,14)}</div>
          {/* Row B - Yellow home col */}
          <HomeSq color="yellow" step={4}/>
          <HomeSq color="yellow" step={3}/>
          <HomeSq color="yellow" step={2}/>
          <HomeSq color="yellow" step={1}/>
          <HomeSq color="yellow" step={0}/>
          <Sq row={7} col={14}/>
          {/* Row C */}
          <Sq row={8} col={9}/><Sq row={8} col={10}/><Sq row={8} col={11}/><Sq row={8} col={12}/>
          <div className="sq sq--start-yellow" style={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:1}}>{renderTokensInCell(8,13)}</div>
          <Sq row={8} col={14}/>
        </div>
      </div>

      {/* ROW BOT */}
      <div className="board-row board-row--bot">
        {/* Green Home */}
        <div className="home home--green">
          <div className="yard">{renderYardTokens('green')}</div>
        </div>
        {/* Bottom Track */}
        <div className="track-col track-col--bot">
          {/* Row 0 (row 9) */}
          <Sq row={9} col={6}/>
          <HomeSq color="green" step={4}/>
          <Sq row={9} col={8}/>
          {/* Row 1 */}
          <Sq row={10} col={6}/><HomeSq color="green" step={3}/><Sq row={10} col={8}/>
          {/* Row 2 */}
          <Sq row={11} col={6}/><HomeSq color="green" step={2}/><Sq row={11} col={8}/>
          {/* Row 3 */}
          <Sq row={12} col={6}/><HomeSq color="green" step={1}/><Sq row={12} col={8}/>
          {/* Row 4 */}
          <div className="sq sq--start-green" style={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:1}}>{renderTokensInCell(13,6)}</div>
          <HomeSq color="green" step={0}/>
          <Sq row={13} col={8}/>
          {/* Row 5 */}
          <Sq row={14} col={6}/><Sq row={14} col={7}/><Sq row={14} col={8}/>
        </div>
        {/* Yellow Home */}
        <div className="home home--yellow">
          <div className="yard">{renderYardTokens('yellow')}</div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN GAME PAGE ────────────────────────────────────────────────────────────
export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const socket = getSocket();

  const locationState = location.state as { gameState?: GameState } | null;
  const [gameState, setGameState] = useState<GameState | null>(locationState?.gameState ?? null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [diceHistory, setDiceHistory] = useState<number[]>([]);
  const [selectedToken, setSelectedToken] = useState<{ color: Color; index: number } | null>(null);
  const [timer, setTimer] = useState(20);
  const [showVictory, setShowVictory] = useState(false);
  // const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const myColor = gameState?.players.find(p => p.userId === user?._id)?.color as Color | null;
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.userId === user?._id;

  const getValidIndices = useCallback(() => {
    if (!gameState || !myColor || !isMyTurn || !gameState.diceRolled || gameState.diceValue === null) return [];
    const player = gameState.players.find(p => p.color === myColor)!;
    return player.tokens.map((t, i) => canMove(t, gameState.diceValue) ? i : -1).filter(i => i !== -1);
  }, [gameState, myColor, isMyTurn]);

  const validIndices = getValidIndices();

  // Timer countdown
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;
    setTimer(20);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState?.currentPlayerIndex, gameState?.diceRolled]);

  // Socket events
  useEffect(() => {
    if (gameId && !gameState) {
      socket.emit('rejoinGame', { gameId });
    }

    socket.on('gameStateUpdate', ({ gameState: gs }: { gameState: GameState }) => {
      setGameState(gs);
      setSelectedToken(null);
      if (gs.diceValue !== null) setDiceHistory(h => [gs.diceValue!, ...h].slice(0, 5));
    });

    socket.on('diceRolled', ({ gameState: gs }: { gameState: GameState }) => {
      setGameState(gs);
      if (gs.diceValue !== null) setDiceHistory(h => [gs.diceValue!, ...h].slice(0, 5));
    });

    socket.on('gameOver', ({ gameState: gs }: { gameState: GameState }) => {
      setGameState(gs);
      setShowVictory(true);
      // Refresh user profile so Navbar shows updated coin balance
      authApi.me().then((data) => updateUser((data as { user: Parameters<typeof updateUser>[0] }).user)).catch(console.error);
    });

    socket.on('chatMessage', (msg: ChatMsg) => {
      // Skip own messages — already added locally in handleSendMessage
      if (msg.userId === user?._id) return;
      setChatMessages(prev => [...prev, msg]);
      setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
    });

    socket.on('error', ({ message }: { message: string }) => console.warn('Socket error:', message));

    return () => {
      socket.off('gameStateUpdate');
      socket.off('diceRolled');
      socket.off('gameOver');
      socket.off('chatMessage');
      socket.off('error');
    };
  }, [gameId]);

  const handleRoll = () => {
    if (!isMyTurn || gameState?.diceRolled) return;
    socket.emit('rollDice', { gameId });
  };

  const handleTokenClick = (color: Color, tokenIndex: number) => {
    if (!isMyTurn || !gameState?.diceRolled || gameState.diceValue === null) return;
    if (!validIndices.includes(tokenIndex)) return;
    setSelectedToken({ color, index: tokenIndex });
    socket.emit('moveToken', { gameId, tokenIndex });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('sendMessage', { gameId, message: chatInput });
    setChatMessages(prev => [...prev, { username: user?.username || 'You', color: myColor || 'system', message: chatInput, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), userId: user?._id || '' }]);
    setChatInput('');
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
  };

  const handleQuickReact = (emoji: string) => {
    socket.emit('sendMessage', { gameId, message: emoji });
  };

  const handleLeave = () => {
    socket.emit('leaveLobby');
    navigate('/home');
  };

  if (!gameState) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ color: '#fff', fontSize: 20 }}>Connecting to game...</div>
      </div>
    );
  }

  const winnerPlayer = showVictory ? gameState.players.find(p => p.rank === 1) : null;

  return (
    <div className="page">
      {/* TOP BAR */}
      <div className="topbar">
        <div className="topbar-info">
          <div><span>Room: </span><strong>#{gameId?.slice(-6).toUpperCase()}</strong></div>
          <div><span>Mode: </span><strong>Classic ({gameState.players.length} players)</strong></div>
          <div><span>Turn: </span><strong>{gameState.turnCount}</strong></div>
        </div>
        <div className={`timer${timer <= 5 ? ' timer--warning' : ''}`}>
          {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger" onClick={handleLeave}>✕ Leave Game</button>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="layout">
        {/* LEFT SIDEBAR */}
        <aside>
          <div className="panel">
            <div className="panel-hd">{isMyTurn ? 'Your Turn – Roll Dice' : `${currentPlayer?.username}'s Turn`}</div>
            <div className="panel-bd">
              <div className={`die-number${gameState.diceRolled ? '' : ' die-number--rolling'}`}>
                {gameState.diceValue ?? '?'}
              </div>
              <button
                className="roll-btn"
                onClick={handleRoll}
                disabled={!isMyTurn || gameState.diceRolled || gameState.status !== 'playing'}
              >
                {isMyTurn && !gameState.diceRolled ? 'Roll!' : gameState.diceRolled ? 'Pick Token' : 'Waiting...'}
              </button>
              {diceHistory.length > 0 && (
                <div className="roll-hist">
                  Recent: {diceHistory.map((v, i) => <span key={i} className="rp">{v}</span>)}
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd">Players</div>
            <div className="panel-bd">
              {gameState.players.map((p, i) => (
                <div key={p.userId} className={`player-card${i === gameState.currentPlayerIndex ? ' active' : ''}${p.tokens.every(t => t.steps === 57) ? ' out' : ''}`}>
                  {i === gameState.currentPlayerIndex && <span className="active-badge">Playing</span>}
                  {p.isAI && <span className="ai-badge">AI</span>}
                  <div className="p-name">
                    <div className={dotClass(p.color)} />
                    {p.username === user?.username ? `You (${p.color})` : `${p.username} (${p.color})`}
                    {p.rank && <span style={{ fontSize: 10, color: '#f9a825', marginLeft: 4 }}>#{p.rank}</span>}
                  </div>
                  <div className="p-stats">
                    On board: {p.tokens.filter(t => t.steps >= 1 && t.steps <= 51).length} &nbsp;|&nbsp;
                    Home: {p.tokens.filter(t => t.steps === 0).length} &nbsp;|&nbsp;
                    Fin: {p.tokens.filter(t => t.steps === 57).length}
                  </div>
                  <div className="prog-wrap">
                    <div className={`prog-fill bg-${p.color}`} style={{ width: `${progress(p)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* BOARD */}
        <div className="board-area">
          <LudoBoard
            gameState={gameState}
            myColor={myColor}
            onTokenClick={handleTokenClick}
            selectedToken={selectedToken}
            validIndices={isMyTurn && gameState.diceRolled ? validIndices : []}
          />
          {isMyTurn && gameState.diceRolled && validIndices.length > 0 && (
            <div style={{ width: '100%', background: '#fff8e1', border: '2px solid #f9a825', borderRadius: 6, padding: '8px 13px' }}>
              <div style={{ fontWeight: 700, color: '#e65100', fontSize: 12, marginBottom: 7 }}>
                Select a token to move (rolled {gameState.diceValue}):
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {validIndices.map(idx => {
                  const myPlayer = gameState.players.find(p => p.color === myColor)!;
                  const token = myPlayer.tokens[idx];
                  const label = token.steps === 0 ? 'Enter board' : `Step ${token.steps} → ${token.steps + gameState.diceValue!}`;
                  return (
                    <button key={idx} onClick={() => handleTokenClick(myColor!, idx)}
                      style={{ background: selectedToken?.index === idx ? '#fff8e1' : '#fff', border: `2px solid ${selectedToken?.index === idx ? '#f9a825' : '#f9a825'}`, borderRadius: 5, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: myColor === 'red' ? '#e53935' : myColor === 'blue' ? '#1e88e5' : myColor === 'green' ? '#43a047' : '#fdd835' }} />
                      T{idx + 1}: {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <aside>
          <div className="panel">
            <div className="panel-hd">Live Chat</div>
            <div className="chat-window">
              <div className="chat-messages" ref={chatRef}>
                {chatMessages.map((msg, i) => {
                  const isMine = msg.userId === user?._id;
                  const isSystem = msg.color === 'system';
                  return (
                    <div key={i} className={`chat-msg${isMine ? ' mine' : ''}${isSystem ? ' sys' : ''}`}>
                      {!isSystem && (
                        <div className={`msg-meta${isMine ? ' flex-end-justify' : ''}`} style={{ display: 'flex', gap: 5, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                          {!isMine && <span className={`msg-sender msg-sender-${msg.color}`}>{msg.username}</span>}
                          <span className="msg-time">{msg.time}</span>
                          {isMine && <span className={`msg-sender msg-sender-${msg.color}`}>You</span>}
                        </div>
                      )}
                      <div className="msg-bubble">{msg.message}</div>
                    </div>
                  );
                })}
              </div>
              <div className="quick-react">
                {['👏','😂','😱','👍','😬','🎉'].map(e => (
                  <button key={e} className="qr-btn" onClick={() => handleQuickReact(e)}>{e}</button>
                ))}
              </div>
              <form className="chat-input-row" onSubmit={handleSendMessage}>
                <input type="text" placeholder="Type a message…" value={chatInput} onChange={e => setChatInput(e.target.value)} maxLength={200} />
                <button type="submit">Send</button>
              </form>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd">Game Log</div>
            <div className="game-log">
              {[...gameState.log].reverse().map((entry, i) => (
                <div key={i} className={`log-entry${entry.type === 'capture' ? ' capture' : entry.type === 'finish' ? ' finish' : ''}`}>
                  <span className="log-time">{entry.time}</span>
                  <div className={logDotClass(entry.color)} />
                  <span className="log-text">{entry.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd">Standings</div>
            <div className="panel-bd">
              <div className="standings-wrap">
                {[...gameState.players]
                  .sort((a, b) => {
                    const pa = progress(a), pb = progress(b);
                    return pb - pa;
                  })
                  .map((p, i) => (
                    <div key={p.userId} className="standing-row">
                      <span className="s-rank">{i + 1}.</span>
                      <div className={dotClass(p.color)} />
                      <span style={{ flex: 1 }}>{p.username === user?.username ? 'You' : p.username}</span>
                      <strong style={{ color: p.color === 'red' ? '#e53935' : p.color === 'blue' ? '#1e88e5' : p.color === 'green' ? '#2e7d32' : '#f57f17' }}>
                        {p.tokens.filter(t => t.steps === 57).length} fin
                      </strong>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* VICTORY OVERLAY */}
      {showVictory && (
        <div className="victory-overlay">
          <div className="victory-card">
            <div className="vc-trophy">🏆</div>
            <h2>Game Over!</h2>
            <div className={`vc-winner color-${winnerPlayer?.color || 'red'}`}>
              {winnerPlayer?.userId === user?._id ? 'You Win! 🎉' : `${winnerPlayer?.username} Wins!`}
            </div>
            <div className="vc-stats">
              {gameState.players
                .filter(p => p.rank)
                .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                .map(p => <div key={p.userId}>#{p.rank} {p.username} ({p.color})</div>)
              }
            </div>
            <div className="vc-actions">
              <button className="btn btn-success" onClick={() => navigate('/newgame/lobby')}>Play Again</button>
              <button className="btn btn-muted" onClick={() => navigate('/home')}>Main Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
