import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const INITIAL_SHOW = 3;
const LOAD_MORE_STEP = 5;

export default function CarOwnerDrawer({ car, userId, onClose }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [visible, setVisible] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_SHOW);
  const [ownerImgOpen, setOwnerImgOpen] = useState(false);
  const owner = car.ownerId?.userId;

  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
    fetchReviews();
    checkExistingBooking();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get(`/car/${car._id}/reviews`);
      setReviews(data.data ?? data);
    } catch { /* silently fail */ }
    finally { setLoadingReviews(false); }
  };

  const checkExistingBooking = async () => {
    if (!userId) return;
    try {
      const { data } = await api.get('/booking/user');
      const has = data.some(b =>
        (b.carId?._id === car._id || b.carId === car._id) &&
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
      await api.post('/call-log', { userId, targetId: car._id, targetType: 'car', phone: owner?.phone });
    } catch {}
    window.open(`tel:${owner?.phone}`, '_self');
    toast.success('📞 Connecting...');
  };

  const handleBook = async () => {
    if (!userId) { toast.error('Please login to book'); navigate('/login'); return; }
    setBooking(true);
    try {
      await api.post('/booking', { providerId: car.ownerId?._id, providerType: 'car', carId: car._id });
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
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.review?.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={close} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 100, opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease',
      }} />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '440px',
        background: '#F8FAFC', zIndex: 101, overflowY: 'auto',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top nav bar */}
        <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A8A)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button onClick={close} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>Car Details</div>
        </div>

        {/* ═══ HERO: Car name + price ═══ */}
        <div style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)', padding: '24px 20px 28px', textAlign: 'center', color: 'white', flexShrink: 0 }}>
          <div style={{ fontSize: '56px', marginBottom: '10px' }}>🚗</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>{car.carName}</h2>
          <p style={{ opacity: 0.75, fontSize: '14px', marginBottom: '10px' }}>
            {car.modelYear} • 🏙️ {car.city || owner?.city || 'N/A'}
          </p>

          {/* Number plate */}
          {car.numberPlate && (
            <div style={{ marginBottom: '14px' }}>
              <span style={{
                display: 'inline-block',
                background: 'white', color: '#0F172A',
                borderRadius: '6px', padding: '4px 16px',
                fontSize: '14px', fontWeight: '800',
                letterSpacing: '2px', fontFamily: 'monospace',
                border: '2px solid #F59E0B',
              }}>
                {car.numberPlate}
              </span>
            </div>
          )}

          {/* Price pill */}
          <div style={{ display: 'inline-block', background: '#F97316', padding: '8px 22px', borderRadius: '24px', fontWeight: '800', fontSize: '22px', marginBottom: '12px' }}>
            ₹{car.basePrice} <span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9 }}>/ {car.priceType === 'per_day' ? 'day' : 'km'}</span>
          </div>

          {/* Availability badge */}
          <div style={{ marginBottom: '18px' }}>
            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', background: car.availability ? 'rgba(22,163,74,0.8)' : 'rgba(239,68,68,0.8)', fontSize: '12px', fontWeight: '700' }}>
              {car.availability ? '✅ Available Now' : '❌ Not Available'}
            </span>
          </div>

          {/* Book button */}
          <div style={{ maxWidth: '320px', margin: '0 auto' }}>
            {booked ? (
              <div style={{
                background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.4)',
                borderRadius: '10px', padding: '12px 16px',
                fontSize: '13px', color: '#DCFCE7', lineHeight: '1.6', textAlign: 'center',
              }}>
                🎉 Booking requested! Go to <strong>My Bookings</strong> to call the owner.
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
                {booking ? '⏳ Booking...' : '📋 Book This Car'}
              </button>
            )}
          </div>
        </div>

        {/* ═══ STATS BAR ═══ */}
        <div style={{ background: 'white', padding: '14px 16px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '2px' }}>📋</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1E3A8A' }}>{car.bookingCount || 0}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Bookings Done</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '2px' }}>⭐</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#F59E0B' }}>{avgRating || '—'}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Avg Rating</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '2px' }}>💬</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#16A34A' }}>{reviews.length}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Reviews</div>
            </div>
          </div>
        </div>

        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* ── OWNER PROFILE CARD ── */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#0F172A' }}>👤 Owner Details</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Profile photo — tap to expand */}
              <div
                onClick={() => owner?.avatar && setOwnerImgOpen(true)}
                style={{ flexShrink: 0, cursor: owner?.avatar ? 'pointer' : 'default', position: 'relative' }}
              >
                {owner?.avatar ? (
                  <>
                    <img
                      src={owner.avatar}
                      alt={owner.name}
                      style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #E2E8F0', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: '0', right: '0',
                      background: '#1E3A8A', borderRadius: '50%',
                      width: '20px', height: '20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', border: '2px solid white',
                    }}>🔍</div>
                  </>
                ) : (
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F97316, #EA580C)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '30px', color: 'white', fontWeight: '800', border: '3px solid #E2E8F0',
                  }}>
                    {owner?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>

              {/* Owner info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {owner?.name || 'Car Owner'}
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
                  🏙️ {car.city || owner?.city || 'Location not set'}
                </div>
                <span style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
                  background: '#EFF6FF', color: '#1E3A8A', fontSize: '11px', fontWeight: '700',
                }}>🚗 Verified Car Owner</span>
              </div>
            </div>

            {owner?.avatar && (
              <p style={{ marginTop: '10px', fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
                Tap photo to view full size
              </p>
            )}

            {/* Call owner button */}
            <button
              onClick={handleCall}
              style={{
                marginTop: '16px', width: '100%', padding: '12px', fontSize: '14px', fontWeight: '700',
                background: 'linear-gradient(135deg, #16A34A, #15803D)',
                border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
              }}
            >
              📞 Call Owner Directly
            </button>
          </div>

          {/* ── CAR FEATURES ── */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', color: '#0F172A' }}>🔍 Car Features</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { icon: car.ac ? '❄️' : '🌡️', label: car.ac ? 'AC' : 'Non-AC', ok: car.ac },
                { icon: car.driverIncluded ? '🧑‍✈️' : '🚗', label: car.driverIncluded ? 'Driver Included' : 'Self Drive', ok: car.driverIncluded },
              ].map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: '10px',
                  background: f.ok ? '#F0FDF4' : '#F8FAFC',
                  border: `1px solid ${f.ok ? '#BBF7D0' : '#E2E8F0'}`,
                }}>
                  <span style={{ fontSize: '20px' }}>{f.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: f.ok ? '#166534' : '#374151' }}>{f.label}</span>
                </div>
              ))}
            </div>

            {/* Spec table */}
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: '📅 Model Year', value: car.modelYear },
                { label: '💰 Price Type', value: car.priceType === 'per_day' ? 'Per Day' : 'Per KM' },
                { label: '💵 Base Price', value: `₹${car.basePrice} / ${car.priceType === 'per_day' ? 'day' : 'km'}` },
                ...(car.numberPlate ? [{ label: '🔢 Number Plate', value: car.numberPlate }] : []),
                { label: '🏙️ City', value: car.city || owner?.city || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #F1F5F9', fontSize: '14px',
                }}>
                  <span style={{ color: '#64748B' }}>{label}</span>
                  <strong style={{ color: '#0F172A', maxWidth: '55%', textAlign: 'right' }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* ── REVIEWS ── */}
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
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
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #0F172A, #1E3A8A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '700' }}>
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

      {/* ═══ OWNER IMAGE FULL-SIZE LIGHTBOX ═══ */}
      {ownerImgOpen && owner?.avatar && (
        <div
          onClick={() => setOwnerImgOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setOwnerImgOpen(false)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
              width: '40px', height: '40px', borderRadius: '50%',
              fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700',
            }}
          >✕</button>
          <div style={{ textAlign: 'center' }}>
            <img
              src={owner.avatar}
              alt={owner.name}
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '88vw', maxHeight: '74vh',
                borderRadius: '16px', objectFit: 'contain',
                boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
                border: '3px solid rgba(255,255,255,0.15)',
              }}
            />
            <div style={{ marginTop: '12px', color: 'white', fontSize: '14px', fontWeight: '600' }}>
              {owner.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              🚗 Car Owner
            </div>
          </div>
        </div>
      )}
    </>
  );
}
