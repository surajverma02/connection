import { useState } from 'react';
import useAuthStore from '../stores/authStore';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import SlimSidebar from '../components/SlimSidebar';

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await api.patch('/profile', { name, bio });
      updateUser(res.data.user);
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    setPwMessage('');
    setPwError('');
    try {
      await api.post('/profile/change-password', { currentPassword, newPassword });
      setPwMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950">
      <SlimSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-6">
          <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-white">Profile</h1>

        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
          </div>
        </div>

        {/* Profile form */}
        <form id="profile-form" onSubmit={handleProfileSave} className="mb-6 space-y-4 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Edit profile</h2>

          {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Bio</label>
            <textarea
              id="profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              className="w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>

          <button
            id="profile-save"
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {/* Change password */}
        <form id="change-password-form" onSubmit={handlePasswordChange} className="space-y-4 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Change password</h2>

          {pwMessage && <p className="text-sm text-green-600 dark:text-green-400">{pwMessage}</p>}
          {pwError && <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Current password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              minLength={6}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>

          <button
            id="change-password-submit"
            type="submit"
            disabled={pwSaving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>
        </main>
      </div>
    </div>
  );
};

export default Profile;
