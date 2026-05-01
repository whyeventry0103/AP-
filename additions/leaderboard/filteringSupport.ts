// WHAT: Filter leaderboard by date range, coin range, or games played range.
// MODIFY: server/controllers/gameController.ts — getLeaderboard query

// ── EXAM SCENARIO 1: Filter by minimum games played ───────────────────────
/*
  const minGames = parseInt(req.query.minGames as string) || 0;
  const query: any = {};
  if (search) query.username = { $regex: search, $options: 'i' };
  if (minGames > 0) query.total_played = { $gte: minGames };

  const users = await User.find(query)
    .select('username coins total_played')
    .sort({ coins: -1, total_played: 1 })
    .skip(skip)
    .limit(limit);
*/

// ── EXAM SCENARIO 2: Filter by coin range ────────────────────────────────
/*
  const minCoins = parseInt(req.query.minCoins as string) || 0;
  const maxCoins = parseInt(req.query.maxCoins as string) || Infinity;

  const query: any = {};
  if (search) query.username = { $regex: search, $options: 'i' };
  if (minCoins > 0 || maxCoins < Infinity) {
    query.coins = {};
    if (minCoins > 0) query.coins.$gte = minCoins;
    if (maxCoins < Infinity) query.coins.$lte = maxCoins;
  }
*/

// ── EXAM SCENARIO 3: Filter by join date (created in last N days) ─────────
/*
  const days = parseInt(req.query.days as string) || 0;
  const query: any = {};
  if (days > 0) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    query.createdAt = { $gte: since };
  }
*/

// ── COMBINED FILTER BUILDER (clean pattern) ──────────────────────────────
function buildLeaderboardQuery(params: {
  search?: string;
  minGames?: number;
  minCoins?: number;
  maxCoins?: number;
  days?: number;
}) {
  const query: Record<string, unknown> = {};

  if (params.search) {
    query.username = { $regex: params.search, $options: 'i' };
  }
  if (params.minGames && params.minGames > 0) {
    query.total_played = { $gte: params.minGames };
  }
  if (params.minCoins !== undefined || params.maxCoins !== undefined) {
    const coinsFilter: Record<string, number> = {};
    if (params.minCoins !== undefined) coinsFilter.$gte = params.minCoins;
    if (params.maxCoins !== undefined) coinsFilter.$lte = params.maxCoins;
    query.coins = coinsFilter;
  }
  if (params.days && params.days > 0) {
    const since = new Date();
    since.setDate(since.getDate() - params.days);
    query.createdAt = { $gte: since };
  }

  return query;
}

// ── HOW TO USE in getLeaderboard ─────────────────────────────────────────
/*
  const query = buildLeaderboardQuery({
    search: req.query.search as string,
    minGames: parseInt(req.query.minGames as string) || 0,
    minCoins: parseInt(req.query.minCoins as string) || undefined,
    maxCoins: parseInt(req.query.maxCoins as string) || undefined,
    days: parseInt(req.query.days as string) || 0,
  });

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('username coins total_played')
    .sort({ coins: -1 })
    .skip(skip)
    .limit(limit);
*/

// ── FRONTEND: Leaderboard.tsx — add filter inputs ────────────────────────
/*
  const [minGames, setMinGames] = useState(0);

  // In fetchData:
  if (minGames > 0) params.set('minGames', String(minGames));

  // UI:
  <input type="number" placeholder="Min games played" value={minGames || ''}
    onChange={e => setMinGames(Number(e.target.value))} style={{ width: 120 }} />
*/

export { buildLeaderboardQuery };
