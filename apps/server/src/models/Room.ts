import mongoose, { Schema, type Document } from 'mongoose';

export interface RoomDocument extends Document {
  spaceId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: string;
  templateKey?: string;
  mapConfig: {
    width: number;
    height: number;
    tileSize: number;
    backgroundTileId: string;
    collisionMap: number[][];
    spawn?: {
      x: number;
      y: number;
    };
  };
  maxOccupancy: number;
  isLocked: boolean;
  passwordHash?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<RoomDocument>(
  {
    spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', maxlength: 500 },
    type: {
      type: String,
      default: 'office',
      validate: {
        validator: (v: string) =>
          ['lobby', 'office', 'meeting', 'lounge', 'garden', 'library', 'custom'].includes(v),
        message: 'Invalid room type',
      },
    },
    templateKey: { type: String, trim: true, default: 'friendly-lobby' },
    mapConfig: {
      width: { type: Number, default: 30 },
      height: { type: Number, default: 20 },
      tileSize: { type: Number, default: 16 },
      backgroundTileId: { type: String, default: 'floor-wood' },
      collisionMap: { type: [[Number]], default: [] },
      spawn: {
        x: { type: Number, default: 15 },
        y: { type: Number, default: 10 },
      },
    },
    maxOccupancy: { type: Number, default: 20 },
    isLocked: { type: Boolean, default: false },
    passwordHash: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

roomSchema.index({ spaceId: 1 });

export const Room = mongoose.model<RoomDocument>('Room', roomSchema);
