import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * Shared bottom tab bar — 4 fixed tabs: Home / Services / Cars / Profile
 * Used on LandingPage and UserDashboard.
 *
 * Props (optional):
 *   activeTab   – override the highlight key (used in UserDashboard for sub-tabs)
 *   onTabClick  – called when a tab is clicked (used in UserDashboard)
 */
export default function BottomNav({ activeTab, onTabClick }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Active tab detection
  const isHome     = !activeTab && location.pathname === '/';
  const isReels    = activeTab === 'reels'    || (!activeTab && location.pathname === '/reels');
  const isServices = activeTab === 'services' || (!activeTab && location.pathname !== '/' && location.pathname !== '/reels' && !location.search?.includes('tab=cars'));
  const isCars     = activeTab === 'cars'     || (!activeTab && location.search?.includes('tab=cars'));
  const isProfile  = activeTab === 'profile';

  const tab = (active) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 4px 6px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    color: active ? '#4F46E5' : '#94A3B8',
    fontSize: '10px',
    fontWeight: '600',
    gap: '3px',
    textDecoration: 'none',
    transition: 'color .15s',
    WebkitTapHighlightColor: 'transparent',
    lineHeight: 1,
  });

  // Plain labels (no emoji) — translations may contain emoji so we use plain strings
  const label = {
    home:     t('home')     || 'Home',
    services: t('services') || 'Services',
    cars:     t('cars')     || 'Cars',
    videos:   'Videos',
    profile:  t('profile')  || 'Profile',
  };

  // Strip any leading emoji / special chars that translations might include
  const clean = (s) => s.replace(/^[\p{Emoji}\s]+/gu, '').trim() || s;

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px',
      background: 'white', borderTop: '1px solid #E2E8F0',
      display: 'flex', zIndex: 50,
      boxShadow: '0 -4px 20px rgba(0,0,0,.08)',
    }}>

      {/* Home */}
      <Link to="/" style={tab(isHome)}>
        <span style={{ fontSize: '22px' }}>🏠</span>
        <span>{clean(label.home)}</span>
      </Link>

      {/* Services */}
      {onTabClick ? (
        <button style={tab(isServices)} onClick={() => onTabClick('services')}>
          <span style={{ fontSize: '22px' }}>🔧</span>
          <span>{clean(label.services)}</span>
        </button>
      ) : (
        <Link to="/services" style={tab(isServices)}>
          <span style={{ fontSize: '22px' }}>🔧</span>
          <span>{clean(label.services)}</span>
        </Link>
      )}

      {/* Cars */}
      {onTabClick ? (
        <button style={tab(isCars)} onClick={() => onTabClick('cars')}>
          <span style={{ fontSize: '22px' }}>🚗</span>
          <span>{clean(label.cars)}</span>
        </button>
      ) : (
        <Link to="/services?tab=cars" style={tab(isCars)}>
          <span style={{ fontSize: '22px' }}>🚗</span>
          <span>{clean(label.cars)}</span>
        </Link>
      )}

      {/* Videos / Reels */}
      <Link to="/reels" style={tab(isReels)}>
        <span style={{ fontSize: '22px' }}>🎬</span>
        <span>{clean(label.videos)}</span>
      </Link>

      {/* Profile — role check FIRST so labour/carowner never land on the customer Profile tab */}
      <button style={tab(isProfile)} onClick={() => {
        if (user?.role === 'labour') {
          navigate('/labour-dashboard', { state: { openTab: 'profile' } });
        } else if (user?.role === 'carowner') {
          navigate('/carowner-dashboard', { state: { openTab: 'profile' } });
        } else if (onTabClick) {
          onTabClick('profile');
        } else {
          navigate('/services?tab=profile');
        }
      }}>
        <span style={{ fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {user?.avatar
            ? <img src={user.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
            : user
              ? <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#6366F1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '12px' }}>
                  {user.name?.[0]?.toUpperCase()}
                </span>
              : '👤'
          }
        </span>
        <span>{clean(label.profile)}</span>
      </button>

    </nav>
  );
}
