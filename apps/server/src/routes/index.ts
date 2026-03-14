import { Router, type IRouter } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import spaceRoutes from './space.routes.js';
import roomRoutes from './room.routes.js';
import assetRoutes from './asset.routes.js';
import messageRoutes from './message.routes.js';
import taskRoutes from './task.routes.js';
import invitationRoutes from './invitation.routes.js';
import { registerTurnRoutes } from './turn.js';

const router: IRouter = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/spaces', spaceRoutes);
router.use('/rooms', roomRoutes);
router.use('/assets', assetRoutes);
router.use('/messages', messageRoutes);
router.use('/tasks', taskRoutes);
router.use('/invitations', invitationRoutes);

registerTurnRoutes(router);

export default router;
