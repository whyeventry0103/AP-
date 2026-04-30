import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, password, dob } = req.body as { username: string; password: string; dob: string };
    if (!username || !password || !dob) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    const user = await User.create({ username, password, dob: new Date(dob) });
    const token = signToken(user._id.toString());
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        coins: user.coins,
        total_played: user.total_played,
        dob: user.dob,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    const mongoErr = err as { code?: number; message?: string };
    if (mongoErr.code === 11000) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: 'Server error', error: mongoErr.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = signToken(user._id.toString());
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        coins: user.coins,
        total_played: user.total_played,
        dob: user.dob,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
