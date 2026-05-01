// WHAT: Add win rate (wins / total_played) to the User model and leaderboard.
// MODIFY: server/models/User.ts — add wins field
// MODIFY: server/utils/socketHandler.ts — increment wins for rank 1 player
// MODIFY: server/controllers/gameController.ts — include win rate in response

// ── STEP 1: Add wins field to User model ─────────────────────────────────
// In server/models/User.ts, add to the Schema:
/*
  wins: { type: Number, default: 0 },
*/
// Also add to IUser interface:
//   wins: number;

// ── STEP 2: Increment wins when a player finishes first ───────────────────
// In server/utils/socketHandler.ts, inside finishGame():
/*
  for (const p of state.players) {
    const rank = p.rank ?? state.players.length;
    const coins = getCoinReward(rank, totalPlayers);

    const updateFields: any = { $inc: { coins, total_played: 1 } };
    if (rank === 1) {
      updateFields.$inc.wins = 1; // <-- add this line
    }

    await User.findByIdAndUpdate(p.userId, updateFields);
  }
*/

// ── STEP 3: Calculate win rate in leaderboard controller ─────────────────
// In server/controllers/gameController.ts, getLeaderboard():
/*
  const users = await User.find(query)
    .select('username coins total_played wins')   // add 'wins'
    .sort({ coins: -1, total_played: 1 })
    .skip(skip)
    .limit(limit);

  // Calculate win rate in response:
  const usersWithWinRate = users.map(u => ({
    _id: u._id,
    username: u.username,
    coins: u.coins,
    total_played: u.total_played,
    wins: u.wins ?? 0,
    winRate: u.total_played > 0
      ? Math.round(((u.wins ?? 0) / u.total_played) * 100)
      : 0,
  }));

  res.json({ users: usersWithWinRate, total, page, pages: ... });
*/

// ── STEP 4: Display win rate in Leaderboard.tsx ───────────────────────────
// Add to the LeaderUser interface:
//   interface LeaderUser { ...; wins: number; winRate: number; }
//
// Add a column to the table:
/*
  <th>Win Rate</th>
  ...
  <td>{u.winRate}%</td>
*/

// ── EXAM SCENARIO: Sort by win rate instead of coins ─────────────────────
// Change the sort in getLeaderboard:
//   .sort({ winRate: -1 }) // not available directly in MongoDB
//
// You'd need to use aggregation:
/*
  const users = await User.aggregate([
    { $match: query },
    { $addFields: {
        winRate: {
          $cond: [
            { $eq: ['$total_played', 0] },
            0,
            { $multiply: [{ $divide: ['$wins', '$total_played'] }, 100] }
          ]
        }
    }},
    { $sort: { winRate: -1, total_played: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);
*/

export {};
