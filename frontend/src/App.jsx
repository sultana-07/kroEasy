import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import InstagramFAB from "./components/InstagramFAB";
import { requestNotificationPermission } from "./utils/notifications";

// Lazy-loaded pages — each page loads as its own JS chunk only when visited.
// Cuts initial bundle by ~70%, improving cold-start time on free tier.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const LabourDashboard = lazy(() => import("./pages/LabourDashboard"));
const CarOwnerDashboard = lazy(() => import("./pages/CarOwnerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const BookingSuccessPage = lazy(() => import("./pages/BookingSuccessPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

const PageLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
    }}
  >
    <div className="spinner" />
  </div>
);

// Scrolls to top on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
};

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const routeMeta = {
      "/": {
        title:
          "KroEasy – Electrician, Beautician, AC Technician, Car Booking in Nowrozabad & Birshingpur Pali",
        description:
          "KroEasy – Nowrozabad aur Birshingpur Pali mein verified Electrician, Plumber, Beautician, AC Technician, Carpenter, Mason aur Car Booking service. Free registration, trusted workers.",
      },
      "/about": {
        title: "Sultan Ali – Founder & CEO of KroEasy | Nowrozabad",
        description:
          "Sultan Ali är the founder and CEO of KroEasy – a local services platform for Nowrozabad and Birshingpur Pali.",
      },
      "/terms": {
        title: "KroEasy Terms & Conditions",
        description:
          "Terms and conditions for KroEasy local service marketplace in Nowrozabad and Birshingpur Pali.",
      },
      "/privacy": {
        title: "KroEasy Privacy Policy",
        description:
          "Privacy policy for KroEasy local service marketplace users and service providers.",
      },
      "/support": {
        title: "KroEasy Support",
        description:
          "Contact and support page for KroEasy users and service providers.",
      },
      "/services": {
        title:
          "KroEasy Services – Book Local Electricians, Plumbers, Car Booking",
        description:
          "Browse and book local service professionals in Nowrozabad & Birshingpur Pali.",
      },
      "/booking-success": {
        title: "Booking Success | KroEasy",
        description: "Your service booking was successful on KroEasy.",
      },
    };

    const meta = routeMeta[location.pathname] || {
      title: "KroEasy – Local Services in Nowrozabad",
      description:
        "KroEasy local services platform for Nowrozabad and Birshingpur Pali.",
    };

    const canonicalHref = `https://kroeasy.com${location.pathname === "/" ? "/" : location.pathname}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    const previousCanonical = canonicalLink.href;
    canonicalLink.href = canonicalHref;

    const metaDesc = document.querySelector('meta[name="description"]');
    const previousDesc = metaDesc ? metaDesc.getAttribute("content") : null;
    if (metaDesc && meta.description) {
      metaDesc.setAttribute("content", meta.description);
    }

    document.title = meta.title;

    return () => {
      if (canonicalLink)
        canonicalLink.href = previousCanonical || "https://kroeasy.com/";
      if (metaDesc && previousDesc != null)
        metaDesc.setAttribute("content", previousDesc);
    };
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          user ? <Navigate to={getDashboardPath(user.role)} /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to={getDashboardPath(user.role)} />
          ) : (
            <RegisterPage />
          )
        }
      />
      {/* /dashboard auto-redirects role-specific users to their own dashboard */}
      <Route
        path="/dashboard"
        element={
          user && user.role !== "user" ? (
            <Navigate to={getDashboardPath(user.role)} replace />
          ) : (
            <UserDashboard />
          )
        }
      />
      {/* /services always shows the customer browsing page — no role redirect */}
      <Route path="/services" element={<UserDashboard />} />
      <Route
        path="/labour-dashboard"
        element={
          <ProtectedRoute roles={["labour"]}>
            <LabourDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/carowner-dashboard"
        element={
          <ProtectedRoute roles={["carowner"]}>
            <CarOwnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/booking-success" element={<BookingSuccessPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const getDashboardPath = (role) => {
  const paths = {
    user: "/dashboard",
    labour: "/labour-dashboard",
    carowner: "/carowner-dashboard",
    admin: "/admin",
  };
  return paths[role] || "/";
};

export default function App() {
  // Dismiss splash screen after React has mounted
  useEffect(() => {
    const splash = document.getElementById("splash-screen");
    if (splash) {
      // Let the animations play for 1.2s, then fade out
      const timer = setTimeout(() => {
        splash.classList.add("hide");
        setTimeout(() => splash.remove(), 500);
      }, 2500); // 2.5s — matches the longer animation sequence
      return () => clearTimeout(timer);
    }
  }, []);

  // Ask ALL visitors for notification permission (logged-in or not)
  // Delay by 3s so it shows after the splash screen fades
  useEffect(() => {
    const timer = setTimeout(() => {
      requestNotificationPermission().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: "10px", fontFamily: "Inter, sans-serif" },
            }}
          />
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
