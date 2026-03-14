import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import * as roomController from '../controllers/room.controller.js';
import { CURATED_ROOM_TEMPLATES } from '@metaverse/shared';

const router: IRouter = Router();
const templateKeys = CURATED_ROOM_TEMPLATES.map((template) => template.key) as [string, ...string[]];

const createRoomSchema = z.object({
  spaceId: z.string().min(1),
  name: z.string().min(1).max(60).trim(),
  description: z.string().max(500).optional(),
  type: z.enum(['lobby', 'office', 'meeting', 'lounge', 'garden', 'library', 'custom']).optional(),
  templateKey: z.enum(templateKeys),
  mapConfig: z
    .object({
      width: z.number().min(5).max(64).optional(),
      height: z.number().min(5).max(64).optional(),
    })
    .optional(),
  maxOccupancy: z.number().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
});

const updateRoomSchema = z.object({
  name: z.string().min(1).max(60).trim().optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['lobby', 'office', 'meeting', 'lounge', 'garden', 'library', 'custom']).optional(),
  templateKey: z.enum(templateKeys).optional(),
  maxOccupancy: z.number().min(1).max(100).optional(),
  isLocked: z.boolean().optional(),
  order: z.number().int().min(0).max(7).optional(),
  isDefault: z.boolean().optional(),
});

router.post('/', authMiddleware, validate(createRoomSchema), roomController.createRoom);
router.get('/space/:spaceId', authMiddleware, roomController.getRooms);
router.get('/:roomId/world', authMiddleware, roomController.getWorld);
router.get('/:roomId', authMiddleware, roomController.getRoom);
router.patch('/:roomId', authMiddleware, validate(updateRoomSchema), roomController.updateRoom);
router.delete('/:roomId', authMiddleware, roomController.deleteRoom);

// Room objects
router.post('/:roomId/objects', authMiddleware, roomController.placeObject);
router.get('/:roomId/objects', authMiddleware, roomController.getObjects);
router.patch('/:roomId/objects/:objectId', authMiddleware, roomController.updateObject);
router.delete('/:roomId/objects/:objectId', authMiddleware, roomController.removeObject);

export default router;
