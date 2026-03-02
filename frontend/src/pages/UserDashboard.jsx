import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../api';
import { cache } from '../utils/apiCache';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import LabourCard from '../components/LabourCard';
import CarCard from '../components/CarCard';

const STATUS_COLORS = {
  pending: '#F97316',
  confirmed: '#3B82F6',
  completed: '#16A34A',
  cancelled: '#EF4444',
};

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!rating) { toast.error('कृपया रेटिंग चुनें'); return; }
    setLoading(true);
    try {
      await onSubmit(booking._id, { rating, comment });
      onClose();
    } finally { setLoading(false); }
  };

  const ratingLabels = [
    '', t('ratingPoor'), t('ratingFair'), t('ratingGood'), t('ratingVeryGood'), t('ratingExcellent')
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>{t('writeReviewTitle')}</h3>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
          {booking.providerType === 'labour' ? t('reviewWorkerExp') : t('reviewCarExp')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => setRating(star)} style={{ fontSize: '36px', background: 'none', border: 'none', cursor: 'pointer', opacity: rating >= star ? 1 : 0.3, transform: rating >= star ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.15s' }}>⭐</button>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
          {rating ? ratingLabels[rating] : t('rateTap')}
        </p>
        <textarea className="input-field" placeholder={t('reviewPlaceholder')} rows={3} value={comment} onChange={e => setComment(e.target.value)} style={{ width: '100%', resize: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} className="btn-outline" style={{ flex: 1, padding: '12px' }}>{t('cancel')}</button>
          <button onClick={handleSubmit} className="btn-primary" style={{ flex: 1, padding: '12px' }} disabled={loading}>
            {loading ? t('submittingReview') : t('submitReview')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Enhanced Profile Tab ─────────────────────────────────────────────────────
function ProfileTab({ user, onLogout, onTabChange, refreshUser }) {
  const { t, lang, switchLang } = useLanguage();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', city: user?.city || '' });
  const [editLoading, setEditLoading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const fileRef = useRef();

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/auth/upload-avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const stored = JSON.parse(localStorage.getItem('kroeasy_user') || '{}');
      localStorage.setItem('kroeasy_user', JSON.stringify({ ...stored, avatar: data.avatar }));
      refreshUser();
      toast.success('📸 Profile photo updated!');
    } catch { toast.error('Image upload failed'); }
    finally { setAvatarUploading(false); }
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) { toast.error('Name cannot be empty'); return; }
    setEditLoading(true);
    try {
      const { data } = await api.put('/auth/profile', { name: editForm.name, city: editForm.city });
      const stored = JSON.parse(localStorage.getItem('kroeasy_user') || '{}');
      localStorage.setItem('kroeasy_user', JSON.stringify({ ...stored, name: data.name, city: data.city }));
      refreshUser();
      toast.success(t('profileUpdated'));
      setEditOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setEditLoading(false); }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (!pwForm.oldPassword || !pwForm.newPassword) { setPwError('All fields are required'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirm) { setPwError(t('passwordsNotMatch')); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success(t('passwordChanged'));
      setPwOpen(false);
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Password change failed');
    } finally { setPwLoading(false); }
  };

  return (
    <div style={{ padding: '20px 16px', paddingBottom: '100px' }}>
      {/* Avatar card */}
      <div className="card" style={{ padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" onClick={() => setProfileModalOpen(true)}
              style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #E2E8F0', cursor: 'pointer' }} />
          ) : (
            <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', color: 'white', fontWeight: '700' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: '0', right: '-4px', background: '#1E3A8A', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}>📷</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        {avatarUploading && <p style={{ fontSize: '12px', color: '#3B82F6', marginBottom: '6px' }}>⏳ Uploading...</p>}
        {user?.avatar && <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>{t('tapPhotoToView')}</p>}
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{user?.name}</h2>
        <p style={{ color: '#64748B', fontSize: '14px' }}>📱 {user?.phone}</p>
        <p style={{ color: '#64748B', fontSize: '14px' }}>🏙️ {user?.city || 'Not set'}</p>
        <span className="badge badge-blue" style={{ marginTop: '8px' }}>{t('customer')}</span>
      </div>

      {/* Quick booking shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {[
          { emoji: '⏳', label: t('pendingBookings'), status: 'pending', color: '#FFF7ED', border: '#FED7AA', textColor: '#EA580C' },
          { emoji: '✅', label: t('completedBookings'), status: 'completed', color: '#F0FDF4', border: '#BBF7D0', textColor: '#16A34A' },
        ].map(({ emoji, label, status, color, border, textColor }) => (
          <button
            key={label}
          onClick={() => onTabChange('bookings', status)}
            style={{
              background: color, border: `1.5px solid ${border}`, borderRadius: '12px',
              padding: '16px 12px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              transition: 'transform 0.1s', textAlign: 'center',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '28px' }}>{emoji}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: textColor, lineHeight: '1.3' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Language Toggle */}
      <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>🌐 {t('language')}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{lang === 'en' ? 'English' : 'हिंदी'}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['en', 'hi'].map(l => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                style={{
                  padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                  border: '2px solid', cursor: 'pointer',
                  borderColor: lang === l ? '#1E3A8A' : '#E2E8F0',
                  background: lang === l ? '#1E3A8A' : 'white',
                  color: lang === l ? 'white' : '#64748B',
                  transition: 'all 0.15s',
                }}
              >
                {l === 'en' ? '🌐 EN' : '🇮🇳 HI'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
        <button
          onClick={() => { setEditOpen(!editOpen); setEditForm({ name: user?.name || '', city: user?.city || '' }); }}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>✏️</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{t('editProfile')}</span>
          </div>
          <span style={{ fontSize: '18px', color: '#94A3B8', transform: editOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
        {editOpen && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('name')}</label>
              <input className="input-field" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ padding: '10px 12px', fontSize: '14px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('city')}</label>
              <input className="input-field" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} placeholder="Enter your city" style={{ padding: '10px 12px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEditOpen(false)} className="btn-outline" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>{t('cancel')}</button>
              <button onClick={handleEditSave} className="btn-primary" disabled={editLoading} style={{ flex: 1, padding: '10px', fontSize: '13px', opacity: editLoading ? 0.7 : 1 }}>
                {editLoading ? t('updating') : t('updateProfile')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
        <button
          onClick={() => { setPwOpen(!pwOpen); setPwForm({ oldPassword: '', newPassword: '', confirm: '' }); setPwError(''); }}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{t('changePassword')}</span>
          </div>
          <span style={{ fontSize: '18px', color: '#94A3B8', transform: pwOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
        {pwOpen && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'oldPassword', label: t('currentPassword'), ph: 'Enter current password' },
              { key: 'newPassword', label: t('newPassword'), ph: 'Min 6 characters' },
              { key: 'confirm', label: t('confirmNewPassword'), ph: 'Re-enter new password' },
            ].map(({ key, label, ph }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{label}</label>
                <input className="input-field" type="password" placeholder={ph}
                  value={pwForm[key]} onChange={e => { setPwForm({ ...pwForm, [key]: e.target.value }); setPwError(''); }}
                  style={{ padding: '10px 12px', fontSize: '14px' }} />
              </div>
            ))}
            {pwError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#DC2626' }}>
                ❌ {pwError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPwOpen(false)} className="btn-outline" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>{t('cancel')}</button>
              <button onClick={handlePasswordChange} className="btn-primary" disabled={pwLoading} style={{ flex: 1, padding: '10px', fontSize: '13px', opacity: pwLoading ? 0.7 : 1 }}>
                {pwLoading ? t('updating') : t('changePassword')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button onClick={onLogout} className="btn-danger" style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center', marginTop: '8px' }}>
        🚪 {t('logout')}
      </button>

      {/* Profile Image Modal */}
      {profileModalOpen && user?.avatar && (
        <div onClick={() => setProfileModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setProfileModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>✕</button>
          <img src={user.avatar} alt="Profile" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 8px 48px rgba(0,0,0,0.6)', border: '3px solid rgba(255,255,255,0.15)' }} />
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { t, lang, switchLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('services');
  const [labours, setLabours] = useState([]);
  const [labourMeta, setLabourMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [cars, setCars] = useState([]);
  const [carMeta, setCarMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState({ city: '', skills: '', ac: '', driverIncluded: '', priceType: '' });
  const [reviewTarget, setReviewTarget] = useState(null);
  const skipNextServicesFetch = useRef(false);

  useEffect(() => {
    if (location.state?.openTab) {
      setActiveTab(location.state.openTab);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    const skill = searchParams.get('skill');
    const tab = searchParams.get('tab');
    if (skill) {
      skipNextServicesFetch.current = true;
      setActiveTab('services');
      setFilters(prev => ({ ...prev, skills: skill }));
      fetchLabours(1, false, skill);
    } else if (tab === 'cars') {
      setActiveTab('cars');
    } else if (tab) {
      setActiveTab(tab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'services') {
      if (skipNextServicesFetch.current) { skipNextServicesFetch.current = false; return; }
      fetchLabours();
    }
    if (activeTab === 'cars') fetchCars();
    if (activeTab === 'bookings') {
      if (!user) { navigate('/login'); return; }
      fetchBookings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'bookings') return;
    if (!user) return;
    const interval = setInterval(() => fetchBookings(true), 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchLabours = async (page = 1, append = false, skillOverride, bust = false) => {
    const skill = skillOverride !== undefined ? skillOverride : filters.skills;
    const params = { page, limit: 20 };
    if (filters.city) params.city = filters.city;
    if (skill) params.skills = skill;

    // Only cache page-1 no-append requests; bypass cache on explicit user searches
    const cacheKey = cache.key('/labours', params);
    if (!append && !bust) {
      const cached = cache.get(cacheKey);
      if (cached) {
        setLabours(cached.data);
        setLabourMeta({ page: cached.page, pages: cached.pages, total: cached.total });
        return;
      }
    }

    append ? setLoadingMore(true) : setLoading(true);
    try {
      const { data } = await api.get('/labours', { params });
      setLabours(prev => append ? [...prev, ...data.data] : data.data);
      setLabourMeta({ page: data.page, pages: data.pages, total: data.total });
      if (!append) cache.set(cacheKey, data);
    } catch { toast.error('Failed to load service providers'); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  };

  const fetchCars = async (page = 1, append = false, bust = false) => {
    const params = { page, limit: 20 };
    if (filters.city) params.city = filters.city;

    // Cache page-1 car results for 5 min; bypass on explicit search
    const cacheKey = cache.key('/cars', params);
    if (!append && !bust) {
      const cached = cache.get(cacheKey);
      if (cached) {
        setCars(cached.data);
        setCarMeta({ page: cached.page, pages: cached.pages, total: cached.total });
        return;
      }
    }

    append ? setLoadingMore(true) : setLoading(true);
    try {
      const { data } = await api.get('/cars', { params });
      setCars(prev => append ? [...prev, ...data.data] : data.data);
      setCarMeta({ page: data.page, pages: data.pages, total: data.total });
      if (!append) cache.set(cacheKey, data);
    } catch { toast.error('Failed to load cars'); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  };

  const fetchBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/booking/user');
      setBookings(data);
    } catch { if (!silent) toast.error('Failed to load bookings'); }
    finally { if (!silent) setLoading(false); }
  };

  const handleReviewSubmit = async (bookingId, { rating, comment }) => {
    try {
      await api.post(`/booking/${bookingId}/review`, { rating, comment });
      toast.success('🎉 Review submitted! Thank you.');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
      throw err;
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleCallFromBooking = async (b) => {
    const isLabour = b.providerType === 'labour';
    const providerUser = b.providerDetails?.userId;
    const phone = isLabour ? providerUser?.phone : b.providerDetails?.userId?.phone;
    const targetId = isLabour ? b.providerDetails?._id : b.carId?._id;
    const targetType = isLabour ? 'labour' : 'car';
    if (!phone) { toast.error('Phone number not available'); return; }
    try {
      await api.post('/call-log', { userId: user._id, targetId, targetType, phone });
    } catch { /* fail silently */ }
    window.open(`tel:${phone}`, '_self');
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(t('cancelBookingConfirm'))) return;
    try {
      await api.patch(`/booking/${bookingId}/cancel`);
      toast.success('बुकिंग रद्द हो गई।');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'बुकिंग रद्द नहीं हुई');
    }
  };

  const TABS = [
    { key: 'services', label: t('services') },
    { key: 'cars', label: t('cars') },
    { key: 'bookings', label: t('myBookings') },
    { key: 'profile', label: t('profile') },
  ];

  const handleTabChange = (tab, statusFilter) => {
    setActiveTab(tab);
    if (tab === 'bookings' && statusFilter !== undefined) {
      setBookingStatusFilter(statusFilter);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>{t('appName')}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{user ? `${t('hello')}, ${user.name} 👋` : t('browseServices')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Language toggle in header */}
          <button
            onClick={() => switchLang(lang === 'en' ? 'hi' : 'en')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
          >
            {lang === 'en' ? '🇮🇳 HI' : '🌐 EN'}
          </button>
          {user ? (
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>{t('logout')}</button>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => navigate('/login')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>{t('login')}</button>
              <button onClick={() => navigate('/register')} style={{ background: '#F97316', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>{t('register')}</button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: '64px', zIndex: 30, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '14px 8px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
              color: activeTab === tab.key ? '#1E3A8A' : '#64748B',
              borderBottom: activeTab === tab.key ? '3px solid #1E3A8A' : '3px solid transparent',
              transition: 'all 0.2s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div>
          <div style={{ padding: '12px 16px 0', background: 'white', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '10px' }}>
              {[
                { icon: '⚡', label: t('Electrician'), value: 'Electrician' },
                { icon: '🔧', label: t('skillPlumber'), value: 'Plumber' },
                { icon: '🪚', label: t('skillCarpenter'), value: 'Carpenter' },
                { icon: '❄️', label: t('skillAcRepair'), value: 'AC Technician' },
                { icon: '🧱', label: t('skillMason'), value: 'Mason' },
                { icon: '💇', label: t('skillBeautician'), value: 'Beautician' },
                { icon: '🌸', label: t('skillMehndi'), value: 'Mehndi Artist' },
                { icon: '🤝', label: t('skillHelper'), value: 'Helper' },
              ].map(s => {
                const active = filters.skills === s.value;
                return (
                  <button key={s.value} onClick={() => { const next = active ? '' : s.value; setFilters(prev => ({ ...prev, skills: next })); fetchLabours(1, false, next); }}
                    style={{ padding: '5px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: `1.5px solid ${active ? '#1E3A8A' : '#E2E8F0'}`, background: active ? '#1E3A8A' : 'white', color: active ? 'white' : '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {s.icon} {s.label}
                  </button>
                );
              })}
              {/* Other pill — workers with custom/unlisted skills */}
              {(() => {
                const otherActive = filters.skills === '__other__';
                return (
                  <button
                    onClick={() => { const next = otherActive ? '' : '__other__'; setFilters(prev => ({ ...prev, skills: next })); fetchLabours(1, false, next); }}
                    style={{ padding: '5px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: `1.5px solid ${otherActive ? '#F97316' : '#E2E8F0'}`, background: otherActive ? '#FFF7ED' : 'white', color: otherActive ? '#EA580C' : '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    🎯 {t('skillOther')}
                  </button>
                );
              })()}
            </div>
            <div style={{ display: 'flex', gap: '8px', paddingBottom: '12px' }}>
              <input className="input-field" placeholder={t('filterByCity')} value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }} />
              <button className="btn-primary" onClick={() => fetchLabours(1, false, undefined, true)} style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>{t('search')}</button>
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : labours.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔧</div>
                <p style={{ fontWeight: '600' }}>{t('noServiceProviders')}</p>
                <p style={{ fontSize: '13px' }}>{t('tryDifferentFilters')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {labours.map(labour => <LabourCard key={labour._id} labour={labour} userId={user?._id} />)}
                {labourMeta.page < labourMeta.pages && (
                  <button onClick={() => fetchLabours(labourMeta.page + 1, true)} className="btn-outline" style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '4px' }} disabled={loadingMore}>
                    {loadingMore ? '⏳ Loading...' : `${t('loadMore')} (${labours.length} of ${labourMeta.total})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cars Tab */}
      {activeTab === 'cars' && (
        <div>
          <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', alignItems: 'center' }}>
              <input
                className="input-field"
                placeholder="🏙️ Search by city..."
                value={filters.city || ''}
                onChange={e => setFilters({ ...filters, city: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && fetchCars()}
                style={{ padding: '8px 12px', fontSize: '13px', minWidth: '160px', flex: 1 }}
              />
              <button className="btn-primary" onClick={() => fetchCars(1, false, true)} style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>{t('search')}</button>
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : cars.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚗</div>
                <p style={{ fontWeight: '600' }}>{t('noCarsAvailable')}</p>
                <p style={{ fontSize: '13px' }}>{t('tryDifferentFilters')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cars.map(car => <CarCard key={car._id} car={car} userId={user?._id} />)}
                {carMeta.page < carMeta.pages && (
                  <button onClick={() => fetchCars(carMeta.page + 1, true)} className="btn-outline" style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '4px' }} disabled={loadingMore}>
                    {loadingMore ? '⏳ Loading...' : `${t('loadMore')} (${cars.length} of ${carMeta.total})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Bookings Tab */}
      {activeTab === 'bookings' && (
        <div style={{ padding: '16px' }}>
          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[
              { label: t('filterAll'), value: '' },
              { label: t('statusPending'), value: 'pending' },
              { label: t('statusConfirmed'), value: 'confirmed' },
              { label: t('statusCompleted'), value: 'completed' },
              { label: t('statusCancelled'), value: 'cancelled' },
            ].map(f => (
              <button key={f.value} onClick={() => setBookingStatusFilter(f.value)}
                style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1.5px solid', borderColor: bookingStatusFilter === f.value ? '#1E3A8A' : '#E2E8F0', background: bookingStatusFilter === f.value ? '#1E3A8A' : 'white', color: bookingStatusFilter === f.value ? 'white' : '#374151', transition: 'all 0.15s' }}
              >{f.label}</button>
            ))}
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
          ) : bookings.filter(b => !bookingStatusFilter || b.status === bookingStatusFilter).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <p style={{ fontWeight: '600' }}>{bookingStatusFilter ? `No ${bookingStatusFilter} bookings` : t('noBookingsYet')}</p>
              <p style={{ fontSize: '13px' }}>{t('bookServiceOrCar')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookings.filter(b => !bookingStatusFilter || b.status === bookingStatusFilter).map(b => {
                const isLabour = b.providerType === 'labour';
                const provider = b.providerDetails;
                const providerUser = provider?.userId;
                const car = b.carId;
                return (
                  <div key={b._id} className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>
                        {isLabour ? t('serviceBooking') : t('carBooking')}
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: STATUS_COLORS[b.status] + '20', color: STATUS_COLORS[b.status] }}>
                        {b.status === 'pending' ? t('statusPending') : b.status === 'confirmed' ? t('statusConfirmed') : b.status === 'completed' ? t('statusCompleted') : t('statusCancelled')}
                      </span>
                    </div>
                    <div style={{ background: '#F1F5F9', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px' }}>
                      {isLabour ? (
                        <>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>{providerUser?.name || 'सेवा प्रदाता'}</div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>🏙️ {providerUser?.city || '—'}</div>
                          {provider?.skills?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {provider.skills.slice(0, 4).map(s => (
                                <span key={s} style={{ background: '#DBEAFE', color: '#1E3A8A', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>{s}</span>
                              ))}
                            </div>
                          )}
                          {provider?.charges && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '5px' }}>💰 {provider.charges}</div>}
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>🚗 {car?.carName || 'कार'} {car?.modelYear && `(${car.modelYear})`}</div>
                          {car?.basePrice && <div style={{ fontSize: '13px', fontWeight: '700', color: '#F97316', marginBottom: '5px' }}>₹{car.basePrice} / km</div>}
                          <div style={{ display: 'flex', gap: '5px', marginBottom: '5px', flexWrap: 'wrap' }}>
                            {car?.seats && <span style={{ background: '#EFF6FF', color: '#1E3A8A', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>🪑 {car.seats} Seater</span>}
                            <span style={{ background: '#DCFCE7', color: '#16A34A', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>🧑‍✈️ With Driver</span>
                          </div>
                          {providerUser?.name && <div style={{ fontSize: '12px', color: '#64748B' }}>👤 {t('ownerLabel')}: {providerUser.name}</div>}
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: b.notes ? '4px' : '0' }}>
                      📅 {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {b.notes && <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>📝 {b.notes}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        {b.status === 'completed' && !b.review?.rating && (
                          <button onClick={() => setReviewTarget(b)} className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
                            {t('writeReview')}
                          </button>
                        )}
                        {b.review?.rating && (
                          <div style={{ padding: '8px 10px', background: '#FFF7ED', borderRadius: '8px', border: '1px solid #FED7AA' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#EA580C', marginBottom: '2px' }}>{'⭐'.repeat(b.review.rating)} {t('yourReview')}</div>
                            {b.review.comment && <p style={{ fontSize: '11px', color: '#64748B' }}>{b.review.comment}</p>}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {/* Cancel button — only for pending */}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => handleCancelBooking(b._id)}
                            style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            ✕ {t('cancel')}
                          </button>
                        )}
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <button onClick={() => handleCallFromBooking(b)} style={{ padding: '10px 14px', borderRadius: '10px', background: '#16A34A', border: 'none', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                            {t('callProvider')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <ProfileTab user={user} onLogout={handleLogout} onTabChange={handleTabChange} refreshUser={refreshUser} />
      )}

      <BottomNav active={activeTab} onChange={setActiveTab} role="user" />

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal booking={reviewTarget} onClose={() => setReviewTarget(null)} onSubmit={handleReviewSubmit} />
      )}
    </div>
  );
}
