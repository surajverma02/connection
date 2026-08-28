import { Router } from 'express';
import { getMessages, sendMessage, markSeen } from '../controllers/message.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/:conversationId', getMessages);
router.post('/:conversationId', sendMessage);
router.patch('/:conversationId/seen', markSeen);

export default router;
