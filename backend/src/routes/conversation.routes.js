import { Router } from 'express';
import {
  getOrCreateConversation,
  getMyConversations,
} from '../controllers/conversation.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getMyConversations);
router.post('/', getOrCreateConversation);

export default router;
