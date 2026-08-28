import { Router } from 'express';
import { updateProfile, changePassword } from '../controllers/profile.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.patch('/', updateProfile);
router.post('/change-password', changePassword);

export default router;
