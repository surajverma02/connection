import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import { io, onlineUsers } from '../index.js';

const PAGE_SIZE = 20;

// ─── GET messages for a conversation (paginated) ─────────────────────────────

export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    // cursor = createdAt of the oldest message already loaded (for "load more")
    const { before } = req.query;

    const query = { conversationId };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1)
      .populate('sender', 'name avatarUrl');

    // Reverse so oldest first; flag if more exist
    const hasMore = messages.length > PAGE_SIZE;
    const result = messages.slice(0, PAGE_SIZE).reverse();

    res.json({ messages: result, hasMore });
  } catch (err) {
    next(err);
  }
};

// ─── POST send a message ──────────────────────────────────────────────────────

export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { text, imageUrl } = req.body;

    if (!text?.trim() && !imageUrl) {
      return res.status(400).json({ message: 'Message must have text or an image' });
    }

    // Verify requester is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      text: text?.trim() || '',
      imageUrl: imageUrl || '',
      status: 'sent',
    });

    // Update conversation's lastMessage + updatedAt
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    const populated = await message.populate('sender', 'name avatarUrl');

    // Emit to all sockets in the conversation room
    io.to(conversationId).emit('newMessage', populated);

    // Mark as delivered if recipient is online
    const recipientId = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );
    if (recipientId && onlineUsers.has(recipientId.toString())) {
      message.status = 'delivered';
      message.deliveredAt = new Date();
      await message.save();
      io.to(conversationId).emit('messageStatusUpdate', {
        messageId: message._id,
        conversationId,
        status: 'delivered',
      });
    }

    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH mark messages as seen ─────────────────────────────────────────────

export const markSeen = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const result = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: req.user._id },
        status: { $ne: 'seen' },
      },
      { $set: { status: 'seen', seenAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      io.to(conversationId).emit('messagesSeen', {
        conversationId,
        seenBy: req.user._id,
        seenAt: new Date(),
      });
    }

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    next(err);
  }
};
