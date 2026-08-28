import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import SlimSidebar from '../components/SlimSidebar';
import EmptyState from '../components/EmptyState';
import useAuthStore from '../stores/authStore';

const CallHistory = () => {
  const { user } = useAuthStore();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const res = await api.get('/calls/history');
        setCalls(res.data.calls);
      } catch {}
      finally { setLoading(false); }
    };
    fetchCalls();
  }, []);

  const fmt = (s) => {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const statusColor = (status) => ({
    completed: 'text-green-600 dark:text-green-400',
    missed: 'text-red-500 dark:text-red-400',
    rejected: 'text-neutral-400',
  }[status] || 'text-neutral-400');

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950">
      <SlimSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-10">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Call History</h1>
          <Link to="/" className="text-sm text-accent hover:underline">← Back to chat</Link>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-accent" />
          </div>
        ) : calls.length === 0 ? (
          <EmptyState title="No calls yet" description="Make a call from the chat to see it here." />
        ) : (
          <div className="space-y-2">
            {calls.map((call) => {
              const isOutgoing = call.caller?._id === user?._id;
              const peer = isOutgoing ? call.callee : call.caller;
              return (
                <div key={call._id} className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {peer?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{peer?.name || 'Unknown'}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {isOutgoing ? '↑ Outgoing' : '↓ Incoming'} · {call.type} · {fmt(call.duration)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium capitalize ${statusColor(call.status)}`}>{call.status}</p>
                    <p className="text-xs text-neutral-400">
                      {new Date(call.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CallHistory;
