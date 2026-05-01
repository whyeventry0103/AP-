import mongoose, { Document } from 'mongoose';

interface PlayerResult {
  userId: string;
  username: string;
  rank: number;
  coinsEarned: number;
}

export interface IGame extends Document {
  players: PlayerResult[];
  status: 'waiting' | 'playing' | 'finished';
  startedAt: Date;
  finishedAt?: Date;
}

const gameSchema = new mongoose.Schema<IGame>({
  players: [{
    userId:      String,
    username:    String,
    rank:        Number,
    coinsEarned: Number,
  }],
  status:     { type: String, default: 'waiting' },
  startedAt:  { type: Date, default: Date.now },
  finishedAt: Date,
});

export default mongoose.model<IGame>('Game', gameSchema);
