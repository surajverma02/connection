import { Router } from 'express';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  listFriends,
  listPendingRequests,
} from '../controllers/friend.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

// All friend routes require auth
router.use(authMiddleware);

router.get('/search', searchUsers);
router.get('/', listFriends);
router.get('/requests/pending', listPendingRequests);
router.post('/request', sendFriendRequest);
router.patch('/request/:requestId/accept', acceptFriendRequest);
router.patch('/request/:requestId/reject', rejectFriendRequest);
router.delete('/:userId', removeFriend);

export default router;
