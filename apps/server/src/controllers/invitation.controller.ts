import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Invitation } from '../models/Invitation.js';
import { SpaceMember } from '../models/SpaceMember.js';
import { Space } from '../models/Space.js';
import { User } from '../models/User.js';
import {
  DEFAULT_PERMISSIONS,
  INVITATION_EXPIRY_DAYS,
  SpaceRole,
} from '@metaverse/shared';
import type { InvitationNotificationPayload } from '@metaverse/shared';
import { emitToUser } from '../socket/realtime.js';
import { canInvite, canManageMembers } from '../utils/space-access.js';

async function emitInvitationCountForUser(userId: string, email: string) {
  const count = await Invitation.countDocuments({
    inviteeEmail: email,
    status: 'pending',
  });
  await emitToUser(userId, 'invitation:count', { count });
}

export async function createInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { spaceId, inviteeEmail, role } = req.body;

    // Check if requester has invite permission
    const member = await SpaceMember.findOne({ spaceId, userId: req.userId });
    if (!member) {
      res.status(403).json({ error: 'Not a member of this space' });
      return;
    }

    if (!canInvite(member)) {
      res.status(403).json({ error: 'No invite permission' });
      return;
    }

    const space = await Space.findById(spaceId).select('name slug visibility');
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    // Check for existing pending invitation
    const existing = await Invitation.findOne({
      spaceId,
      inviteeEmail,
      status: 'pending',
    });
    if (existing) {
      res.status(409).json({ error: 'Invitation already pending for this email' });
      return;
    }

    // Check if user exists and is already a member
    const invitee = await User.findOne({ email: inviteeEmail });
    if (invitee) {
      const existingMember = await SpaceMember.findOne({
        spaceId,
        userId: invitee._id,
      });
      if (existingMember) {
        res.status(409).json({ error: 'User is already a member' });
        return;
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = await Invitation.create({
      spaceId,
      inviterId: req.userId,
      inviteeEmail,
      inviteeId: invitee?._id,
      role: role || (space.visibility === 'public' ? 'collaborator' : SpaceRole.MEMBER),
      expiresAt,
    });

    if (invitee?._id) {
      const inviter = await User.findById(req.userId).select('displayName');
      const payload: InvitationNotificationPayload = {
        invitationId: invitation._id.toString(),
        token: invitation.token,
        spaceId: space._id.toString(),
        spaceName: space.name,
        spaceSlug: space.slug,
        inviterId: req.userId ?? '',
        inviterName: inviter?.displayName ?? 'A teammate',
        role: invitation.role,
        createdAt: invitation.createdAt.toISOString(),
      };
      await emitToUser(invitee._id.toString(), 'invitation:new', payload);
      await emitInvitationCountForUser(invitee._id.toString(), invitee.email);
    }

    res.status(201).json(invitation);
  } catch {
    res.status(500).json({ error: 'Failed to create invitation' });
  }
}

export async function getSpaceInvitations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { spaceId } = req.params;
    const member = await SpaceMember.findOne({ spaceId, userId: req.userId });
    if (!canManageMembers(member) && !canInvite(member)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const invitations = await Invitation.find({ spaceId, status: 'pending' }).populate(
      'inviterId',
      'displayName'
    );
    res.json(invitations);
  } catch {
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
}

export async function getMyInvitations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const invitations = await Invitation.find({
      inviteeEmail: user.email,
      status: 'pending',
    })
      .populate('spaceId', 'name slug')
      .populate('inviterId', 'displayName');

    res.json(invitations);
  } catch {
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
}

export async function acceptInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const invitation = await Invitation.findOne({
      token: req.params.token,
      status: 'pending',
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found or already used' });
      return;
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      res.status(410).json({ error: 'Invitation expired' });
      return;
    }

    // Verify the accepting user matches the invitee
    const user = await User.findById(req.userId);
    if (!user || user.email !== invitation.inviteeEmail) {
      res.status(403).json({ error: 'This invitation is not for you' });
      return;
    }

    // Add as member
    await SpaceMember.create({
      spaceId: invitation.spaceId,
      userId: req.userId,
      role: invitation.role,
      permissions:
        DEFAULT_PERMISSIONS[invitation.role] || DEFAULT_PERMISSIONS['member'],
      invitedBy: invitation.inviterId,
    });

    invitation.status = 'accepted';
    invitation.inviteeId = user._id;
    await invitation.save();

    await emitInvitationCountForUser(user._id.toString(), user.email);

    res.json({ message: 'Invitation accepted' });
  } catch {
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
}

export async function declineInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const invitation = await Invitation.findOne({
      token: req.params.token,
      status: 'pending',
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    const user = await User.findById(req.userId);
    invitation.status = 'declined';
    await invitation.save();

    if (user) {
      await emitInvitationCountForUser(user._id.toString(), user.email);
    }

    res.json({ message: 'Invitation declined' });
  } catch {
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
}
