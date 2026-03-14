import { Router, type IRouter } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as userController from '../controllers/user.controller.js';

const router: IRouter = Router();

router.get('/me', authMiddleware, userController.getMe);
router.patch('/me', authMiddleware, userController.updateMe);
router.patch('/me/avatar', authMiddleware, userController.updateAvatar);
router.get('/:id', authMiddleware, userController.getUser);

export default router;
