import mongoose, { Schema, type Document } from 'mongoose';

export interface SpaceDocument extends Document {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  ownerId: mongoose.Types.ObjectId;
  visibility: string;
  settings: {
    maxMembers: number;
    allowGuestPreview: boolean;
    defaultRoom?: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const spaceSchema = new Schema<SpaceDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 40,
      match: /^[a-z0-9-]+$/,
    },
    description: { type: String, default: '', maxlength: 500 },
    logoUrl: { type: String, default: '' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visibility: {
      type: String,
      default: 'private',
      validate: {
        validator: (v: string) => ['public', 'private', 'invite-only'].includes(v),
        message: 'Invalid visibility',
      },
    },
    settings: {
      maxMembers: { type: Number, default: 50 },
      allowGuestPreview: { type: Boolean, default: false },
      defaultRoom: { type: Schema.Types.ObjectId, ref: 'Room' },
    },
  },
  { timestamps: true }
);

spaceSchema.index({ slug: 1 });
spaceSchema.index({ ownerId: 1 });

export const Space = mongoose.model<SpaceDocument>('Space', spaceSchema);
