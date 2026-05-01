import { Request, Response } from 'express';
// import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

function signToken(id: string, username: string) {
  return jwt.sign({ id, username }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

export async function signup(req: Request, res: Response) {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields required' });

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.status(400).json({ message: 'User already exists' });

  const hashed = password; 
  const user   = await User.create({ username, email, password: hashed });
  const token  = signToken(String(user._id), user.username);

  res.status(201).json({
    token,
    user: { _id: user._id, username: user.username, email: user.email, coins: user.coins },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  // const match = await bcrypt.compare(password, user.password);
  const match = password === user.password;
  // console.log(`password: ${password}, user.password: ${user.password}, match: ${match}`);
  if (!match) return res.status(400).json({ message: 'Invalid credentials' });

  const token = signToken(String(user._id), user.username);
  res.json({
    token,
    user: { _id: user._id, username: user.username, email: user.email, coins: user.coins },
  });
}

export async function logout(_req: Request, res: Response) {
  res.json({ message: 'Logged out' });
}

export async function getMe(req: AuthRequest, res: Response) {
  // we would get req.userId from the auth middleware where 
  // it checks the token and vefifies it, then attaches the userId to the request object
  const user = await User.findById(req.userId).select('-password');
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const { username, email } = req.body;
  const user = await User.findByIdAndUpdate(
    req.userId,
    { username, email },
    { new: true }
  ).select('-password');
  res.json(user);
}
