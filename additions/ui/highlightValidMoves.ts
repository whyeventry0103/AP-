// WHAT: Visual highlighting of tokens the current player can move.
// The current Game.tsx already does this — this file shows how to extend it.

// ── CURRENT IMPLEMENTATION (Game.tsx — already works) ─────────────────────
// validIndices is computed in getValidIndices():
//   return player.tokens.map((t, i) => canMove(t, gameState.diceValue) ? i : -1).filter(i => i !== -1);
//
// LudoBoard receives: validIndices={isMyTurn && gameState.diceRolled ? validIndices : []}
// Tokens with isValid=true get: cursor: 'pointer'
// Board squares with clickable tokens get: className 'sq--clickable'

// ── ENHANCEMENT 1: Pulsing animation on valid tokens ─────────────────────
// In index.css, add:
/*
  .token--valid {
    animation: pulse 0.8s infinite;
    box-shadow: 0 0 0 3px #f9a825;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 3px #f9a825; }
    50%       { box-shadow: 0 0 0 6px rgba(249, 168, 37, 0.4); }
  }
*/
// In renderTokensInCell (LudoBoard component in Game.tsx):
//   className={`${tokenClass(t.color)}${isSelected ? ' token--selected' : ''}${isValid ? ' token--valid' : ''}`}

// ── ENHANCEMENT 2: Highlight destination square ──────────────────────────
// Show where a valid token WILL land when hovered:
// Add to LudoBoard component:
/*
  const [hoveredToken, setHoveredToken] = useState<{ color: Color; index: number } | null>(null);

  // Compute destination cell when hovering a valid token:
  function getDestinationCell(color: Color, tokenIndex: number): string | null {
    if (!gameState.diceValue) return null;
    const player = gameState.players.find(p => p.color === color);
    if (!player) return null;
    const token = player.tokens[tokenIndex];
    if (!canMove(token, gameState.diceValue)) return null;
    const newSteps = token.steps === 0 ? 1 : token.steps + gameState.diceValue;
    return tokenCell(color, Math.min(newSteps, 57));
  }

  // In the Sq component, check if it's a destination:
  const dest = hoveredToken ? getDestinationCell(hoveredToken.color, hoveredToken.index) : null;
  const isDestination = dest === `${row},${col}`;

  // Apply highlight:
  className={`${sqClass(row, col)}${isDestination ? ' sq--destination' : ''}`}
*/
// CSS:
/*
  .sq--destination {
    background: rgba(249, 168, 37, 0.3) !important;
    border: 2px dashed #f9a825 !important;
  }
*/

// ── ENHANCEMENT 3: Show step count tooltip on hover ──────────────────────
// The token title already shows: title={`${color} token ${id} (step ${steps})`}
// To show remaining steps to finish:
/*
  const stepsLeft = 57 - token.steps;
  title={`${color} T${id} — ${token.steps === 0 ? 'in yard' : `step ${token.steps} (${stepsLeft} to finish)`}`}
*/

// ── NO CHANGES NEEDED for basic valid move highlighting ──────────────────
// The current code already correctly:
// 1. Shows cursor:pointer on valid tokens
// 2. Adds sq--clickable class to squares with valid tokens
// 3. Shows a "Select a token" panel below the board with buttons

export {};
