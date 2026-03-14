import mongoose, { Schema, type Document } from 'mongoose';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  avatarConfig: {
    spriteIndex: number;
    skinTone: number;
    outfit: number;
  };
  status: string;
  lastSeen: Date;
  preferences: {
    theme: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    volume: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 30 },
    avatarConfig: {
      spriteIndex: { type: Number, default: 0 },
      skinTone: { type: Number, default: 0 },
      outfit: { type: Number, default: 0 },
    },
    status: {
      type: String,
      default: 'offline',
      validate: {
        validator: (v: string) => ['online', 'away', 'busy', 'offline'].includes(v),
        message: 'Invalid status',
      },
    },
    lastSeen: { type: Date, default: Date.now },
    preferences: {
      theme: { type: String, default: 'dark' },
      audioEnabled: { type: Boolean, default: true },
      videoEnabled: { type: Boolean, default: false },
      volume: { type: Number, default: 80, min: 0, max: 100 },
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

export const User = mongoose.model<UserDocument>('User', userSchema);
