import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const INITIAL_SHOW = 3;
const LOAD_MORE_STEP = 5;

export default function ServiceProviderDrawer({ labour, userId, onClose }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [visible, setVisible] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_SHOW);
  const [profileImgOpen, setProfileImgOpen] = useState(false);
  const user = labour.userId;
  const rating = labour.rating || 0;

  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
    fetchReviews();
    checkExistingBooking();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get(`/labour/${labour._id}/reviews`);
      setReviews(data.data ?? data);
    } catch { /* silently fail */ }
    finally { setLoadingReviews(false); }
  };

  const checkExistingBooking = async () => {
    if (!userId) return;
    try {
      const { data } = await api.get('/booking/user');
      const has = data.some(b =>
        (b.providerDetails?._id === labour._id || b.providerId === labour._id) &&
        (b.status === 'pending' || b.status === 'confirmed')
      );
      setBooked(has);
    } catch { /* silently fail */ }
  };

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  const handleCall = async () => {
    if (!userId) { toast.error('Please login to call'); navigate('/login'); return; }
    try {
      await api.post('/call-log', { userId, targetId: labour._id, targetType: 'labour', phone: user?.phone });
    } catch {}
    window.open(`tel:${user?.phone}`, '_self');
    toast.success('📞 Connecting...');
  };

  const handleBook = async () => {
    if (!userId) { toast.error('Please login to book'); navigate('/login'); return; }
    setBooking(true);
    try {
      await api.post('/booking', { providerId: labour._id, providerType: 'labour' });
      toast.success('✅ Booking request sent!');
      setBooked(true);
      close();
      setTimeout(() => navigate('/dashboard', { state: { openTab: 'bookings' } }), 350);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setBooking(false); }
  };

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 100, opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '440px',
        background: '#F8FAFC', zIndex: 101, overflowY: 'auto',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header bar */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
          padding: '16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          flexShrink: 0,
        }}>
          <button
            onClick={close}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
          <div style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>Service Provider Profile</div>
        </div>

        {/* Profile hero — Book / Call buttons live here */}
        <div style={{
          background: 'linear-gradient(160deg, #1E3A8A 0%, #2563EB 100%)',
          padding: '0 20px 24px',
          textAlign: 'center', color: 'white', flexShrink: 0,
        }}>
          {/* Avatar — click to expand */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', paddingTop: '4px' }}>
            {labour.profileImage ? (
              <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }} onClick={() => setProfileImgOpen(true)}>
                <img src={labour.profileImage} alt={user?.name}
                  style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />
                <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🔍</div>
              </div>
            ) : (
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', border: '3px solid rgba(255,255,255,0.3)', fontWeight: '700' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>{user?.name}</h2>
          <p style={{ opacity: 0.8, fontSize: '14px', marginBottom: '10px' }}>🏙️ {user?.city}</p>
          <span style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: '20px',
            background: labour.availability ? 'rgba(22,163,74,0.8)' : 'rgba(100,116,139,0.7)',
            fontSize: '12px', fontWeight: '700', marginBottom: '18px',
          }}>
            {labour.availability ? '✅ Available Now' : '⏸️ Currently Busy'}
          </span>

          {/* ── Action button ── */}
          <div style={{ maxWidth: '320px', margin: '0 auto' }}>
            {booked ? (
              <div style={{
                background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.4)',
                borderRadius: '10px', padding: '12px 16px',
                fontSize: '13px', color: '#DCFCE7', lineHeight: '1.6', textAlign: 'center',
              }}>
                🎉 Booking requested! Go to <strong>My Bookings</strong> to call the provider.
              </div>
            ) : (
              <button
                onClick={handleBook}
                disabled={booking}
                style={{
                  width: '100%', padding: '13px', fontSize: '15px', fontWeight: '700', borderRadius: '12px',
                  background: booking ? 'rgba(249,115,22,0.5)' : '#F97316',
                  border: 'none', color: 'white', cursor: booking ? 'not-allowed' : 'pointer',
                }}
              >
                {booking ? '⏳ Booking...' : '📋 Book Now'}
              </button>
            )}
          </div>
        </div>

        {/* Rating + Bookings stat bar */}
        <div style={{ background: 'white', padding: '14px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px' }}>
            {rating > 0 && (
              <div>
                <div style={{ fontSize: '22px', marginBottom: '2px' }}>⭐</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#1E3A8A' }}>{rating}/5</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Rating</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '22px', marginBottom: '2px' }}>📋</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#1E3A8A' }}>{labour.bookingCount || 0}</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Bookings Completed</div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '0 16px', flex: 1 }}>
          {/* Skills */}
          <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#0F172A' }}>🔧 Skills</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {labour.skills?.map(s => (
                <span key={s} className="badge badge-blue" style={{ fontSize: '13px', padding: '5px 12px' }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#0F172A' }}>ℹ️ Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#64748B' }}>💼 Experience</span>
                <strong>{labour.experience || 0} years</strong>
              </div>
              {labour.charges && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748B' }}>💰 Charges</span>
                  <strong>{labour.charges}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#64748B' }}>📱 Contact</span>
                <strong>{user?.phone}</strong>
              </div>
            </div>
            {labour.description && (
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748B', lineHeight: '1.7', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                {labour.description}
              </p>
            )}
          </div>

          {/* Reviews */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#0F172A' }}>
              ⭐ Customer Reviews {reviews.length > 0 && `(${reviews.length})`}
            </h3>
            {loadingReviews ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <div className="spinner" />
              </div>
            ) : reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                <p style={{ fontSize: '13px' }}>No reviews yet — be the first!</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {visibleReviews.map((r, i) => (
                    <div key={i} style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                            {r.userId?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{r.userId?.name || 'Customer'}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{new Date(r.review.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize: '14px', color: s <= r.review.rating ? '#F59E0B' : '#E2E8F0' }}>★</span>
                        ))}
                      </div>
                      {r.review.comment && (
                        <p style={{ marginTop: '6px', fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{r.review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(c => c + LOAD_MORE_STEP)}
                    style={{
                      width: '100%', marginTop: '12px', padding: '10px',
                      background: '#F1F5F9', border: 'none', borderRadius: '10px',
                      fontSize: '13px', fontWeight: '600', color: '#1E3A8A', cursor: 'pointer',
                    }}
                  >
                    Show More ({reviews.length - visibleCount} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Image Full-Size Modal */}
      {profileImgOpen && labour.profileImage && (
        <div
          onClick={() => setProfileImgOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.93)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setProfileImgOpen(false)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
              width: '40px', height: '40px', borderRadius: '50%',
              fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '700',
            }}
          >
            ✕
          </button>
          <img
            src={labour.profileImage}
            alt={user?.name}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '80vh',
              borderRadius: '16px',
              objectFit: 'contain',
              boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
              border: '3px solid rgba(255,255,255,0.15)',
            }}
          />
        </div>
      )}
    </>
  );
}
