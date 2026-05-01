import mongoose, { Document, Schema } from 'mongoose';

export interface IActiveGame extends Document {
  gameId: string;
  state: Record<string, unknown>;
}

const ActiveGameSchema = new Schema<IActiveGame>(
  {
    gameId: { type: String, unique: true, required: true },
    state:  { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const ActiveGame = mongoose.model<IActiveGame>('ActiveGame', ActiveGameSchema);
