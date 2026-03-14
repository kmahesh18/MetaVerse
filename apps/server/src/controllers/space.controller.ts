import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Space } from '../models/Space.js';
import { SpaceMember } from '../models/SpaceMember.js';
import { Room } from '../models/Room.js';
import { RoomObject } from '../models/RoomObject.js';
import { DEFAULT_PERMISSIONS, SpaceRole } from '@metaverse/shared';
import type { RoomBlueprintInput } from '@metaverse/shared';
import { createCuratedRoomsFromBlueprints } from '../world/space-layout.js';
import {
  canManageMembers,
  canManageRooms,
  getSpaceBySlug,
  getSpaceMember,
} from '../utils/space-access.js';

function serializeSpace(
  space: Awaited<ReturnType<typeof getSpaceBySlug>>,
  membership: {
    role: string;
    permissions: Record<string, boolean>;
  } | null
) {
  if (!space) return null;
  return {
    ...space.toObject(),
    myRole: membership?.role,
    myPermissions: membership?.permissions ?? null,
    isMember: Boolean(membership),
    defaultRoomId: space.settings.defaultRoom?.toString(),
  };
}

export async function createSpace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, slug, description, visibility, roomBlueprints } = req.body as {
      name: string;
      slug: string;
      description?: string;
      visibility?: 'public' | 'private' | 'invite-only';
      roomBlueprints: RoomBlueprintInput[];
    };

    const existing = await Space.findOne({ slug });
    if (existing) {
      res.status(409).json({ error: 'Slug already taken' });
      return;
    }

    const space = await Space.create({
      name,
      slug,
      description: description || '',
      ownerId: req.userId,
      visibility: visibility || 'private',
    });

    const ownerMembership = await SpaceMember.create({
      spaceId: space._id,
      userId: req.userId,
      role: SpaceRole.OWNER,
      permissions: DEFAULT_PERMISSIONS[SpaceRole.OWNER],
    });

    const defaultRoomId = await createCuratedRoomsFromBlueprints(
      space._id.toString(),
      req.userId ?? '',
      roomBlueprints
    );
    space.set('settings.defaultRoom', defaultRoomId);
    await space.save();

    res.status(201).json(serializeSpace(space, ownerMembership));
  } catch {
    res.status(500).json({ error: 'Failed to create space' });
  }
}

export async function getMySpaces(req: AuthRequest, res: Response): Promise<void> {
  try {
    const memberships = await SpaceMember.find({ userId: req.userId }).select(
      'spaceId role permissions'
    );
    const spaceIds = memberships.map((member) => member.spaceId);
    const spaces = await Space.find({ _id: { $in: spaceIds } });

    const result = spaces.map((space) => {
      const membership = memberships.find((member) => member.spaceId.toString() === space._id.toString());
      return serializeSpace(space, membership ?? null);
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch spaces' });
  }
}

export async function getSpace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    const membership = await getSpaceMember(space._id.toString(), req.userId);

    if (!membership && space.visibility !== 'public') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(serializeSpace(space, membership));
  } catch {
    res.status(500).json({ error: 'Failed to fetch space' });
  }
}

export async function updateSpace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    const membership = await getSpaceMember(space._id.toString(), req.userId);
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this space' });
      return;
    }

    const isOwner = space.ownerId.toString() === req.userId;
    const update: Record<string, unknown> = {};

    if (req.body.visibility !== undefined) {
      if (!isOwner) {
        res.status(403).json({ error: 'Only the owner can change visibility' });
        return;
      }
      update.visibility = req.body.visibility;
    }

    if (req.body.name !== undefined || req.body.description !== undefined) {
      if (!canManageRooms(membership) && !isOwner) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      if (req.body.name !== undefined) update.name = req.body.name;
      if (req.body.description !== undefined) update.description = req.body.description;
    }

    if (req.body.defaultRoomId) {
      if (!canManageRooms(membership)) {
        res.status(403).json({ error: 'Missing room management permission' });
        return;
      }

      const room = await Room.findOne({
        _id: String(req.body.defaultRoomId),
        spaceId: space._id,
      }).select('_id');
      if (!room) {
        res.status(404).json({ error: 'Default room not found in this space' });
        return;
      }

      update['settings.defaultRoom'] = room._id;
    }

    if (Object.keys(update).length === 0) {
      res.json(serializeSpace(space, membership));
      return;
    }

    const updated = await Space.findByIdAndUpdate(space._id, { $set: update }, { new: true });
    res.json(serializeSpace(updated, membership));
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
}

export async function deleteSpace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    if (space.ownerId.toString() !== req.userId) {
      res.status(403).json({ error: 'Only the owner can delete a space' });
      return;
    }

    const rooms = await Room.find({ spaceId: space._id }).select('_id');
    const roomIds = rooms.map((room) => room._id);
    await RoomObject.deleteMany({ roomId: { $in: roomIds } });
    await Room.deleteMany({ spaceId: space._id });
    await SpaceMember.deleteMany({ spaceId: space._id });
    await Space.findByIdAndDelete(space._id);

    res.json({ message: 'Space deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
}

export async function joinPublicSpace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    if (space.visibility !== 'public') {
      res.status(403).json({ error: 'Only public spaces support self-join' });
      return;
    }

    const existing = await getSpaceMember(space._id.toString(), req.userId);
    if (existing) {
      res.json(serializeSpace(space, existing));
      return;
    }

    const member = await SpaceMember.create({
      spaceId: space._id,
      userId: req.userId,
      role: 'collaborator',
      permissions: DEFAULT_PERMISSIONS.collaborator,
    });

    res.status(201).json(serializeSpace(space, member));
  } catch {
    res.status(500).json({ error: 'Failed to join space' });
  }
}

export async function leaveSpace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    if (space.ownerId.toString() === req.userId) {
      res.status(400).json({ error: 'The founding owner cannot leave the space' });
      return;
    }

    const membership = await getSpaceMember(space._id.toString(), req.userId);
    if (!membership) {
      res.status(404).json({ error: 'You are not a member of this space' });
      return;
    }

    await SpaceMember.findByIdAndDelete(membership._id);
    res.json({ message: 'Left space' });
  } catch {
    res.status(500).json({ error: 'Failed to leave space' });
  }
}

export async function getMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    const membership = await getSpaceMember(space._id.toString(), req.userId);
    if (!membership && space.visibility !== 'public') {
      res.status(403).json({ error: 'Not a member of this space' });
      return;
    }

    const members = await SpaceMember.find({ spaceId: space._id }).populate(
      'userId',
      'displayName avatarConfig status email'
    );
    res.json(members);
  } catch {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

export async function addMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    const requester = await getSpaceMember(space._id.toString(), req.userId);
    if (!canManageMembers(requester)) {
      res.status(403).json({ error: 'Missing member management permission' });
      return;
    }

    const { userId, role } = req.body as { userId: string; role?: string };
    const effectiveRole =
      role || (space.visibility === 'public' ? 'collaborator' : SpaceRole.MEMBER);

    if (effectiveRole === SpaceRole.OWNER) {
      res.status(403).json({ error: 'Use ownership transfer to assign owner role' });
      return;
    }

    const existing = await SpaceMember.findOne({ spaceId: space._id, userId });
    if (existing) {
      res.status(409).json({ error: 'User is already a member' });
      return;
    }

    const member = await SpaceMember.create({
      spaceId: space._id,
      userId,
      role: effectiveRole,
      permissions: DEFAULT_PERMISSIONS[effectiveRole] || DEFAULT_PERMISSIONS.member,
      invitedBy: req.userId,
    });

    res.status(201).json(member);
  } catch {
    res.status(500).json({ error: 'Failed to add member' });
  }
}

export async function updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    const requester = await getSpaceMember(space._id.toString(), req.userId);
    if (!canManageMembers(requester)) {
      res.status(403).json({ error: 'Missing member management permission' });
      return;
    }

    const { role } = req.body as { role: string };
    const targetMember = await SpaceMember.findOne({
      spaceId: space._id,
      userId: String(req.params.userId),
    });

    if (!targetMember) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    if (targetMember.userId.toString() === space.ownerId.toString() && space.ownerId.toString() !== req.userId) {
      res.status(403).json({ error: 'Only the owner can manage the owner role' });
      return;
    }

    if (role === SpaceRole.OWNER) {
      if (space.ownerId.toString() !== req.userId) {
        res.status(403).json({ error: 'Only the owner can transfer ownership' });
        return;
      }

      const currentOwner = await SpaceMember.findOne({
        spaceId: space._id,
        userId: req.userId,
      });
      if (!currentOwner) {
        res.status(404).json({ error: 'Owner membership not found' });
        return;
      }

      currentOwner.role = SpaceRole.ADMIN;
      currentOwner.permissions = DEFAULT_PERMISSIONS[SpaceRole.ADMIN];
      await currentOwner.save();

      targetMember.role = SpaceRole.OWNER;
      targetMember.permissions = DEFAULT_PERMISSIONS[SpaceRole.OWNER];
      await targetMember.save();

      space.ownerId = targetMember.userId;
      await space.save();

      res.json(targetMember);
      return;
    }

    targetMember.role = role;
    targetMember.permissions = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.member;
    await targetMember.save();

    res.json(targetMember);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
}

export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const space = await getSpaceBySlug(String(req.params.slug));
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    const requester = await getSpaceMember(space._id.toString(), req.userId);
    if (!canManageMembers(requester) && String(req.params.userId) !== req.userId) {
      res.status(403).json({ error: 'Missing member management permission' });
      return;
    }

    if (String(req.params.userId) === space.ownerId.toString()) {
      res.status(400).json({ error: 'Cannot remove the founding owner' });
      return;
    }

    await SpaceMember.findOneAndDelete({
      spaceId: space._id,
      userId: String(req.params.userId),
    });

    res.json({ message: 'Member removed' });
  } catch {
    res.status(500).json({ error: 'Remove failed' });
  }
}
