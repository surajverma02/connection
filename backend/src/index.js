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

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'http://localhost:5173';

export const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
    credentials: true,
  },
});

// Track online users: userId → socketId
export const onlineUsers = new Map();

// Helper: ISO timestamp for logs
const ts = () => new Date().toISOString();

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    const prev = onlineUsers.get(userId);
    onlineUsers.set(userId, socket.id);
    // Update DB status
    User.findByIdAndUpdate(userId, { status: 'online' }).catch(() => {});
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    console.log(`[${ts()}] 🔌 CONNECT  userId=${userId}  socketId=${socket.id}${prev && prev !== socket.id ? `  (replaced stale socketId=${prev})` : ''}`);
  }

  // ─── Re-registration after reconnect ─────────────────────────────
  // The frontend emits this on both 'connect' and 'reconnect' so that
  // mobile clients that drop+rejoin always get a fresh entry in the Map.
  socket.on('registerUser', (registeredUserId) => {
    if (!registeredUserId) return;
    const prev = onlineUsers.get(registeredUserId);
    onlineUsers.set(registeredUserId, socket.id);
    User.findByIdAndUpdate(registeredUserId, { status: 'online' }).catch(() => {});
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    console.log(`[${ts()}] 🔄 REGISTER userId=${registeredUserId}  socketId=${socket.id}${prev && prev !== socket.id ? `  (replaced stale socketId=${prev})` : '  (no change)'}`);
  });

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
    console.log(`[${ts()}] 📞 callUser  caller=${userId}  callee=${calleeId}  type=${type}  calleeSocket=${calleeSocket || 'NOT FOUND'}`);

    if (!calleeSocket) {
      // Callee is not in the online map at all — tell the caller immediately.
      console.log(`[${ts()}] ⚠️  callUnavailable: callee ${calleeId} has no socket entry`);
      socket.emit('callUnavailable', { calleeId, reason: 'offline' });
      return;
    }

    // Emit with an acknowledgement so we know the callee's client received it.
    // Socket.IO acks fire when the *recipient's* socket.on handler calls the
    // callback — if the socketId is stale/dead the ack never fires.
    let ackReceived = false;
    const ACK_TIMEOUT_MS = 6000;

    io.to(calleeSocket).emit('incomingCall', {
      callerId: userId,
      callerName,
      offer,
      type,
    }, () => {
      // Ack received — the callee's socket got the event.
      ackReceived = true;
      console.log(`[${ts()}] ✅ incomingCall ack received from callee=${calleeId}  socketId=${calleeSocket}`);
    });

    console.log(`[${ts()}] 📤 incomingCall emitted → socketId=${calleeSocket}  (waiting ${ACK_TIMEOUT_MS}ms for ack)`);

    // Timeout fallback: if no ack arrives the socket was stale.
    setTimeout(() => {
      if (!ackReceived) {
        console.log(`[${ts()}] ❌ incomingCall ack TIMEOUT — stale socketId=${calleeSocket} for callee=${calleeId}. Notifying caller.`);
        // Remove the stale entry so subsequent calls don't hit the same dead socket.
        if (onlineUsers.get(calleeId) === calleeSocket) {
          onlineUsers.delete(calleeId);
          io.emit('onlineUsers', Array.from(onlineUsers.keys()));
          console.log(`[${ts()}] 🗑️  Removed stale onlineUsers entry for userId=${calleeId}`);
        }
        // Notify the caller so their UI can show "User unavailable" instead of ringing forever.
        socket.emit('callUnavailable', { calleeId, reason: 'no_ack' });
      }
    }, ACK_TIMEOUT_MS);
  });

  socket.on('acceptCall', ({ callerId, answer }) => {
    const callerSocket = onlineUsers.get(callerId);
    console.log(`[${ts()}] ✅ acceptCall  callee=${userId}  caller=${callerId}  callerSocket=${callerSocket || 'NOT FOUND'}`);
    if (callerSocket) {
      io.to(callerSocket).emit('callAccepted', { answer });
    }
  });

  socket.on('rejectCall', ({ callerId }) => {
    const callerSocket = onlineUsers.get(callerId);
    console.log(`[${ts()}] 🚫 rejectCall  callee=${userId}  caller=${callerId}  callerSocket=${callerSocket || 'NOT FOUND'}`);
    if (callerSocket) {
      io.to(callerSocket).emit('callRejected', { calleeId: userId });
    }
  });

  socket.on('endCall', ({ peerId }) => {
    const peerSocket = onlineUsers.get(peerId);
    console.log(`[${ts()}] 📵 endCall  by=${userId}  peer=${peerId}  peerSocket=${peerSocket || 'NOT FOUND'}`);
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
  socket.on('disconnect', (reason) => {
    if (userId) {
      // Only remove from the map if this socket is still the current one for this user.
      // A faster reconnect can register a new socketId before the old one fires 'disconnect'.
      if (onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
        User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() }).catch(() => {});
        io.emit('onlineUsers', Array.from(onlineUsers.keys()));
        console.log(`[${ts()}] ❌ DISCONNECT userId=${userId}  socketId=${socket.id}  reason=${reason}`);
      } else {
        console.log(`[${ts()}] ⚡ DISCONNECT userId=${userId}  socketId=${socket.id}  reason=${reason}  (stale — map already updated by reconnect, skipping removal)`);
      }
    }
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: clientUrl,
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
