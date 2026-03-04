import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import InstagramFAB from './components/InstagramFAB';

// Lazy-loaded pages — each page loads as its own JS chunk only when visited.
// Cuts initial bundle by ~70%, improving cold-start time on free tier.
const LandingPage        = lazy(() => import('./pages/LandingPage'));
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage'));
const UserDashboard      = lazy(() => import('./pages/UserDashboard'));
const LabourDashboard    = lazy(() => import('./pages/LabourDashboard'));
const CarOwnerDashboard  = lazy(() => import('./pages/CarOwnerDashboard'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const TermsPage          = lazy(() => import('./pages/TermsPage'));
const PrivacyPage        = lazy(() => import('./pages/PrivacyPage'));
const SupportPage        = lazy(() => import('./pages/SupportPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <div className="spinner" />
  </div>
);

// Scrolls to top on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
};

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
      {/* /dashboard auto-redirects role-specific users to their own dashboard */}
      <Route
        path="/dashboard"
        element={
          user && user.role !== 'user'
            ? <Navigate to={getDashboardPath(user.role)} replace />
            : <UserDashboard />
        }
      />
      {/* /services always shows the customer browsing page — no role redirect */}
      <Route path="/services" element={<UserDashboard />} />
      <Route path="/labour-dashboard" element={<ProtectedRoute roles={['labour']}><LabourDashboard /></ProtectedRoute>} />
      <Route path="/carowner-dashboard" element={<ProtectedRoute roles={['carowner']}><CarOwnerDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/booking-success" element={<BookingSuccessPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
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
        setTimeout(() => splash.remove(), 500);
      }, 2500);  // 2.5s — matches the longer animation sequence
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster position="top-center" toastOptions={{ duration: 4000, style: { borderRadius: '10px', fontFamily: 'Inter, sans-serif' } }} />
          <Analytics />
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
          <InstagramFAB />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
