import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';
import { User } from '../models/User';
import mongoose from 'mongoose';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const query = search ? { username: { $regex: search, $options: 'i' } } : {};
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('username coins total_played')
      .sort({ coins: -1, total_played: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const games = await Game.find({
      'players.userId': userId,
      status: 'finished'
    })
      .sort({ finishedAt: -1 })
      .limit(20);

    const history = games.map(game => {
      const myPlayer = game.players.find(p => p.userId.toString() === userId.toString());
      return {
        gameId: game._id,
        date: game.finishedAt || game.createdAt,
        total_players: game.total_players,
        players: game.players.map(p => ({ username: p.username, color: p.color, rank: p.rank })),
        myRank: myPlayer?.rank,
        coinsEarned: myPlayer?.coinsEarned ?? 0
      };
    });

    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error' });
  }
};
