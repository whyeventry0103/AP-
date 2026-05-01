import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { dob, currentPassword, newPassword, username } = req.body as {
      dob?: string;
      currentPassword?: string;
      newPassword?: string;
      username?: string;
    };
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username && username.trim() && username.trim() !== user.username) {
      const nextUsername = username.trim();
      const existing = await User.findOne({ username: nextUsername });
      if (existing) return res.status(409).json({ message: 'Username already taken' });
      user.username = nextUsername;
    }

    if (dob) user.dob = new Date(dob);

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password required to set new password' });
      }
      const valid = await user.comparePassword(currentPassword);
      if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
      if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      user.password = newPassword; // pre-save hook will hash it
    }

    await user.save();
    res.json({
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
