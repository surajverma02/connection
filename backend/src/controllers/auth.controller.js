import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const setTokenCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production' || process.env.CLIENT_URL?.startsWith('https');
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  role: user.role,
  status: user.status,
  lastSeen: user.lastSeen,
  theme: user.theme,
  createdAt: user.createdAt,
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Account is banned' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update online status
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    // Mark user offline
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        status: 'offline',
        lastSeen: new Date(),
      });
    }

    const isProd = process.env.NODE_ENV === 'production' || process.env.CLIENT_URL?.startsWith('https');
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  res.status(200).json({ user: sanitizeUser(req.user) });
};
