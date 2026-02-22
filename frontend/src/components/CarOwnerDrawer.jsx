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

  const StarRow = ({ count }) => (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: '15px', color: s <= count ? '#F59E0B' : 'rgba(255,255,255,0.3)' }}>★</span>
      ))}
    </div>
  );

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

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
          <button onClick={close} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
          <div style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>Car Details</div>
        </div>

        {/* Hero section */}
        <div style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)', padding: '24px 20px 28px', textAlign: 'center', color: 'white', flexShrink: 0 }}>
          <div style={{ fontSize: '56px', marginBottom: '10px' }}>🚗</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>{car.carName}</h2>
          <p style={{ opacity: 0.75, fontSize: '14px', marginBottom: '6px' }}>
            {car.modelYear} • {owner?.name} • 🏙️ {car.city || owner?.city}
          </p>

          {/* Number plate display */}
          {car.numberPlate && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{
                display: 'inline-block',
                background: 'white', color: '#0F172A',
                borderRadius: '6px', padding: '4px 14px',
                fontSize: '14px', fontWeight: '800',
                letterSpacing: '2px', fontFamily: 'monospace',
                border: '2px solid #F59E0B',
              }}>
                {car.numberPlate}
              </span>
            </div>
          )}

          {/* Price pill */}
          <div style={{ display: 'inline-block', background: '#F97316', padding: '8px 20px', borderRadius: '24px', fontWeight: '800', fontSize: '20px', marginBottom: '14px' }}>
            ₹{car.basePrice} <span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9 }}>/ {car.priceType === 'per_day' ? 'day' : 'km'}</span>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', background: car.availability ? 'rgba(22,163,74,0.8)' : 'rgba(239,68,68,0.8)', fontSize: '12px', fontWeight: '700' }}>
              {car.availability ? '✅ Available Now' : '❌ Not Available'}
            </span>
          </div>

          {/* ── Action button ── */}
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
                {booking ? '⏳ Booking...' : '📋 Book Now'}
              </button>
            )}
          </div>
        </div>

        {/* Booking count stat */}
        <div style={{ background: 'white', padding: '14px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
            <div>
              <div style={{ fontSize: '22px', marginBottom: '2px' }}>📋</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#1E3A8A' }}>{car.bookingCount || 0}</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Bookings Completed</div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '0 16px', flex: 1 }}>
          {/* Features */}
          <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#0F172A' }}>🔍 Car Features</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {car.ac
                ? <span className="badge badge-blue" style={{ fontSize: '13px', padding: '5px 12px' }}>❄️ AC</span>
                : <span className="badge badge-gray" style={{ fontSize: '13px', padding: '5px 12px' }}>🌡️ Non-AC</span>}
              {car.driverIncluded
                ? <span className="badge badge-green" style={{ fontSize: '13px', padding: '5px 12px' }}>🧑‍✈️ Driver Included</span>
                : <span className="badge badge-gray" style={{ fontSize: '13px', padding: '5px 12px' }}>🚗 Self Drive</span>}
            </div>
          </div>

          {/* Owner Details */}
          <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#0F172A' }}>👤 Owner Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Name', value: owner?.name || '—' },
                { label: '🏙️ City', value: car.city || owner?.city || '—' },
                { label: '📅 Year', value: car.modelYear },
                ...(car.numberPlate ? [{ label: '🔢 Number Plate', value: car.numberPlate }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748B' }}>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
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
    </>
  );
}
