import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';

// ─── Update profile (name, bio, avatarUrl) ───────────────────────────────────

export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, avatarUrl, theme } = req.body;

    const allowed = {};
    if (name !== undefined) allowed.name = name.trim();
    if (bio !== undefined) allowed.bio = bio.trim();
    if (avatarUrl !== undefined) allowed.avatarUrl = avatarUrl;
    if (theme !== undefined && ['light', 'dark'].includes(theme)) {
      allowed.theme = theme;
    }

    const user = await User.findByIdAndUpdate(req.user._id, allowed, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ─── Change password ──────────────────────────────────────────────────────────

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
