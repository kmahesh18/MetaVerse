import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { displayName, preferences } = req.body;
    const update: Record<string, unknown> = {};

    if (displayName) update.displayName = displayName;
    if (preferences) {
      if (preferences.theme) update['preferences.theme'] = preferences.theme;
      if (typeof preferences.audioEnabled === 'boolean')
        update['preferences.audioEnabled'] = preferences.audioEnabled;
      if (typeof preferences.videoEnabled === 'boolean')
        update['preferences.videoEnabled'] = preferences.videoEnabled;
      if (typeof preferences.volume === 'number')
        update['preferences.volume'] = preferences.volume;
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true }).select(
      '-passwordHash'
    );
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
}

export async function updateAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { spriteIndex, skinTone, outfit } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'avatarConfig.spriteIndex': spriteIndex ?? 0,
          'avatarConfig.skinTone': skinTone ?? 0,
          'avatarConfig.outfit': outfit ?? 0,
        },
      },
      { new: true }
    ).select('-passwordHash');
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Avatar update failed' });
  }
}

export async function getUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.params.id).select(
      'displayName avatarConfig status lastSeen'
    );
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
