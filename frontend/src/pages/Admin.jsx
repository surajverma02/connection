import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import SlimSidebar from '../components/SlimSidebar';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get(`/admin/users?page=${p}&limit=20`),
        api.get('/admin/stats'),
      ]);
      setUsers(usersRes.data.users);
      setTotalPages(usersRes.data.pages);
      setPage(p);
      setStats(statsRes.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleBan = async (userId, currentStatus) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/ban`, { ban: !currentStatus });
      setUsers((prev) =>
        prev.map((u) => u._id === userId ? res.data.user : u)
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950">
      <SlimSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-10">
          <h1 className="mb-8 text-3xl font-semibold text-neutral-900 dark:text-white">Admin Dashboard</h1>

        {/* Stats */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Users', value: stats.totalUsers },
              { label: 'Online Now', value: stats.activeUsers },
              { label: 'Messages', value: stats.totalMessages },
              { label: 'Banned', value: stats.bannedUsers },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{s.value}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users table */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">User</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Joined</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
                ) : users.map((u) => (
                  <tr key={u._id} className="border-b border-neutral-100 dark:border-neutral-800/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-neutral-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-neutral-600 dark:text-neutral-400">{u.role}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.isBanned ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                          : u.status === 'online' ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}>
                        {u.isBanned ? 'Banned' : u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          id={`ban-toggle-${u._id}`}
                          onClick={() => toggleBan(u._id, u.isBanned)}
                          className={`text-xs font-medium ${
                            u.isBanned
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-red-500 hover:text-red-600'
                          }`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <button
                onClick={() => fetchData(page - 1)}
                disabled={page === 1}
                className="text-sm text-accent disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-sm text-neutral-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => fetchData(page + 1)}
                disabled={page === totalPages}
                className="text-sm text-accent disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
