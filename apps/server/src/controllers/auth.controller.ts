import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.js';

export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, displayName, spriteIndex } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const validIndex = typeof spriteIndex === 'number' && spriteIndex >= 0 && spriteIndex <= 3
      ? spriteIndex
      : Math.floor(Math.random() * 4);

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      displayName,
      avatarConfig: { spriteIndex: validIndex, skinTone: 0, outfit: 0 },
    });

    const tokens = generateTokenPair({ userId: user._id.toString(), email: user.email });

    res.status(201).json({
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatarConfig: user.avatarConfig,
        status: user.status,
        preferences: user.preferences,
      },
      ...tokens,
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const tokens = generateTokenPair({ userId: user._id.toString(), email: user.email });

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatarConfig: user.avatarConfig,
        status: user.status,
        preferences: user.preferences,
      },
      ...tokens,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function refresh(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const payload = verifyRefreshToken(refreshToken);
    const tokens = generateTokenPair({ userId: payload.userId, email: payload.email });
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, { status: 'offline', lastSeen: new Date() });
    }
    res.json({ message: 'Logged out' });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
}
