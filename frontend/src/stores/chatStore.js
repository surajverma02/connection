import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},        // { [conversationId]: Message[] }
  hasMore: {},         // { [conversationId]: boolean }
  typingUsers: {},     // { [conversationId]: userId[] }
  onlineUsers: [],     // userId[]
  isLoadingConversations: false,
  isLoadingMessages: false,

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (conversation) =>
    set({ activeConversation: conversation }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  prependMessages: (conversationId, olderMessages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...olderMessages,
          ...(state.messages[conversationId] || []),
        ],
      },
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      // Prevent duplicates from socket broadcasting back to sender
      if (currentMessages.some((m) => m._id === message._id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentMessages, message],
        },
      };
    }),

  updateMessageStatus: (conversationId, messageId, status, timestamp) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m._id === messageId ? { ...m, status, ...(timestamp ? { seenAt: timestamp } : {}) } : m
        ),
      },
    })),

  markConversationAsSeen: (conversationId, seenBy, seenAt) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) => {
          const senderId = typeof m.sender === 'object' ? m.sender?._id : m.sender;
          return senderId !== seenBy && m.status !== 'seen'
            ? { ...m, status: 'seen', seenAt }
            : m;
        }),
      },
    })),

  setHasMore: (conversationId, value) =>
    set((state) => ({
      hasMore: { ...state.hasMore, [conversationId]: value },
    })),

  setTypingUser: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping
        ? current.includes(userId) ? current : [...current, userId]
        : current.filter((id) => id !== userId);
      return { typingUsers: { ...state.typingUsers, [conversationId]: updated } };
    }),

  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

  updateLastMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c
      ),
    })),

  setLoadingConversations: (v) => set({ isLoadingConversations: v }),
  setLoadingMessages: (v) => set({ isLoadingMessages: v }),
}));

export default useChatStore;
