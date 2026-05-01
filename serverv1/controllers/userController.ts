import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Game from '../models/Game';

export async function getLeaderboard(req: AuthRequest, res: Response) {
  const page  = parseInt(String(req.query.page)) || 1;
  const limit = 10;
  const skip  = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().sort({ coins: -1, wins: -1 }).skip(skip).limit(limit).select('-password'),
    User.countDocuments(),
  ]);

  res.json({ users, pages: Math.ceil(total / limit) });
}

export async function getHistory(req: AuthRequest, res: Response) {
  const page  = parseInt(String(req.query.page)) || 1;
  const limit = 10;
  const skip  = (page - 1) * limit;

  const userId = req.query.userId || req.userId;
  const [history, total] = await Promise.all([
    Game.find({ 'players.userId': userId, status: 'finished' })
        .sort({ finishedAt: -1 }).skip(skip).limit(limit),
    Game.countDocuments({ 'players.userId': userId, status: 'finished' }),
  ]);

  res.json({ history, pages: Math.ceil(total / limit) });
}

export async function getStats(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).select('-password');
  if (!user) return res.status(404).json({ message: 'Not found' });
  const winRate = user.total_played > 0
    ? (user.wins / user.total_played * 100).toFixed(1)
    : '0';
  res.json({ ...user.toObject(), winRate });
}
