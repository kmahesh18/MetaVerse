import mongoose, { Schema, type Document } from 'mongoose';
import crypto from 'crypto';

export interface InvitationDocument extends Document {
  spaceId: mongoose.Types.ObjectId;
  inviterId: mongoose.Types.ObjectId;
  inviteeEmail: string;
  inviteeId?: mongoose.Types.ObjectId;
  role: string;
  status: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const invitationSchema = new Schema<InvitationDocument>({
  spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: true },
  inviterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  inviteeEmail: { type: String, required: true, lowercase: true, trim: true },
  inviteeId: { type: Schema.Types.ObjectId, ref: 'User' },
  role: {
    type: String,
    default: 'member',
    validate: {
      validator: (v: string) =>
        ['member', 'moderator', 'admin', 'collaborator'].includes(v),
      message: 'Invalid invitation role',
    },
  },
  status: {
    type: String,
    default: 'pending',
    validate: {
      validator: (v: string) => ['pending', 'accepted', 'declined', 'expired'].includes(v),
      message: 'Invalid invitation status',
    },
  },
  token: { type: String, required: true, unique: true, default: () => crypto.randomUUID() },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

invitationSchema.index({ spaceId: 1, status: 1 });
invitationSchema.index({ token: 1 });
invitationSchema.index({ inviteeEmail: 1 });

export const Invitation = mongoose.model<InvitationDocument>('Invitation', invitationSchema);
