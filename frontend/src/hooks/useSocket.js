import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';

let socketInstance = null;

const getSocket = (userId) => {
  if (!socketInstance) {
    socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      withCredentials: true,
      query: { userId },
      autoConnect: true,
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const getSocketInstance = () => socketInstance;

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

    // Online presence
    socket.on('onlineUsers', (userIds) => setOnlineUsers(userIds));

    // Incoming message
    socket.on('newMessage', (message) => {
      addMessage(message.conversationId, message);
      updateLastMessage(message.conversationId, message);
    });

    // Message status updates
    socket.on('messageStatusUpdate', ({ messageId, conversationId, status, seenAt }) => {
      updateMessageStatus(conversationId, messageId, status, seenAt);
    });

    // Mark whole conversation as seen
    socket.on('messagesSeen', ({ conversationId, seenBy, seenAt }) => {
      markConversationAsSeen(conversationId, seenBy, seenAt);
    });

    // Friend updates
    socket.on('friendUpdate', () => {
      window.dispatchEvent(new CustomEvent('friendUpdate'));
    });

    // Typing indicators
    socket.on('typing', ({ conversationId, userId }) => {
      setTypingUser(conversationId, userId, true);
    });

    socket.on('stopTyping', ({ conversationId, userId }) => {
      setTypingUser(conversationId, userId, false);
    });

    // ─── WebRTC Call Events ───
    const callStore = import('../stores/callStore').then(m => m.default.getState());
    
    socket.on('incomingCall', async ({ callerId, callerName, offer, type }) => {
      const { setIncomingCall, clearIceCandidates } = await callStore;
      setIncomingCall({ callerId, callerName: callerName || 'Someone', offer, type });
      clearIceCandidates();
    });

    socket.on('iceCandidate', async ({ candidate }) => {
      const { addIceCandidate } = await callStore;
      addIceCandidate(candidate);
    });

    socket.on('callRejected', async () => {
      const { clearCalls } = await callStore;
      alert('Call was declined.');
      clearCalls();
    });

    socket.on('callEnded', async () => {
      const { setIncomingCall, clearIceCandidates } = await callStore;
      setIncomingCall(null);
      clearIceCandidates();
    });

    return () => {
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
    };
  }, [user?._id]);

  return socketRef.current;
};

export default useSocket;
