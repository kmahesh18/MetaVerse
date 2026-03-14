import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import * as spaceController from '../controllers/space.controller.js';
import { CURATED_ROOM_TEMPLATES } from '@metaverse/shared';

const router: IRouter = Router();
const templateKeys = CURATED_ROOM_TEMPLATES.map((template) => template.key) as [string, ...string[]];
const roomBlueprintSchema = z.object({
  templateKey: z.enum(templateKeys),
  name: z.string().min(1).max(60).trim(),
  isDefault: z.boolean().optional(),
});

const createSpaceSchema = z.object({
  name: z.string().min(1).max(60).trim(),
  slug: z
    .string()
    .min(1)
    .max(40)
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private', 'invite-only']).optional(),
  roomBlueprints: z.array(roomBlueprintSchema).min(1).max(8),
});

const updateSpaceSchema = z.object({
  name: z.string().min(1).max(60).trim().optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private', 'invite-only']).optional(),
  defaultRoomId: z.string().min(1).optional(),
});

router.post('/', authMiddleware, validate(createSpaceSchema), spaceController.createSpace);
router.get('/', authMiddleware, spaceController.getMySpaces);
router.get('/:slug', authMiddleware, spaceController.getSpace);
router.patch('/:slug', authMiddleware, validate(updateSpaceSchema), spaceController.updateSpace);
router.delete('/:slug', authMiddleware, spaceController.deleteSpace);
router.post('/:slug/join', authMiddleware, spaceController.joinPublicSpace);
router.post('/:slug/leave', authMiddleware, spaceController.leaveSpace);

// Members
router.get('/:slug/members', authMiddleware, spaceController.getMembers);
router.post('/:slug/members', authMiddleware, spaceController.addMember);
router.patch('/:slug/members/:userId', authMiddleware, spaceController.updateMemberRole);
router.delete('/:slug/members/:userId', authMiddleware, spaceController.removeMember);

export default router;
