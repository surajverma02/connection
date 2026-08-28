import User from '../models/user.model.js';
import Message from '../models/message.model.js';

// ─── List all users (admin) ───────────────────────────────────────────────────

export const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// ─── Ban / unban a user ───────────────────────────────────────────────────────

export const setBanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ban } = req.body; // boolean

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot ban yourself' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isBanned: Boolean(ban) },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalMessages, bannedUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'online' }),
      // Message model might not exist yet in Step 1 — safe fallback
      Message?.countDocuments?.() ?? Promise.resolve(0),
      User.countDocuments({ isBanned: true }),
    ]);

    res.json({ totalUsers, activeUsers, totalMessages, bannedUsers });
  } catch (err) {
    next(err);
  }
};
