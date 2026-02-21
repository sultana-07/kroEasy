import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../api';
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

const STATUS_LABELS = {
  pending: '⏳ Pending',
  confirmed: '✅ Confirmed',
  completed: '🎉 Completed',
  cancelled: '❌ Cancelled',
};

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { toast.error('Please select a rating'); return; }
    setLoading(true);
    try {
      await onSubmit(booking._id, { rating, comment });
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Write a Review ⭐</h3>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
          How was your experience with this {booking.providerType === 'labour' ? 'worker' : 'car service'}?
        </p>

        {/* Star Rating */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              style={{
                fontSize: '36px', background: 'none', border: 'none', cursor: 'pointer',
                opacity: rating >= star ? 1 : 0.3,
                transform: rating >= star ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.15s',
              }}
            >⭐</button>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
          {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : rating === 5 ? 'Excellent!' : 'Tap to rate'}
        </p>

        {/* Comment */}
        <textarea
          className="input-field"
          placeholder="Share your experience (optional)..."
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ width: '100%', resize: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} className="btn-outline" style={{ flex: 1, padding: '12px' }}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary" style={{ flex: 1, padding: '12px' }} disabled={loading}>
            {loading ? '⏳ Submitting...' : '✅ Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('services');
  const [labours, setLabours] = useState([]);
  const [labourMeta, setLabourMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [cars, setCars] = useState([]);
  const [carMeta, setCarMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState({ city: '', skills: '', ac: '', driverIncluded: '', priceType: '' });
  const [reviewTarget, setReviewTarget] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef();

  // Switch to a specific tab when navigated here with state (e.g. after booking)
  useEffect(() => {
    if (location.state?.openTab) {
      setActiveTab(location.state.openTab);
      // Clear the state so refreshing doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Handle ?skill= query param from landing page category tiles
  useEffect(() => {
    const skill = searchParams.get('skill');
    if (skill) {
      setActiveTab('services');
      setFilters(prev => ({ ...prev, skills: skill }));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'services') fetchLabours();
    if (activeTab === 'cars') fetchCars();
    if (activeTab === 'bookings') {
      if (!user) { navigate('/login'); return; }
      fetchBookings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'bookings') return;
    if (!user) return;
    // Silent background poll every 30s — no loading flash
    const interval = setInterval(() => fetchBookings(true), 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchLabours = async (page = 1, append = false, skillOverride) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.city) params.city = filters.city;
      // skillOverride is passed directly from pill clicks (bypasses stale state)
      const skill = skillOverride !== undefined ? skillOverride : filters.skills;
      if (skill) params.skills = skill;
      const { data } = await api.get('/labours', { params });
      // API now returns { data: [...], total, page, pages }
      setLabours(prev => append ? [...prev, ...data.data] : data.data);
      setLabourMeta({ page: data.page, pages: data.pages, total: data.total });
    } catch { toast.error('Failed to load service providers'); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  };

  const fetchCars = async (page = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.city) params.city = filters.city;
      if (filters.ac !== '') params.ac = filters.ac;
      if (filters.driverIncluded !== '') params.driverIncluded = filters.driverIncluded;
      if (filters.priceType) params.priceType = filters.priceType;
      const { data } = await api.get('/cars', { params });
      // API now returns { data: [...], total, page, pages }
      setCars(prev => append ? [...prev, ...data.data] : data.data);
      setCarMeta({ page: data.page, pages: data.pages, total: data.total });
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/auth/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Update local storage user so avatar persists
      const stored = JSON.parse(localStorage.getItem('kroeasy_user') || '{}');
      const updated = { ...stored, avatar: data.avatar };
      localStorage.setItem('kroeasy_user', JSON.stringify(updated));
      toast.success('📸 Profile photo updated!');
    } catch { toast.error('Image upload failed'); }
    finally { setAvatarUploading(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="page-container" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>⚡ KroEasy</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{user ? `Hello, ${user.name} 👋` : 'Browse Services'}</div>
        </div>
        {user ? (
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Logout</button>
        ) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => navigate('/login')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Login</button>
            <button onClick={() => navigate('/register')} style={{ background: '#F97316', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Register</button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: '64px', zIndex: 30, overflowX: 'auto' }}>
        {[
          { key: 'services', label: '🔧 Services' },
          { key: 'cars', label: '🚗 Cars' },
          { key: 'bookings', label: '📋 My Bookings' },
          { key: 'profile', label: '👤 Profile' },
        ].map(tab => (
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
          {/* Skill Filter Pill Toggles */}
          <div style={{ padding: '12px 16px 0', background: 'white', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '10px' }}>
              {[
                { icon: '⚡', label: 'Electrician' },
                { icon: '🔧', label: 'Plumber' },
                { icon: '🪚', label: 'Carpenter' },
                { icon: '🎨', label: 'Painter' },
                { icon: '❄️', label: 'AC Technician' },
                { icon: '🧱', label: 'Mason' },
                { icon: '🚗', label: 'Driver' },
                { icon: '🧹', label: 'Cleaner' },
                { icon: '🍳', label: 'Cook' },
                { icon: '💇', label: 'Beautician' },
                { icon: '🌿', label: 'Gardener' },
                { icon: '🛡️', label: 'Security Guard' },
              ].map(s => {
                const active = filters.skills === s.label;
                return (
                  <button
                    key={s.label}
                    onClick={() => {
                      const next = active ? '' : s.label;
                      setFilters(prev => ({ ...prev, skills: next }));
                      fetchLabours(1, false, next);
                    }}
                    style={{
                      padding: '5px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                      border: `1.5px solid ${active ? '#1E3A8A' : '#E2E8F0'}`,
                      background: active ? '#1E3A8A' : 'white',
                      color: active ? 'white' : '#374151',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {s.icon} {s.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px', paddingBottom: '12px' }}>
              <input className="input-field" placeholder="🏙️ Filter by city" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }} />
              <button className="btn-primary" onClick={() => fetchLabours()} style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>Search</button>
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : labours.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔧</div>
                <p style={{ fontWeight: '600' }}>No service providers found</p>
                <p style={{ fontSize: '13px' }}>Try different filters</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {labours.map(labour => <LabourCard key={labour._id} labour={labour} userId={user?._id} />)}
                {labourMeta.page < labourMeta.pages && (
                  <button
                    onClick={() => fetchLabours(labourMeta.page + 1, true)}
                    className="btn-outline"
                    style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '4px' }}
                    disabled={loadingMore}
                  >
                    {loadingMore ? '⏳ Loading...' : `Load More (${labours.length} of ${labourMeta.total})`}
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
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <select className="input-field" value={filters.ac} onChange={e => setFilters({ ...filters, ac: e.target.value })} style={{ padding: '8px 12px', fontSize: '13px', minWidth: '100px' }}>
                <option value="">❄️ AC</option>
                <option value="true">AC</option>
                <option value="false">Non-AC</option>
              </select>
              <select className="input-field" value={filters.driverIncluded} onChange={e => setFilters({ ...filters, driverIncluded: e.target.value })} style={{ padding: '8px 12px', fontSize: '13px', minWidth: '110px' }}>
                <option value="">🧑‍✈️ Driver</option>
                <option value="true">With Driver</option>
                <option value="false">Self Drive</option>
              </select>
              <select className="input-field" value={filters.priceType} onChange={e => setFilters({ ...filters, priceType: e.target.value })} style={{ padding: '8px 12px', fontSize: '13px', minWidth: '110px' }}>
                <option value="">💰 Price</option>
                <option value="per_km">Per KM</option>
                <option value="per_day">Per Day</option>
              </select>
              <button className="btn-primary" onClick={fetchCars} style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>Search</button>
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : cars.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚗</div>
                <p style={{ fontWeight: '600' }}>No cars available</p>
                <p style={{ fontSize: '13px' }}>Try different filters</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cars.map(car => <CarCard key={car._id} car={car} userId={user?._id} />)}
                {carMeta.page < carMeta.pages && (
                  <button
                    onClick={() => fetchCars(carMeta.page + 1, true)}
                    className="btn-outline"
                    style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '4px' }}
                    disabled={loadingMore}
                  >
                    {loadingMore ? '⏳ Loading...' : `Load More (${cars.length} of ${carMeta.total})`}
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
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <p style={{ fontWeight: '600' }}>No bookings yet</p>
              <p style={{ fontSize: '13px' }}>Book a service or car to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookings.map(b => {
                const isLabour = b.providerType === 'labour';
                const provider = b.providerDetails;        // Labour or CarOwner doc (populated by backend)
                const providerUser = provider?.userId;     // name/phone/city
                const car = b.carId;                       // Car doc
                return (
                  <div key={b._id} className="card" style={{ padding: '16px' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>
                        {isLabour ? '🔧 Service Booking' : '🚗 Car Booking'}
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: STATUS_COLORS[b.status] + '20', color: STATUS_COLORS[b.status] }}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </div>

                    {/* Provider Info Panel */}
                    <div style={{ background: '#F1F5F9', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px' }}>
                      {isLabour ? (
                        <>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>{providerUser?.name || 'Service Provider'}</div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>📱 {providerUser?.phone || '—'} • 🏙️ {providerUser?.city || '—'}</div>
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
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>🚗 {car?.carName || 'Car'} {car?.modelYear && `(${car.modelYear})`}</div>
                          {car?.basePrice && <div style={{ fontSize: '13px', fontWeight: '700', color: '#F97316', marginBottom: '5px' }}>₹{car.basePrice} / {car?.priceType === 'per_day' ? 'day' : 'km'}</div>}
                          <div style={{ display: 'flex', gap: '5px', marginBottom: '5px', flexWrap: 'wrap' }}>
                            {car?.ac && <span style={{ background: '#DBEAFE', color: '#1E3A8A', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>❄️ AC</span>}
                            {car?.driverIncluded && <span style={{ background: '#DCFCE7', color: '#16A34A', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>🧑‍✈️ Driver</span>}
                          </div>
                          {providerUser?.name && <div style={{ fontSize: '12px', color: '#64748B' }}>👤 Owner: {providerUser.name} • 📱 {providerUser.phone}</div>}
                        </>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: b.notes ? '4px' : '0' }}>
                      📅 {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {b.notes && <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>📝 {b.notes}</div>}

                    {b.status === 'completed' && !b.review?.rating && (
                      <button onClick={() => setReviewTarget(b)} className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '13px', marginTop: '8px' }}>
                        ⭐ Write a Review
                      </button>
                    )}
                    {b.review?.rating && (
                      <div style={{ marginTop: '10px', padding: '10px', background: '#FFF7ED', borderRadius: '8px', border: '1px solid #FED7AA' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#EA580C', marginBottom: '4px' }}>{'⭐'.repeat(b.review.rating)} Your Review</div>
                        {b.review.comment && <p style={{ fontSize: '12px', color: '#64748B' }}>{b.review.comment}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{ padding: '24px 16px' }}>
          <div className="card" style={{ padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
            {/* Avatar with upload */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #E2E8F0' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'white', fontWeight: '700' }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                style={{ position: 'absolute', bottom: '0', right: '-4px', background: '#1E3A8A', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}
              >📷</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            {avatarUploading && <p style={{ fontSize: '12px', color: '#3B82F6', marginBottom: '8px' }}>⏳ Uploading...</p>}
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{user?.name}</h2>
            <p style={{ color: '#64748B', fontSize: '14px' }}>📱 {user?.phone}</p>
            <p style={{ color: '#64748B', fontSize: '14px' }}>🏙️ {user?.city || 'Not set'}</p>
            <span className="badge badge-blue" style={{ marginTop: '8px' }}>👤 Customer</span>
          </div>
          <button onClick={handleLogout} className="btn-danger" style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center' }}>
            🚪 Logout
          </button>
        </div>
      )}

      <BottomNav active={activeTab} onChange={setActiveTab} role="user" />

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
}
