import mongoose, { Schema, type Document } from 'mongoose';

export interface RoomObjectDocument extends Document {
  roomId: mongoose.Types.ObjectId;
  assetId: mongoose.Types.ObjectId;
  position: { x: number; y: number };
  rotation: number;
  zIndex: number;
  isObstacle: boolean;
  isInteractive: boolean;
  interactionType: string;
  interactionData: {
    content?: string;
    targetRoomId?: mongoose.Types.ObjectId;
    mediaUrl?: string;
  };
  placedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomObjectSchema = new Schema<RoomObjectDocument>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    rotation: { type: Number, default: 0 },
    zIndex: { type: Number, default: 0 },
    isObstacle: { type: Boolean, default: false },
    isInteractive: { type: Boolean, default: false },
    interactionType: {
      type: String,
      default: 'none',
      validate: {
        validator: (v: string) =>
          ['none', 'sit', 'read', 'use', 'teleport', 'whiteboard'].includes(v),
        message: 'Invalid interaction type',
      },
    },
    interactionData: {
      content: { type: String },
      targetRoomId: { type: Schema.Types.ObjectId, ref: 'Room' },
      mediaUrl: { type: String },
    },
    placedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

roomObjectSchema.index({ roomId: 1 });

export const RoomObject = mongoose.model<RoomObjectDocument>('RoomObject', roomObjectSchema);
