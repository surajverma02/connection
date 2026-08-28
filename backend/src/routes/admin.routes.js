import { Router } from 'express';
import { listUsers, setBanStatus, getStats } from '../controllers/admin.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import roleMiddleware from '../middleware/role.middleware.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware, roleMiddleware('admin'));

router.get('/users', listUsers);
router.patch('/users/:id/ban', setBanStatus);
router.get('/stats', getStats);

export default router;
