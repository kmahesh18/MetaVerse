import mongoose, { Schema, type Document } from 'mongoose';

export interface MessageDocument extends Document {
  type: string;
  senderId: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  spaceId?: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId;
  content: string;
  attachments: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const messageSchema = new Schema<MessageDocument>({
  type: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => ['room', 'direct', 'broadcast', 'proximity'].includes(v),
      message: 'Invalid message type',
    },
  },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
  spaceId: { type: Schema.Types.ObjectId, ref: 'Space' },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true, maxlength: 2000 },
  attachments: [
    {
      type: { type: String },
      url: { type: String },
      name: { type: String },
    },
  ],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ spaceId: 1, createdAt: -1 });

export const Message = mongoose.model<MessageDocument>('Message', messageSchema);
