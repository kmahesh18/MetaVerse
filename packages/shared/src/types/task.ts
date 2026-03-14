export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  REVIEW: 'review',
  DONE: 'done',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TaskPriorityType = (typeof TaskPriority)[keyof typeof TaskPriority];

export interface TaskComment {
  userId: string;
  content: string;
  createdAt: Date;
}

export interface ITask {
  _id: string;
  spaceId: string;
  roomId?: string;
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  assigneeId?: string;
  assignedBy?: string;
  dueDate?: Date;
  tags: string[];
  comments: TaskComment[];
  createdAt: Date;
  updatedAt: Date;
}
