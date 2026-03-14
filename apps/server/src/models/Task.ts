import mongoose, { Schema, type Document } from 'mongoose';

export interface TaskDocument extends Document {
  spaceId: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  dueDate?: Date;
  tags: string[];
  comments: Array<{
    userId: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    status: {
      type: String,
      default: 'todo',
      validate: {
        validator: (v: string) => ['todo', 'in-progress', 'review', 'done'].includes(v),
        message: 'Invalid task status',
      },
    },
    priority: {
      type: String,
      default: 'medium',
      validate: {
        validator: (v: string) => ['low', 'medium', 'high', 'urgent'].includes(v),
        message: 'Invalid priority',
      },
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    tags: [{ type: String }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

taskSchema.index({ spaceId: 1, status: 1 });
taskSchema.index({ assigneeId: 1 });

export const Task = mongoose.model<TaskDocument>('Task', taskSchema);
