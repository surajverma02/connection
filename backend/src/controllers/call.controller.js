import Call from '../models/call.model.js';

// ─── Save a call record ───────────────────────────────────────────────────────

export const saveCall = async (req, res, next) => {
  try {
    const { calleeId, callerId, type, status, duration } = req.body;

    const call = await Call.create({
      caller: callerId,
      callee: calleeId,
      type,
      status,
      duration,
    });

    res.status(201).json({ call });
  } catch (err) {
    next(err);
  }
};

// ─── Get call history for the logged-in user ─────────────────────────────────

export const getCallHistory = async (req, res, next) => {
  try {
    const calls = await Call.find({
      $or: [{ caller: req.user._id }, { callee: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('caller', 'name avatarUrl')
      .populate('callee', 'name avatarUrl');

    res.json({ calls });
  } catch (err) {
    next(err);
  }
};
