import mongoose, { Schema, type Document } from 'mongoose';

export interface AvatarDocument extends Document {
  name: string;
  spriteSheetUrl: string;
  frameConfig: {
    frameWidth: number;
    frameHeight: number;
    animations: Record<string, { start: number; end: number }>;
  };
  isDefault: boolean;
  createdAt: Date;
}

const avatarSchema = new Schema<AvatarDocument>({
  name: { type: String, required: true, trim: true },
  spriteSheetUrl: { type: String, required: true },
  frameConfig: {
    frameWidth: { type: Number, default: 16 },
    frameHeight: { type: Number, default: 16 },
    animations: { type: Schema.Types.Mixed, default: {} },
  },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Avatar = mongoose.model<AvatarDocument>('Avatar', avatarSchema);
