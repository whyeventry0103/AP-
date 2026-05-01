// WHAT: Disable buttons and inputs when the action is not allowed.
// The current Game.tsx already handles most cases — this shows the full pattern
// and any missing cases.

// ── CURRENT DISABLED STATES (Game.tsx — already correct) ─────────────────
//   Roll button:  disabled={!isMyTurn || gameState.diceRolled || gameState.status !== 'playing'}
//   Token click:  if (!isMyTurn || !gameState?.diceRolled || ...) return;
//   Chat send:    no restriction (anyone can chat)

// ── EXAM SCENARIO 1: Disable chat during certain game states ─────────────
// Disable chat input if game is finished:
/*
  // In the chat form in Game.tsx:
  <input
    type="text"
    placeholder={gameState.status === 'finished' ? 'Game over' : 'Type a message…'}
    disabled={gameState.status === 'finished'}
    ...
  />
  <button type="submit" disabled={gameState.status === 'finished'}>Send</button>
*/

// ── EXAM SCENARIO 2: Disable Leave button while it's your turn ───────────
/*
  const canLeave = !isMyTurn || gameState.status === 'finished';

  <button
    className="btn btn-danger"
    onClick={handleLeave}
    disabled={!canLeave}
    title={!canLeave ? "Can't leave during your turn" : ""}
  >
    ✕ Leave Game
  </button>
*/

// ── EXAM SCENARIO 3: Grey out opponent tokens (prevent misclick) ─────────
// In LudoBoard renderTokensInCell:
/*
  const isOpponentToken = t.color !== myColor;
  return (
    <div
      className={tokenClass(t.color)}
      style={{
        opacity: isOpponentToken ? 0.7 : 1,     // dim opponent tokens
        cursor: isMyToken && isValid ? 'pointer' : 'not-allowed',
        pointerEvents: !isMyToken ? 'none' : 'auto', // block clicks entirely
      }}
      onClick={() => isMyToken && onTokenClick(t.color, t.tokenIndex)}
    />
  );
*/

// ── EXAM SCENARIO 4: Loading state on Roll button ────────────────────────
/*
  const [rollingDice, setRollingDice] = useState(false);

  const handleRoll = () => {
    if (!isMyTurn || gameState?.diceRolled || rollingDice) return;
    setRollingDice(true);
    socket.emit('rollDice', { gameId });
    // Reset on next gameState update (diceRolled will be true)
  };

  // In diceRolled socket handler:
  socket.on('diceRolled', ({ gameState: gs }) => {
    setGameState(gs);
    setRollingDice(false); // clear loading state
  });

  // Button:
  <button onClick={handleRoll} disabled={rollingDice || !isMyTurn || gameState.diceRolled}>
    {rollingDice ? '🎲...' : 'Roll!'}
  </button>
*/

// ── SUMMARY: All disable conditions in Game.tsx ───────────────────────────
/*
  Roll button disabled when:
    - Not your turn
    - Dice already rolled
    - Game not playing
    - (optional) rolling animation in progress

  Token click blocked when:
    - Not your turn
    - Dice not rolled
    - Token not in validIndices
    - (optional) not your token color

  Leave button disabled when:
    - (optional) it's your turn
    - (optional) game finished (just navigate instead)

  Chat disabled when:
    - (optional) game finished
*/

export {};
