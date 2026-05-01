// WHAT: Different sort orders for the leaderboard endpoint.
// MODIFY: server/controllers/gameController.ts — getLeaderboard function
// The current sort is: { coins: -1, total_played: 1 }

// ── CURRENT (for reference) ───────────────────────────────────────────────
//   .sort({ coins: -1, total_played: 1 })  // most coins, fewest games as tiebreaker

// ── SORT OPTION 1: By total games played ─────────────────────────────────
//   .sort({ total_played: -1, coins: -1 })  // most active player

// ── SORT OPTION 2: By win rate (requires wins field) ─────────────────────
// Simple approximation without aggregation (not perfectly accurate):
//   .sort({ wins: -1, total_played: 1 })  // most wins, fewest games

// ── SORT OPTION 3: Dynamic — let client specify via query param ───────────
// In getLeaderboard, read a 'sortBy' query param:
/*
  export const getLeaderboard = async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const sortBy = (req.query.sortBy as string) || 'coins';
    const skip = (page - 1) * limit;

    const VALID_SORTS: Record<string, object> = {
      coins:        { coins: -1, total_played: 1 },
      games:        { total_played: -1, coins: -1 },
      wins:         { wins: -1, total_played: 1 },
      alphabetical: { username: 1 },
    };

    const sort = VALID_SORTS[sortBy] || VALID_SORTS.coins;

    const query = search ? { username: { $regex: search, $options: 'i' } } : {};
    const users = await User.find(query)
      .select('username coins total_played wins')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({ users, total: await User.countDocuments(query), page, pages: Math.ceil(total / limit), sortBy });
  };
*/

// ── FRONTEND: Leaderboard.tsx — add sort selector ────────────────────────
/*
  const [sortBy, setSortBy] = useState('coins');

  // In fetchData:
  const params = new URLSearchParams({ page: String(page), limit: '10', sortBy });
  if (search) params.set('search', search);

  // UI:
  <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}>
    <option value="coins">By Coins</option>
    <option value="games">By Games Played</option>
    <option value="wins">By Wins</option>
    <option value="alphabetical">Alphabetical</option>
  </select>
*/

// ── EXAM SCENARIO: Top N players only ────────────────────────────────────
// Add a 'top' query param:
/*
  const top = parseInt(req.query.top as string) || 0;
  let q = User.find(query).select('username coins total_played').sort(sort);
  if (top > 0) q = q.limit(top);
  else q = q.skip(skip).limit(limit);
  const users = await q;
*/

export {};
