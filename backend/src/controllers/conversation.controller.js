import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

// ─── Get or create a DM conversation between two users ───────────────────────

export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ message: 'participantId is required' });
    }

    const myId = req.user._id;

    // Look for an existing conversation with exactly these 2 participants
    let conversation = await Conversation.findOne({
      participants: { $all: [myId, participantId], $size: 2 },
    })
      .populate('participants', 'name avatarUrl status lastSeen')
      .populate({ path: 'lastMessage', select: 'text imageUrl status createdAt' });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, participantId],
      });
      conversation = await conversation.populate('participants', 'name avatarUrl status lastSeen');
    }

    res.json({ conversation });
  } catch (err) {
    next(err);
  }
};

// ─── List all conversations for the logged-in user ───────────────────────────

export const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name avatarUrl status lastSeen')
      .populate({ path: 'lastMessage', select: 'text imageUrl status createdAt sender' });

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};
