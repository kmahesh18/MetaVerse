import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Message } from '../models/Message.js';

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type, content, roomId, spaceId, recipientId } = req.body;

    const message = await Message.create({
      type,
      senderId: req.userId,
      content,
      roomId,
      spaceId,
      recipientId,
    });

    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: 'Failed to send message' });
  }
}

export async function getRoomMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { roomId } = req.params;
    const { before, limit } = req.query;
    const pageLimit = Math.min(Number(limit) || 50, 100);

    const filter: Record<string, unknown> = { roomId, type: 'room' };
    if (before) filter.createdAt = { $lt: new Date(before as string) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(pageLimit)
      .populate('senderId', 'displayName avatarConfig');

    res.json(messages.reverse());
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

export async function getDMMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { before, limit } = req.query;
    const pageLimit = Math.min(Number(limit) || 50, 100);

    const filter: Record<string, unknown> = {
      type: 'direct',
      $or: [
        { senderId: req.userId, recipientId: userId },
        { senderId: userId, recipientId: req.userId },
      ],
    };
    if (before) filter.createdAt = { $lt: new Date(before as string) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(pageLimit)
      .populate('senderId', 'displayName avatarConfig');

    res.json(messages.reverse());
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}
