import { Router, type IRouter } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as assetController from '../controllers/asset.controller.js';

const router: IRouter = Router();

router.get('/', authMiddleware, assetController.getAssets);
router.get('/:id', authMiddleware, assetController.getAsset);

export default router;
