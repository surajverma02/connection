import { Router } from 'express';
import { saveCall, getCallHistory } from '../controllers/call.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

router.post('/', saveCall);
router.get('/history', getCallHistory);

export default router;
