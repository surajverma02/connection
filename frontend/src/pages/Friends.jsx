import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import SlimSidebar from '../components/SlimSidebar';
import EmptyState from '../components/EmptyState';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { formatLastSeen } from '../utils/formatLastSeen';

const Friends = () => {
  const { user } = useAuthStore();
  const { onlineUsers } = useChatStore();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tab, setTab] = useState('friends'); // 'friends' | 'requests' | 'search'

  const fetchFriends = useCallback(async () => {
    try {
      const res = await api.get('/friends');
      setFriends(res.data.friends);
    } catch {}
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const res = await api.get('/friends/requests/pending');
      setPendingRequests(res.data.requests);
    } catch {}
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchPending();

    const handleFriendUpdate = () => {
      fetchFriends();
      fetchPending();
    };
    window.addEventListener('friendUpdate', handleFriendUpdate);
    return () => window.removeEventListener('friendUpdate', handleFriendUpdate);
  }, [fetchFriends, fetchPending]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/friends/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.users);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendRequest = async (toUserId) => {
    try {
      await api.post('/friends/request', { toUserId });
      setSearchResults((prev) =>
        prev.map((u) => u._id === toUserId ? { ...u, requestSent: true } : u)
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request');
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await api.patch(`/friends/request/${requestId}/accept`);
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
      fetchFriends();
    } catch {}
  };

  const handleReject = async (requestId) => {
    try {
      await api.patch(`/friends/request/${requestId}/reject`);
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch {}
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await api.delete(`/friends/${userId}`);
      setFriends((prev) => prev.filter((f) => f._id !== userId));
    } catch {}
  };

  const AvatarFallback = ({ name, size = 'h-10 w-10' }) => (
    <div className={`${size} flex flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950">
      <SlimSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-10">
          <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-white">Friends</h1>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
          {['friends', 'requests', 'search'].map((t) => (
            <button
              key={t}
              id={`tab-${t}`}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t} {t === 'requests' && pendingRequests.length > 0 && (
                <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-xs text-white">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Friends list */}
        {tab === 'friends' && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <EmptyState 
                title="No friends yet"
                description="Search for users to connect!"
              />
            ) : friends.map((f) => (
              <div key={f._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <AvatarFallback name={f.name} />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{f.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {onlineUsers.includes(f._id) ? (
                        <span className="text-green-500">● Online</span>
                      ) : (
                        <span>{formatLastSeen(f.lastSeen)}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(f._id)}
                  className="text-sm text-neutral-400 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending requests */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <EmptyState 
                title="No pending requests"
              />
            ) : pendingRequests.map((r) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <AvatarFallback name={r.from.name} />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{r.from.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{r.from.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    id={`accept-${r._id}`}
                    onClick={() => handleAccept(r._id)}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
                  >
                    Accept
                  </button>
                  <button
                    id={`reject-${r._id}`}
                    onClick={() => handleReject(r._id)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {tab === 'search' && (
          <div>
            <input
              id="user-search-input"
              type="search"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
            {isSearching && <p className="text-sm text-neutral-400">Searching…</p>}
            {!isSearching && searchResults.length === 0 && searchQuery.trim() !== '' && (
              <EmptyState title="No users found" />
            )}
            <div className="space-y-3">
              {searchResults.map((u) => (
                <div key={u._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <AvatarFallback name={u.name} />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{u.email}</p>
                    </div>
                  </div>
                  <button
                    id={`send-request-${u._id}`}
                    disabled={u.requestSent}
                    onClick={() => sendRequest(u._id)}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    {u.requestSent ? 'Sent' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
};

export default Friends;
