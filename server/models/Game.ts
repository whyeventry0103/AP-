import mongoose, { Document, Schema } from 'mongoose';

export interface IGamePlayer {
  userId: mongoose.Types.ObjectId;
  username: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  rank: number | null;
  coinsEarned: number;
}

export interface IGame extends Document {
  total_players: number;
  players: IGamePlayer[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  finishedAt?: Date;
}

const GamePlayerSchema = new Schema<IGamePlayer>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  color: { type: String, enum: ['red', 'blue', 'green', 'yellow'], required: true },
  rank: { type: Number, default: null },
  coinsEarned: { type: Number, default: 0 }
}, { _id: false });

const GameSchema = new Schema<IGame>({
  total_players: { type: Number, required: true },
  players: [GamePlayerSchema],
  status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now },
  finishedAt: { type: Date }
});

export const Game = mongoose.model<IGame>('Game', GameSchema);
