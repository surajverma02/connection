import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import useThemeStore from './stores/themeStore';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import useSocket from './hooks/useSocket';

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const Login       = lazy(() => import('./pages/Login'));
const Signup      = lazy(() => import('./pages/Signup'));
const Home        = lazy(() => import('./pages/Home'));
const Profile     = lazy(() => import('./pages/Profile'));
const Friends     = lazy(() => import('./pages/Friends'));
const Admin       = lazy(() => import('./pages/Admin'));
const CallHistory = lazy(() => import('./pages/CallHistory'));

// ─── Page loader ─────────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-white dark:bg-neutral-950">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-accent" />
  </div>
);

// ─── Inner component so hooks (useSocket) run inside Router context ───────────
const AppInner = () => {
  const { checkAuth } = useAuthStore();
  const { applyTheme } = useThemeStore();

  // Apply persisted theme on mount
  useEffect(() => { applyTheme(); }, [applyTheme]);

  // Verify auth on mount (refresh → re-hydrate user from cookie)
  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Initialise Socket.IO (no-op when unauthenticated)
  useSocket();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute><Home /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/friends" element={
          <ProtectedRoute><Friends /></ProtectedRoute>
        } />
        <Route path="/call-history" element={
          <ProtectedRoute><CallHistory /></ProtectedRoute>
        } />

        {/* Admin-only route */}
        <Route path="/admin" element={
          <AdminRoute><Admin /></AdminRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <BrowserRouter>
    <AppInner />
  </BrowserRouter>
);

export default App;
