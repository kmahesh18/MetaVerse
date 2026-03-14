import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import * as messageController from '../controllers/message.controller.js';

const router: IRouter = Router();

const sendSchema = z.object({
  type: z.enum(['room', 'direct', 'broadcast', 'proximity']),
  content: z.string().min(1).max(2000),
  roomId: z.string().optional(),
  spaceId: z.string().optional(),
  recipientId: z.string().optional(),
});

router.post('/', authMiddleware, validate(sendSchema), messageController.sendMessage);
router.get('/room/:roomId', authMiddleware, messageController.getRoomMessages);
router.get('/dm/:userId', authMiddleware, messageController.getDMMessages);

export default router;
