import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';

const ROOM_COLORS: ReadonlyArray<'red' | 'blue' | 'green' | 'yellow'> = ['red', 'blue', 'green', 'yellow'];

export const listRooms = async (_req: AuthRequest, res: Response) => {
  try {
    const rooms = await Game.find({ status: 'waiting' })
      .select('_id players total_players status createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({
      rooms: rooms.map(r => ({
        roomId: r._id,
        players: r.players.map(p => ({ username: p.username, color: p.color })),
        total_players: r.players.length,
        status: r.status,
        createdAt: r.createdAt
      }))
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const game = await Game.create({
      total_players: 1,
      players: [{
        userId: user._id,
        username: user.username,
        color: ROOM_COLORS[0],
        rank: null,
        coinsEarned: 0
      }],
      status: 'waiting'
    });
    res.status(201).json({
      roomId: game._id,
      status: game.status,
      total_players: game.total_players,
      players: game.players.map(p => ({ username: p.username, color: p.color })),
      createdAt: game.createdAt
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRoom = async (req: AuthRequest, res: Response) => {
  try {
    const game = await Game.findById(req.params.roomId);
    if (!game) return res.status(404).json({ message: 'Room not found' });
    res.json({
      roomId: game._id,
      players: game.players.map(p => ({ userId: p.userId, username: p.username, color: p.color })),
      status: game.status,
      total_players: game.players.length,
      createdAt: game.createdAt
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const joinRoom = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const game = await Game.findById(req.params.roomId);
    if (!game) return res.status(404).json({ message: 'Room not found' });
    if (game.status !== 'waiting') return res.status(400).json({ message: 'Game already started' });
    if (game.players.length >= 4) return res.status(400).json({ message: 'Room is full' });
    const already = game.players.find(p => p.userId.toString() === user._id.toString());
    if (!already) {
      game.players.push({
        userId: user._id,
        username: user.username,
        color: ROOM_COLORS[game.players.length],
        rank: null,
        coinsEarned: 0
      });
      game.total_players = game.players.length;
      await game.save();
    }
    res.json({ roomId: game._id, players: game.players.length });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const leaveRoom = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const game = await Game.findById(req.params.roomId);
    if (!game) return res.status(404).json({ message: 'Room not found' });
    const idx = game.players.findIndex(p => p.userId.toString() === user._id.toString());
    if (idx !== -1) game.players.splice(idx, 1);
    game.total_players = game.players.length;
    await game.save();
    res.json({ roomId: game._id, players: game.players.length });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
