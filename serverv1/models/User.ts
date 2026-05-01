import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  coins: number;
  total_played: number;
  wins: number;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  username:     { type: String, required: true, unique: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true },
  coins:        { type: Number, default: 500 },
  total_played: { type: Number, default: 0 },
  wins:         { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
});

export default mongoose.model<IUser>('User', userSchema);
