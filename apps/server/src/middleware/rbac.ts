import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { SpaceMember } from '../models/SpaceMember.js';
import { ROLE_HIERARCHY } from '@metaverse/shared';
import type { SpaceRoleType } from '@metaverse/shared';

export function requireRole(...roles: SpaceRoleType[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const spaceId = req.params.spaceId || req.params.slug;
    const userId = req.userId;

    if (!userId || !spaceId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const member = await SpaceMember.findOne({ spaceId, userId });

    if (!member) {
      res.status(403).json({ error: 'Not a member of this space' });
      return;
    }

    const memberRole = member.role as SpaceRoleType;
    const minRoleLevel = Math.min(...roles.map((r) => ROLE_HIERARCHY[r]));

    if (ROLE_HIERARCHY[memberRole] < minRoleLevel) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const spaceId = req.params.spaceId || req.params.slug;
    const userId = req.userId;

    if (!userId || !spaceId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const member = await SpaceMember.findOne({ spaceId, userId });

    if (!member) {
      res.status(403).json({ error: 'Not a member of this space' });
      return;
    }

    // Owners and admins bypass permission checks
    if (member.role === 'owner' || member.role === 'admin') {
      next();
      return;
    }

    const perms = member.permissions as Record<string, boolean>;
    if (!perms[permission]) {
      res.status(403).json({ error: `Missing permission: ${permission}` });
      return;
    }

    next();
  };
}
