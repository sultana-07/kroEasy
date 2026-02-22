import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import LabourDashboard from './pages/LabourDashboard';
import CarOwnerDashboard from './pages/CarOwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import SupportPage from './pages/SupportPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={getDashboardPath(user.role)} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={getDashboardPath(user.role)} /> : <RegisterPage />} />
      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="/labour-dashboard" element={<ProtectedRoute roles={['labour']}><LabourDashboard /></ProtectedRoute>} />
      <Route path="/carowner-dashboard" element={<ProtectedRoute roles={['carowner']}><CarOwnerDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const getDashboardPath = (role) => {
  const paths = { user: '/dashboard', labour: '/labour-dashboard', carowner: '/carowner-dashboard', admin: '/admin' };
  return paths[role] || '/';
};

export default function App() {
  // Dismiss splash screen after React has mounted
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      // Let the animations play for 1.2s, then fade out
      const timer = setTimeout(() => {
        splash.classList.add('hide');
        setTimeout(() => splash.remove(), 500); // remove from DOM after fade
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { borderRadius: '10px', fontFamily: 'Inter, sans-serif' } }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
