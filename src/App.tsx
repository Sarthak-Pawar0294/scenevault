import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './components/Auth/Login';
import { Signup } from './components/Auth/Signup';
import { SceneGridSkeleton } from './components/Dashboard/Skeletons';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { AllScenesPage } from './pages/AllScenesPage';
import { PlatformPage } from './pages/PlatformPage';
import { YouTubePlaylistDetailPage } from './pages/YouTubePlaylistDetailPage';
import { TagsPage } from './pages/TagsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <SceneGridSkeleton count={12} />
        </div>
      </div>
    );
  }

  if (!user) {
    return showSignup ? (
      <ErrorBoundary>
        <Signup onToggle={() => setShowSignup(false)} />
      </ErrorBoundary>
    ) : (
      <ErrorBoundary>
        <Login onToggle={() => setShowSignup(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/all-scenes" replace />} />
          <Route path="/all-scenes" element={<AllScenesPage />} />
          <Route path="/platforms/:platform" element={<PlatformPage />} />
          <Route path="/platforms/youtube/playlist/:id" element={<YouTubePlaylistDetailPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
