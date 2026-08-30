import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import useAuthStore from '../../stores/authStore';
import useChatStore from '../../stores/chatStore';
import { getSocketInstance } from '../../hooks/useSocket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { formatLastSeen } from '../../utils/formatLastSeen';
import confetti from 'canvas-confetti';

const ChatWindow = ({ conversation, onBack, onStartCall }) => {
  const { user } = useAuthStore();
  const {
    messages,
    setMessages,
    prependMessages,
    hasMore,
    setHasMore,
    typingUsers,
    onlineUsers,
    isLoadingMessages,
    setLoadingMessages,
  } = useChatStore();

  const conversationId = conversation._id;
  const msgs = messages[conversationId] || [];
  const typing = typingUsers[conversationId] || [];
  const otherParticipant = conversation.participants?.find(
    (p) => p._id !== user?._id
  );

  const [modalImage, setModalImage] = useState(null);

  const topSentinelRef = useRef(null);
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const isPrependingRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  const socket = getSocketInstance();

  const prevConversationIdRef = useRef(conversationId);
  const isInitialScrollDoneRef = useRef(false);
  const didJustInitialScrollRef = useRef(false);

  if (prevConversationIdRef.current !== conversationId) {
    prevConversationIdRef.current = conversationId;
    isInitialScrollDoneRef.current = false;
  }

  // Join socket room + initial load
  useEffect(() => {
    if (!conversationId) return;
    
    // ─── Special Animation for Shreya & Suraj ─────────────────────────
    if (conversationId === '6a9289d496a47dec0dbb6f56' && user?.email === 'shreya@gmail.com') {
      const STORAGE_KEY = 'shreya_confetti_count';
      const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      
      if (count < 3) {
        localStorage.setItem(STORAGE_KEY, (count + 1).toString());
        
        const duration = 2500;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ef4444', '#f43f5e', '#ec4899']
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ef4444', '#f43f5e', '#ec4899']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }
    }
    
    socket?.emit('joinConversation', conversationId);
    loadInitialMessages();
    return () => socket?.emit('leaveConversation', conversationId);
  }, [conversationId]);

  // Preserve scroll position when older messages are prepended, OR scroll to bottom instantly on first load
  useLayoutEffect(() => {
    if (isPrependingRef.current && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight - previousScrollHeightRef.current;
    } else if (!isInitialScrollDoneRef.current && msgs.length > 0 && scrollContainerRef.current) {
      // Instant scroll to bottom on first load with messages
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      isInitialScrollDoneRef.current = true;
      didJustInitialScrollRef.current = true;
    }
  }, [msgs.length, conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (msgs.length > 0) {
      if (isPrependingRef.current) {
        // It was a prepend. Reset the flag, do not scroll to bottom.
        isPrependingRef.current = false;
      } else if (didJustInitialScrollRef.current) {
        // Initial load instant scroll was just handled. Reset flag.
        didJustInitialScrollRef.current = false;
      } else {
        // Normal new message, scroll to bottom smoothly
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [msgs.length]);

  // Mark as seen when window is focused
  useEffect(() => {
    markSeen();
    socket?.emit('messageSeen', { conversationId });
  }, [conversationId, msgs.length]);

  const loadInitialMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/${conversationId}`);
      setMessages(conversationId, res.data.messages);
      setHasMore(conversationId, res.data.hasMore);
    } catch {}
    finally { setLoadingMessages(false); }
  };

  const loadMoreMessages = useCallback(async () => {
    if (isFetchingRef.current || !hasMore[conversationId]) return;
    isFetchingRef.current = true;
    const oldest = msgs[0];
    if (!oldest) { isFetchingRef.current = false; return; }
    try {
      const res = await api.get(`/messages/${conversationId}?before=${oldest.createdAt}`);
      
      if (scrollContainerRef.current) {
        previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
        isPrependingRef.current = true;
      }
      
      prependMessages(conversationId, res.data.messages);
      setHasMore(conversationId, res.data.hasMore);
    } catch {}
    finally { isFetchingRef.current = false; }
  }, [conversationId, msgs, hasMore]);

  const markSeen = async () => {
    try { await api.patch(`/messages/${conversationId}/seen`); } catch {}
  };

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreMessages(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreMessages]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
        {onBack && (
          <button
            onClick={onBack}
            className="mr-1 block p-1 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 sm:hidden"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          {otherParticipant?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            {otherParticipant?.name || 'Unknown'}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {onlineUsers.includes(otherParticipant?._id) ? (
              <span className="text-green-500">● Online</span>
            ) : (
              <span>{formatLastSeen(otherParticipant?.lastSeen)}</span>
            )}
          </p>
        </div>

        {/* Call options */}
        <div className="flex items-center gap-2">
          {onStartCall && (
            <>
              <button
                id="audio-call-btn"
                onClick={() => onStartCall('audio')}
                title="Audio call"
                className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
              </button>
              <button
                id="video-call-btn"
                onClick={() => onStartCall('video')}
                title="Video call"
                className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </button>
            </>
          )}
          <Link
            to="/call-history"
            className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
            title="Call history"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 relative" ref={scrollContainerRef}>
        
        {/* Scroll sentinel — triggers loadMore when visible */}
        <div ref={topSentinelRef} className="h-1" />

        {hasMore[conversationId] && (
          <div className="mb-4 text-center">
            <button
              onClick={loadMoreMessages}
              className="text-xs text-accent hover:underline"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {isLoadingMessages && msgs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-accent" />
          </div>
        ) : msgs.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-400">
            No messages yet. Say hello!
          </p>
        ) : (
          msgs.map((msg, i) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={msg.sender?._id === user?._id || msg.sender === user?._id}
              showAvatar={
                i === 0 ||
                msgs[i - 1]?.sender?._id !== msg.sender?._id
              }
              onImageClick={setModalImage}
            />
          ))
        )}

        {typing.length > 0 && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput conversationId={conversationId} />

      {/* Image Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setModalImage(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setModalImage(null)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={modalImage}
            alt="Fullscreen preview"
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()} // don't close when clicking the image itself
          />
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
