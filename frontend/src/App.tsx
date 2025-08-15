import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Leaderboard from '@/pages/Leaderboard';
import WeeklyCommits from '@/pages/WeeklyCommits';
import UserProfile from '@/pages/UserProfile';
import TeamUpdates from '@/pages/TeamUpdates';
import UserManagement from '@/pages/UserManagement';
import ChangePassword from '@/pages/ChangePassword';
import AdminActivity from '@/pages/AdminActivity';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#22c55e',
              },
            },
            error: {
              duration: 4000,
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="weekly-commits" element={<WeeklyCommits />} />
            <Route path="team-updates" element={<TeamUpdates />} />
            <Route path="profile/:userId" element={<UserProfile />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
            <Route path="admin/activity" element={<ProtectedRoute requireAdmin><AdminActivity /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;