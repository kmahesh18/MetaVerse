import mongoose, { Schema, type Document } from 'mongoose';

export interface PlayerStateDocument extends Document {
  userId: mongoose.Types.ObjectId;
  spaceId?: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  position: { x: number; y: number };
  direction: string;
  isMoving: boolean;
  isSitting: boolean;
  socketId: string;
  updatedAt: Date;
}

const playerStateSchema = new Schema<PlayerStateDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    spaceId: { type: Schema.Types.ObjectId, ref: 'Space' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    direction: {
      type: String,
      default: 'down',
      validate: {
        validator: (v: string) => ['up', 'down', 'left', 'right'].includes(v),
        message: 'Invalid direction',
      },
    },
    isMoving: { type: Boolean, default: false },
    isSitting: { type: Boolean, default: false },
    socketId: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-cleanup stale states after 1 hour
playerStateSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 });

export const PlayerState = mongoose.model<PlayerStateDocument>('PlayerState', playerStateSchema);
