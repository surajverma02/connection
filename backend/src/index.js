import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import friendRoutes from './routes/friend.routes.js';
import profileRoutes from './routes/profile.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import adminRoutes from './routes/admin.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import messageRoutes from './routes/message.routes.js';
import callRoutes from './routes/call.routes.js';
import errorMiddleware from './middleware/error.middleware.js';
import User from './models/user.model.js';

// ─── App Setup ───────────────────────────────────────────────────────────────

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Track online users: userId → socketId
export const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    onlineUsers.set(userId, socket.id);
    // Update DB status
    User.findByIdAndUpdate(userId, { status: 'online' }).catch(() => {});
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    console.log(`🔌 ${userId} connected (${socket.id})`);
  }

  // ─── Room management ─────────────────────────────────────────────
  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(conversationId);
  });

  // ─── Typing indicators (debounced on client) ──────────────────────
  socket.on('typing', ({ conversationId }) => {
    socket.to(conversationId).emit('typing', { conversationId, userId });
  });

  socket.on('stopTyping', ({ conversationId }) => {
    socket.to(conversationId).emit('stopTyping', { conversationId, userId });
  });

  // ─── Seen receipt (additional real-time pathway) ──────────────────
  socket.on('messageSeen', ({ conversationId }) => {
    socket.to(conversationId).emit('messagesSeen', { conversationId, seenBy: userId });
  });

  // ─── WebRTC Call Signaling ────────────────────────────────────────

  socket.on('callUser', ({ calleeId, offer, type, callerName }) => {
    const calleeSocket = onlineUsers.get(calleeId);
    if (calleeSocket) {
      io.to(calleeSocket).emit('incomingCall', {
        callerId: userId,
        callerName,
        offer,
        type,
      });
    }
  });

  socket.on('acceptCall', ({ callerId, answer }) => {
    const callerSocket = onlineUsers.get(callerId);
    if (callerSocket) {
      io.to(callerSocket).emit('callAccepted', { answer });
    }
  });

  socket.on('rejectCall', ({ callerId }) => {
    const callerSocket = onlineUsers.get(callerId);
    if (callerSocket) {
      io.to(callerSocket).emit('callRejected', { calleeId: userId });
    }
  });

  socket.on('endCall', ({ peerId }) => {
    const peerSocket = onlineUsers.get(peerId);
    if (peerSocket) {
      io.to(peerSocket).emit('callEnded', { by: userId });
    }
  });

  socket.on('iceCandidate', ({ peerId, candidate }) => {
    const peerSocket = onlineUsers.get(peerId);
    if (peerSocket) {
      io.to(peerSocket).emit('iceCandidate', { candidate });
    }
  });

  // ─── Disconnect ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (userId) {
      onlineUsers.delete(userId);
      User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() }).catch(() => {});
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
      console.log(`❌ ${userId} disconnected`);
    }
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/calls', callRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler (must be last)
app.use(errorMiddleware);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
  });
});
