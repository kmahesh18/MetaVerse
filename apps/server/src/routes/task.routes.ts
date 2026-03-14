import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import * as taskController from '../controllers/task.controller.js';

const router: IRouter = Router();

const createTaskSchema = z.object({
  spaceId: z.string().min(1),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  roomId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['todo', 'in-progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

router.post('/', authMiddleware, validate(createTaskSchema), taskController.createTask);
router.get('/space/:spaceId', authMiddleware, taskController.getTasks);
router.get('/:taskId', authMiddleware, taskController.getTask);
router.patch('/:taskId', authMiddleware, validate(updateTaskSchema), taskController.updateTask);
router.delete('/:taskId', authMiddleware, taskController.deleteTask);
router.post('/:taskId/comments', authMiddleware, taskController.addComment);

export default router;
