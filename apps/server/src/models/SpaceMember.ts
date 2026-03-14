import mongoose, { Schema, type Document } from 'mongoose';

export interface SpaceMemberDocument extends Document {
  spaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: string;
  permissions: {
    canInvite: boolean;
    canManageRooms: boolean;
    canManageMembers: boolean;
    canBroadcast: boolean;
    canManageAssets: boolean;
  };
  joinedAt: Date;
  invitedBy?: mongoose.Types.ObjectId;
}

const spaceMemberSchema = new Schema<SpaceMemberDocument>({
  spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: {
    type: String,
    default: 'member',
    validate: {
      validator: (v: string) =>
        ['owner', 'admin', 'collaborator', 'moderator', 'member', 'guest'].includes(v),
      message: 'Invalid role',
    },
  },
  permissions: {
    canInvite: { type: Boolean, default: false },
    canManageRooms: { type: Boolean, default: false },
    canManageMembers: { type: Boolean, default: false },
    canBroadcast: { type: Boolean, default: false },
    canManageAssets: { type: Boolean, default: false },
  },
  joinedAt: { type: Date, default: Date.now },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

spaceMemberSchema.index({ spaceId: 1, userId: 1 }, { unique: true });
spaceMemberSchema.index({ userId: 1 });

export const SpaceMember = mongoose.model<SpaceMemberDocument>('SpaceMember', spaceMemberSchema);
