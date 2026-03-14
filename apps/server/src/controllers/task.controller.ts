import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Task } from '../models/Task.js';

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const task = await Task.create({
      ...req.body,
      assignedBy: req.userId,
    });
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { spaceId } = req.params;
    const { status, assigneeId } = req.query;
    const filter: Record<string, unknown> = { spaceId };

    if (status) filter.status = status;
    if (assigneeId) filter.assigneeId = assigneeId;

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .populate('assigneeId', 'displayName avatarConfig')
      .populate('assignedBy', 'displayName');

    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

export async function getTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assigneeId', 'displayName avatarConfig')
      .populate('assignedBy', 'displayName')
      .populate('comments.userId', 'displayName');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const updated = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $set: req.body },
      { new: true }
    );
    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
}

export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.taskId);
    if (!deleted) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ message: 'Task deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
}

export async function addComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Comment content required' });
      return;
    }

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        $push: {
          comments: {
            userId: req.userId,
            content: content.slice(0, 1000),
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to add comment' });
  }
}
