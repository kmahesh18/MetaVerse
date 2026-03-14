import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import * as invitationController from '../controllers/invitation.controller.js';

const router: IRouter = Router();

const createInvitationSchema = z.object({
  spaceId: z.string().min(1),
  inviteeEmail: z.string().email(),
  role: z.enum(['member', 'moderator', 'admin', 'collaborator']).optional(),
});

router.post(
  '/',
  authMiddleware,
  validate(createInvitationSchema),
  invitationController.createInvitation
);
router.get('/space/:spaceId', authMiddleware, invitationController.getSpaceInvitations);
router.get('/my', authMiddleware, invitationController.getMyInvitations);
router.post('/:token/accept', authMiddleware, invitationController.acceptInvitation);
router.post('/:token/decline', authMiddleware, invitationController.declineInvitation);

export default router;
