import { useEffect, useState } from 'react';
import api from '../../api/axios';
import useChatStore from '../../stores/chatStore';
import EmptyState from '../EmptyState';
import useAuthStore from '../../stores/authStore';

const ConversationList = ({ onSelect }) => {
  const { user } = useAuthStore();
  const {
    conversations,
    setConversations,
    activeConversation,
    setActiveConversation,
    onlineUsers,
    setLoadingConversations,
    isLoadingConversations,
  } = useChatStore();

  const [friendSearch, setFriendSearch] = useState('');
  const [friends, setFriends] = useState([]);
  const [showFriends, setShowFriends] = useState(false);

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await api.get('/conversations');
      setConversations(res.data.conversations);
    } catch {} finally {
      setLoadingConversations(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await api.get('/friends');
      setFriends(res.data.friends);
    } catch {}
  };

  useEffect(() => {
    fetchConversations();
    fetchFriends();
  }, []);

  const openConversation = async (participantId) => {
    try {
      const res = await api.post('/conversations', { participantId });
      const conv = res.data.conversation;
      // Add to list if not already there
      setConversations([conv, ...conversations.filter((c) => c._id !== conv._id)]);
      setActiveConversation(conv);
      onSelect?.(conv);
      setShowFriends(false);
    } catch {}
  };

  const selectConversation = (conv) => {
    setActiveConversation(conv);
    onSelect?.(conv);
  };

  const getOtherParticipant = (conv) =>
    conv.participants?.find((p) => p._id !== user?._id);

  const fmt = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col border-r border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Messages</h2>
        <button
          id="new-conversation-btn"
          onClick={() => setShowFriends(!showFriends)}
          title="New conversation"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Friend picker */}
      {showFriends && (
        <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
          <input
            id="friend-search"
            type="search"
            placeholder="Search friends…"
            value={friendSearch}
            onChange={(e) => setFriendSearch(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {filteredFriends.map((f) => (
              <button
                key={f._id}
                onClick={() => openConversation(f._id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {f.name[0].toUpperCase()}
                </div>
                <span className="text-neutral-900 dark:text-white">{f.name}</span>
                {onlineUsers.includes(f._id) && (
                  <span className="ml-auto text-xs text-green-500">●</span>
                )}
              </button>
            ))}
            {filteredFriends.length === 0 && (
              <p className="px-2 py-2 text-xs text-neutral-400">No friends found</p>
            )}
          </div>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="flex flex-col gap-3 px-4 py-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-2 w-3/4 rounded bg-neutral-100 dark:bg-neutral-900" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Click the + button to start one."
          />
        ) : (
          conversations.map((conv) => {
            const other = getOtherParticipant(conv);
            const isActive = activeConversation?._id === conv._id;
            const isOnline = onlineUsers.includes(other?._id);

            return (
              <button
                key={conv._id}
                id={`conv-${conv._id}`}
                onClick={() => selectConversation(conv)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-800'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white transition-all ${isOnline ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-neutral-950' : ''}`}>
                    {other?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                      {other?.name || 'Unknown'}
                    </p>
                    <span className="ml-2 flex-shrink-0 text-[11px] text-neutral-400">
                      {fmt(conv.updatedAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {conv.lastMessage?.text || (conv.lastMessage?.imageUrl ? '📷 Image' : 'No messages')}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
