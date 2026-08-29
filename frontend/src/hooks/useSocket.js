import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import useCallStore from '../stores/callStore';

// ─── Helper ──────────────────────────────────────────────────────────────────
const ts = () => new Date().toISOString();

let socketInstance = null;

const getSocket = (userId) => {
  if (!socketInstance) {
    socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      withCredentials: true,
      query: { userId },
      autoConnect: true,
      // ─── Reconnection settings tuned for mobile ───────────────────
      // Mobile browsers drop WebSockets when backgrounded, screen-locked,
      // or switching between WiFi and cellular. These settings make
      // Socket.IO reconnect quickly and aggressively.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,       // wait 1 s before first retry
      reconnectionDelayMax: 3000,    // cap at 3 s (default is 5 s)
      randomizationFactor: 0.3,
      timeout: 10000,                // connection timeout per attempt
    });
    console.log(`[${ts()}] 🔌 Socket instance created for userId=${userId}`);
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    console.log(`[${ts()}] 🔌 Socket disconnected and cleared`);
  }
};

export const getSocketInstance = () => socketInstance;

// ─── Main hook ──────────────────────────────────────────────────────────────────
const useSocket = () => {
  const { user } = useAuthStore();
  const {
    addMessage,
    updateMessageStatus,
    setTypingUser,
    setOnlineUsers,
    updateLastMessage,
    activeConversation,
    markConversationAsSeen,
  } = useChatStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return;

    const socket = getSocket(user._id);
    socketRef.current = socket;

    // ─── Helper: (re-)register this user on the server ──────────────
    // Called on both initial connect AND every reconnect so the server's
    // onlineUsers Map always holds the current socket.id for this user.
    const registerUser = () => {
      console.log(`[${ts()}] 📡 Emitting registerUser  userId=${user._id}  socketId=${socket.id}`);
      socket.emit('registerUser', user._id);
    };

    // ─── Reconnect listeners ───────────────────────────────────
    // 'connect' fires on the initial connection AND after every successful
    // reconnect (Socket.IO v4+ unifies these under 'connect').
    socket.on('connect', () => {
      console.log(`[${ts()}] ✅ Socket connected  socketId=${socket.id}`);
      registerUser();
    });

    socket.on('disconnect', (reason) => {
      console.log(`[${ts()}] ⚠️  Socket disconnected  reason=${reason}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[${ts()}] 🔄 Socket reconnected after ${attemptNumber} attempt(s)  socketId=${socket.id}`);
      // registerUser is also called via 'connect', but emitting twice is harmless
      // and guards against any edge-case ordering differences across browsers.
      registerUser();
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[${ts()}] 🔁 Reconnect attempt #${attemptNumber}`);
    });

    socket.on('reconnect_error', (err) => {
      console.warn(`[${ts()}] ❌ Reconnect error:`, err.message);
    });

    // ─── Keepalive ping ───────────────────────────────────────
    // Mobile browsers throttle or suspend background tabs/PWAs and may
    // silently kill the WebSocket without a proper close frame.
    // Sending a lightweight ping every 15 s keeps the connection alive
    // while the app is backgrounded (screen on, different app in front).
    // NOTE: This does NOT help when the screen is fully locked and the
    // OS suspends the JS thread — that scenario requires Web Push +
    // a Service Worker (out of scope for this fix; flagged here).
    const PING_INTERVAL_MS = 15_000;
    const pingIntervalId = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, PING_INTERVAL_MS);

    // ─── Online presence ───────────────────────────────────────
    socket.on('onlineUsers', (userIds) => setOnlineUsers(userIds));

    // ─── Incoming messages ────────────────────────────────────
    socket.on('newMessage', (message) => {
      addMessage(message.conversationId, message);
      updateLastMessage(message.conversationId, message);
    });

    // ─── Message status updates ───────────────────────────────
    socket.on('messageStatusUpdate', ({ messageId, conversationId, status, seenAt }) => {
      updateMessageStatus(conversationId, messageId, status, seenAt);
    });

    socket.on('messagesSeen', ({ conversationId, seenBy, seenAt }) => {
      markConversationAsSeen(conversationId, seenBy, seenAt);
    });

    // ─── Friend updates ───────────────────────────────────────
    socket.on('friendUpdate', () => {
      window.dispatchEvent(new CustomEvent('friendUpdate'));
    });

    // ─── Typing indicators ─────────────────────────────────────
    socket.on('typing', ({ conversationId, userId }) => {
      setTypingUser(conversationId, userId, true);
    });

    socket.on('stopTyping', ({ conversationId, userId }) => {
      setTypingUser(conversationId, userId, false);
    });

    // ─── WebRTC Call Events ─────────────────────────────────────

    // incomingCall: acknowledge immediately so the backend knows the event
    // was delivered. The ack fires the server's callback, which prevents
    // the 6-second "stale socket" timeout from removing us from onlineUsers.
    socket.on('incomingCall', ({ callerId, callerName, offer, type }, ack) => {
      console.log(`[${ts()}] 📞 incomingCall received  callerId=${callerId}  type=${type}`);
      // Acknowledge delivery to the server immediately.
      if (typeof ack === 'function') {
        ack();
        console.log(`[${ts()}] ✅ incomingCall ack sent to server`);
      }
      const { setIncomingCall, clearIceCandidates } = useCallStore.getState();
      setIncomingCall({ callerId, callerName: callerName || 'Someone', offer, type });
      clearIceCandidates();
      console.log(`[${ts()}] 🔔 setIncomingCall called — modal should now render`);
    });

    socket.on('iceCandidate', ({ candidate }) => {
      const { addIceCandidate } = useCallStore.getState();
      addIceCandidate(candidate);
    });

    socket.on('callRejected', () => {
      const { clearCalls } = useCallStore.getState();
      console.log(`[${ts()}] 🚫 callRejected received`);
      alert('Call was declined.');
      clearCalls();
    });

    socket.on('callEnded', () => {
      const { setIncomingCall, clearIceCandidates } = useCallStore.getState();
      console.log(`[${ts()}] 📵 callEnded received`);
      setIncomingCall(null);
      clearIceCandidates();
    });

    // callUnavailable: fires when the callee's socket is stale/offline.
    // Show the caller a clear message instead of leaving them ringing forever.
    socket.on('callUnavailable', ({ calleeId, reason }) => {
      const { clearCalls } = useCallStore.getState();
      console.warn(`[${ts()}] ⚠️  callUnavailable  calleeId=${calleeId}  reason=${reason}`);
      clearCalls();
      alert(
        reason === 'offline'
          ? 'The person you are calling is offline.'
          : 'Could not reach the other person. They may have lost their connection. Please try again.'
      );
    });

    // ─── Cleanup ───────────────────────────────────────────────────
    return () => {
      clearInterval(pingIntervalId);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('reconnect_attempt');
      socket.off('reconnect_error');
      socket.off('onlineUsers');
      socket.off('newMessage');
      socket.off('messageStatusUpdate');
      socket.off('messagesSeen');
      socket.off('friendUpdate');
      socket.off('typing');
      socket.off('stopTyping');
      socket.off('incomingCall');
      socket.off('iceCandidate');
      socket.off('callRejected');
      socket.off('callEnded');
      socket.off('callUnavailable');
    };
  }, [user?._id]);

  return socketRef.current;
};

export default useSocket;
