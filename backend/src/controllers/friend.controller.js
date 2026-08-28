import User from '../models/user.model.js';
import FriendRequest from '../models/friendRequest.model.js';
import { io, onlineUsers } from '../index.js';

// ─── Search users (exclude self + existing friends) ─────────────────────────

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ message: 'Query parameter "q" is required' });
    }

    const users = await User.find({
      $text: { $search: q },
      _id: { $ne: req.user._id },
      isBanned: false,
    })
      .select('name email avatarUrl bio status')
      .limit(20);

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// ─── Send friend request ─────────────────────────────────────────────────────

export const sendFriendRequest = async (req, res, next) => {
  try {
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ message: 'toUserId is required' });

    if (toUserId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send a friend request to yourself' });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: 'User not found' });

    // Check if already friends (accepted request exists either direction)
    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user._id, to: toUserId },
        { from: toUserId, to: req.user._id },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json({ message: 'Already friends' });
      }
      if (existing.status === 'pending') {
        return res.status(409).json({ message: 'Friend request already sent' });
      }
      // Rejected — allow re-sending by updating status
      existing.status = 'pending';
      await existing.save();
      
      const socketId = onlineUsers.get(toUserId);
      if (socketId) io.to(socketId).emit('friendUpdate');

      return res.status(200).json({ friendRequest: existing });
    }

    const friendRequest = await FriendRequest.create({
      from: req.user._id,
      to: toUserId,
    });

    const socketId = onlineUsers.get(toUserId);
    if (socketId) io.to(socketId).emit('friendUpdate');

    res.status(201).json({ friendRequest });
  } catch (err) {
    next(err);
  }
};

// ─── Accept friend request ───────────────────────────────────────────────────

export const acceptFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const request = await FriendRequest.findOne({
      _id: requestId,
      to: req.user._id,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ message: 'Pending friend request not found' });
    }

    request.status = 'accepted';
    await request.save();

    const socketId = onlineUsers.get(request.from.toString());
    if (socketId) io.to(socketId).emit('friendUpdate');

    res.json({ friendRequest: request });
  } catch (err) {
    next(err);
  }
};

// ─── Reject friend request ───────────────────────────────────────────────────

export const rejectFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const request = await FriendRequest.findOne({
      _id: requestId,
      to: req.user._id,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ message: 'Pending friend request not found' });
    }

    request.status = 'rejected';
    await request.save();

    const socketId = onlineUsers.get(request.from.toString());
    if (socketId) io.to(socketId).emit('friendUpdate');

    res.json({ friendRequest: request });
  } catch (err) {
    next(err);
  }
};

// ─── Remove friend (delete accepted request) ─────────────────────────────────

export const removeFriend = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await FriendRequest.findOneAndDelete({
      status: 'accepted',
      $or: [
        { from: req.user._id, to: userId },
        { from: userId, to: req.user._id },
      ],
    });

    if (!result) {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    const socketId = onlineUsers.get(userId);
    if (socketId) io.to(socketId).emit('friendUpdate');

    res.json({ message: 'Friend removed' });
  } catch (err) {
    next(err);
  }
};

// ─── List friends ─────────────────────────────────────────────────────────────

export const listFriends = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({
      status: 'accepted',
      $or: [{ from: req.user._id }, { to: req.user._id }],
    })
      .populate('from', 'name email avatarUrl status lastSeen')
      .populate('to', 'name email avatarUrl status lastSeen');

    const friends = requests.map((r) =>
      r.from._id.toString() === req.user._id.toString() ? r.to : r.from
    );

    res.json({ friends });
  } catch (err) {
    next(err);
  }
};

// ─── List pending requests (received) ────────────────────────────────────────

export const listPendingRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({
      to: req.user._id,
      status: 'pending',
    }).populate('from', 'name email avatarUrl bio');

    res.json({ requests });
  } catch (err) {
    next(err);
  }
};
