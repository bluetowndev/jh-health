import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const TrackTicket = lazy(() => import('./pages/TrackTicket'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EngineerDashboard = lazy(() => import('./pages/EngineerDashboard'));
const ManagementDashboard = lazy(() => import('./pages/ManagementDashboard'));
const TeamLeadDashboard = lazy(() => import('./pages/TeamLeadDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

function LoadingFallback() {
  return (
    <div className="flex-center" style={{ height: '100vh' }}>
      <span className="spinner spinner-dark" />
    </div>
  );
}

function getHomeRoute(role) {
  if (role === 'admin') return '/admin';
  if (role === 'management') return '/management';
  if (role === 'teamLead') return '/team-lead';
  return '/engineer';
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={getHomeRoute(user.role)} replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (user) return <Navigate to={getHomeRoute(user.role)} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
        <Route path="/track" element={<TrackTicket />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/engineer" element={<ProtectedRoute role="engineer"><EngineerDashboard /></ProtectedRoute>} />
        <Route path="/management" element={<ProtectedRoute role="management"><ManagementDashboard /></ProtectedRoute>} />
        <Route path="/team-lead" element={<ProtectedRoute role="teamLead"><TeamLeadDashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 2800,
              style: { fontSize: '0.9rem', borderRadius: '10px', padding: '12px 16px' },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
