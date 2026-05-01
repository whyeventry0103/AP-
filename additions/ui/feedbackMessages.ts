// WHAT: Show temporary toast/banner messages for game events.
// MODIFY: client/APP/src/pages/Game.tsx — add toast state + rendering
// ALSO: client/APP/src/index.css — add toast styles

// ── TOAST STATE AND COMPONENT ─────────────────────────────────────────────

// In Game.tsx, add state:
/*
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // auto-dismiss after 3s
  }
*/

// In the JSX, add below the topbar:
/*
  {toast && (
    <div className={`toast toast--${toast.type}`}>
      {toast.message}
    </div>
  )}
*/

// CSS to add to index.css:
/*
  .toast {
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    z-index: 9999;
    animation: fadeInOut 3s forwards;
    pointer-events: none;
  }
  .toast--success { background: #2e7d32; color: #fff; }
  .toast--error   { background: #c62828; color: #fff; }
  .toast--info    { background: #1565c0; color: #fff; }

  @keyframes fadeInOut {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
    75%  { opacity: 1; }
    100% { opacity: 0; }
  }
*/

// ── WHERE TO CALL showToast ───────────────────────────────────────────────

// On dice roll (your turn):
/*
  socket.on('diceRolled', ({ gameState: gs }) => {
    setGameState(gs);
    if (gs.players[gs.currentPlayerIndex]?.userId === user?._id && gs.diceValue !== null) {
      if (gs.diceValue === 6) showToast('🎉 Rolled a 6! Extra turn!', 'success');
    }
  });
*/

// On capture detected from game log:
/*
  socket.on('gameStateUpdate', ({ gameState: gs }) => {
    setGameState(gs);
    const lastLog = gs.log[gs.log.length - 1];
    if (lastLog?.type === 'capture') {
      const isMine = lastLog.color === myColor;
      showToast(isMine ? '⚔️ You captured a token!' : `⚔️ ${lastLog.text}`, isMine ? 'success' : 'info');
    }
  });
*/

// On socket error:
/*
  socket.on('error', ({ message }) => {
    showToast(message, 'error');
  });
*/

// On game over:
/*
  socket.on('gameOver', ({ gameState: gs }) => {
    const myRank = gs.players.find(p => p.userId === user?._id)?.rank;
    if (myRank === 1) showToast('🏆 You won!', 'success');
    else showToast(`Game over — you finished #${myRank}`, 'info');
  });
*/

export {};
