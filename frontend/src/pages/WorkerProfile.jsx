/**
 * WorkerProfile.jsx — Premium, trust-focused profile page
 *
 * Sections (top → bottom):
 *  1. Hero Header  — avatar, name, badge, rating, jobs, location
 *  2. Availability  — live status dot
 *  3. Quick Stats   — rating / bookings / experience
 *  4. Skills / Details
 *  5. Video Gallery — lazy-load YouTube thumbnails; open full reel on tap
 *  6. Reviews       — card-based, avg rating bar
 *  7. Sticky "Book Now" CTA
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const thumbUrl = (id) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
const thumbFallback = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

function StarBar({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ letterSpacing: '1px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= full ? '#FBBF24' : (i === full + 1 && half ? '#FBBF24' : '#E2E8F0'), fontSize: '16px' }}>
          {i <= full ? '★' : (i === full + 1 && half ? '★' : '☆')}
        </span>
      ))}
    </span>
  );
}

/* ── Skeleton loader ──────────────────────────────────────────────────────── */
function Skeleton({ w = '100%', h = '16px', r = '8px', mb = '0' }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

/* ── Confirm booking bottom sheet ─────────────────────────────────────────── */
function ConfirmSheet({ provider, owner, type, onConfirm, onCancel, booking }) {
  const profile = provider || {};
  return (
    <div style={S.confirmBackdrop} onClick={onCancel}>
      <div style={S.confirmSheet} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(0,0,0,0.12)', margin: '0 auto 20px' }} />
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
          Confirm Booking
        </p>
        {/* Worker card */}
        <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(profile.profileImage || owner.avatar)
              ? <img src={profile.profileImage || owner.avatar} alt={owner.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF6600' }} />
              : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20, flexShrink: 0 }}>{owner.name?.[0]?.toUpperCase()}</div>
            }
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>{owner.name}</p>
              <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0' }}>
                {type === 'labour' ? '👷 Worker' : '🚗 Car Owner'}
                {profile.city ? ` · 📍 ${profile.city}` : ''}
              </p>
            </div>
            {profile.charges && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#16A34A', fontWeight: 900, fontSize: 18, margin: 0 }}>₹{profile.charges}</p>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>charges</p>
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
          A booking request will be sent. The worker will contact you shortly.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1.5px solid #E2E8F0', background: 'transparent', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>Cancel</button>
          <button onClick={onConfirm} disabled={booking} style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(249,115,22,0.4)', opacity: booking ? 0.7 : 1 }}>
            {booking ? '⏳ Booking…' : '✅ Yes, Book Now!'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Single lazy video card ───────────────────────────────────────────────── */
function VideoCard({ video, onPlay }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div style={S.videoCard} onClick={() => onPlay(video)}>
      <img
        src={imgError ? thumbFallback(video.videoId) : thumbUrl(video.videoId)}
        alt={video.title || 'Work video'}
        style={S.videoThumb}
        loading="lazy"
        onError={() => setImgError(true)}
      />
      {/* Dark gradient */}
      <div style={S.videoGradient} />
      {/* Play button */}
      <div style={S.playCircle}>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      {/* Title */}
      {video.title && (
        <p style={S.videoCaption}>{video.title}</p>
      )}
      {/* YouTube badge */}
      <div style={S.ytBadge}>
        <svg viewBox="0 0 68 48" width="18" height="13">
          <path d="M66.5 7.7c-.8-2.9-3-5.2-5.9-6C55.8 0 34 0 34 0S12.2 0 7.4 1.6c-2.9.8-5.1 3.1-5.9 6C0 12.5 0 24 0 24s0 11.5 1.5 16.3c.8 2.9 3 5.2 5.9 6C12.2 48 34 48 34 48s21.8 0 26.6-1.6c2.9-.8 5.1-3.1 5.9-6C68 35.5 68 24 68 24s0-11.5-1.5-16.3z" fill="#ff0000" />
          <path d="M45 24 27 14v20" fill="white" />
        </svg>
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function WorkerProfile() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  const [provider, setProvider] = useState(null);
  const [videos, setVideos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [videoModalVid, setVideoModalVid] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProfile(), fetchVideos(), fetchReviews()])
      .finally(() => setLoading(false));
    api.get('/locations').then(({ data }) => setLocations(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  const fetchProfile = async () => {
    try {
      const endpoint = type === 'labour' ? `/labours/${id}` : `/cars/${id}`;
      const { data } = await api.get(endpoint);
      setProvider(data);
    } catch {
      toast.error('Failed to load profile');
      navigate(-1);
    }
  };

  const fetchVideos = async () => {
    try {
      const { data } = await api.get(`/videos?uploaderId=${id}&limit=20`);
      setVideos(data.data || []);
    } catch { /* silent */ }
  };

  const fetchReviews = async () => {
    try {
      const endpoint = type === 'labour' ? `/labours/${id}/reviews` : `/cars/${id}/reviews`;
      const { data } = await api.get(endpoint);
      setReviews(data.data ?? data);
    } catch { /* silent */ }
  };

  const handleBook = () => {
    if (!currentUser) {
      toast.error(t('loginToBook') || 'Please login to book');
      navigate('/login');
      return;
    }
    // Workers and car owners cannot book services
    if (currentUser.role === 'labour' || currentUser.role === 'carowner') {
      toast.error('⚠️ Service providers cannot book services. Please use a customer account.');
      return;
    }
    setShowConfirm(true);
  };

  const confirmBook = async () => {
    setBooking(true);
    try {
      const payload = {
        providerId: type === 'labour' ? id : (provider?.ownerId?._id || provider?.ownerId),
        providerType: type === 'labour' ? 'labour' : 'car',
      };
      if (type === 'car') payload.carId = id;
      if (selectedArea) payload.address = selectedArea;
      await api.post('/booking', payload);
      setShowConfirm(false);
      toast.success('🎉 Booking requested successfully!');
      navigate('/dashboard', { state: { openTab: 'bookings' } });
    } catch (err) {
      setShowConfirm(false);
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };


  const openVideoInline = (video) => {
    // Navigate to reels page focused on this video
    navigate('/reels', { state: { videoId: video.videoId } });
  };

  /* ── Derived data ───────────────────────────────────────────────── */
  const profile = provider || {};
  // Labour: profile.userId = user object. Car: profile.ownerId.userId = user object
  const owner = type === 'car'
    ? (profile.ownerId?.userId || profile.ownerId || {})
    : (profile.userId || {});
  const rating = profile.rating || 0;
  const reviewCount = profile.reviewCount || reviews.length;
  const bookingCount = profile.bookingCount || 0;
  const experience = profile.experience || 0;
  const isAvailable = profile.availability !== false;
  const skills = profile.skills || [];
  // For cars: charges = basePrice per km
  const charges = type === 'car' ? (profile.basePrice ? `${profile.basePrice}/km` : null) : profile.charges;
  const description = profile.description || (type === 'car' && profile.carName ? `${profile.carName} · ${profile.seats || ''} Seater · ${profile.modelYear || ''}` : null);
  const city = owner.city || profile.city || '';
  const serviceAreas = profile.serviceAreas || [];

  // Trust badge
  const badge = bookingCount >= 50
    ? { label: '🏆 Top Worker', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' }
    : profile.isApproved
      ? { label: '✅ Verified', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' }
      : { label: '🆕 New', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };

  // Average rating bar width
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.review?.rating || 0), 0) / reviews.length)
    : rating;

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 4);

  /* ── Skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <style>{`
          @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        `}</style>
        <div style={S.page}>
          {/* Back header */}
          <div style={S.header}>
            <button onClick={() => navigate(-1)} style={S.backBtn} aria-label="Go back">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <Skeleton w="120px" h="18px" r="8px" />
          </div>
          <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>
            <div style={{ background: 'white', borderRadius: 24, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <Skeleton w="88px" h="88px" r="50%" />
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <Skeleton w="60%" h="22px" r="8px" mb="10px" />
                  <Skeleton w="40%" h="16px" r="6px" mb="8px" />
                  <Skeleton w="50%" h="14px" r="6px" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} h="60px" r="12px" />)}
              </div>
              <Skeleton h="52px" r="14px" />
            </div>
            {[1, 2].map(i => <Skeleton key={i} h="100px" r="16px" mb="16px" />)}
          </div>
          <div style={{ height: 80 }} />
        </div>
      </>
    );
  }

  if (!provider) return null;

  return (
    <>
      {/* Global animations */}
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseGreen { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.4)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        .video-card-hover:hover .play-circle { transform:translate(-50%,-50%) scale(1.1)!important; }
        .video-card-hover:active { transform:scale(0.97); }
        .book-btn:active { transform:scale(0.97); }
        .review-card { animation: fadeUp 0.3s ease both; }
      `}</style>

      {/* Booking Confirm Sheet with Area Selection */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowConfirm(false)}>
          <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 36px', animation: 'slideUp 0.25s ease' }}
            onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
              Confirm Booking
            </p>

            {/* Worker card */}
            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
              {(profile.profileImage || owner.avatar)
                ? <img src={profile.profileImage || owner.avatar} alt={owner.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF6600', flexShrink: 0 }} />
                : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>{owner.name?.[0]?.toUpperCase()}</div>
              }
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>{owner.name}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                  {type === 'labour' ? '👷 Worker' : '🚗 Car Owner'}
                  {city ? ` · 📍 ${city}` : ''}
                </p>
              </div>
              {profile.charges && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ color: '#16A34A', fontWeight: 900, fontSize: 17, margin: 0 }}>₹{profile.charges}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>charges</p>
                </div>
              )}
            </div>

            {/* Area sub-selection — shown only if this city has sub-areas */}
            {(() => {
              const loc = locations.find(l => l.city === city);
              const areas = (loc?.areas || [])
                .filter(a => (typeof a === 'string') || a.isActive !== false)
                .map(a => typeof a === 'string' ? a : a.name)
                .filter(Boolean);
              if (!areas.length) return null;
              return (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                    📍 Select your area <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {areas.map(area => (
                      <button key={area} onClick={() => setSelectedArea(prev => prev === area ? '' : area)}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          border: `1.5px solid ${selectedArea === area ? '#4F46E5' : '#E2E8F0'}`,
                          background: selectedArea === area ? '#EEF2FF' : 'white',
                          color: selectedArea === area ? '#4F46E5' : '#64748B',
                          transition: 'all 0.15s',
                        }}>
                        {area} {selectedArea === area ? '✓' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', margin: '0 0 18px', lineHeight: 1.6 }}>
              A booking request will be sent. The worker will contact you shortly.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: 14, borderRadius: 14, border: '1.5px solid #E2E8F0', background: 'transparent', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>
                Cancel
              </button>
              <button onClick={confirmBook} disabled={booking}
                style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(249,115,22,0.4)', opacity: booking ? 0.7 : 1 }}>
                {booking ? '⏳ Booking…' : '✅ Yes, Book Now!'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.page}>
        {/* ── Sticky Header ─────────────────────────────────────────── */}
        <div style={S.header}>
          <button onClick={() => navigate(-1)} style={S.backBtn} aria-label="Go back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 style={S.headerTitle}>{type === 'labour' ? 'Worker Profile' : 'Car Profile'}</h1>
          {/* Share icon placeholder */}
          <button style={{ ...S.backBtn, marginLeft: 'auto' }} aria-label="Share">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>

        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          <div style={S.container}>

            {/* ── Hero Card ─────────────────────────────────────────── */}
            <div style={S.heroCard}>
              {/* Top: avatar + meta */}
              <div style={S.heroTop}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {(profile.profileImage || owner.avatar)
                    ? <img src={profile.profileImage || owner.avatar} alt={owner.name} style={S.avatar} />
                    : <div style={S.avatarFallback}>{owner.name?.[0]?.toUpperCase() || '?'}</div>
                  }
                  {/* Availability dot */}
                  <div style={{ ...S.availDot, background: isAvailable ? '#22C55E' : '#94A3B8', animation: isAvailable ? 'pulseGreen 2s infinite' : 'none' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={S.name}>{owner.name || 'Worker'}</h2>

                  {/* Trust badge */}
                  <span style={{ ...S.trustBadge, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                    {badge.label}
                  </span>

                  {/* Availability text */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isAvailable ? '#22C55E' : '#94A3B8', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: isAvailable ? '#16A34A' : '#64748B' }}>
                      {isAvailable ? 'Available Now' : 'Currently Busy'}
                    </span>
                  </div>

                  {/* Location */}
                  {city && (
                    <p style={S.locationText}>
                      📍 {city}
                      {serviceAreas.length > 0 && <span style={{ color: '#94A3B8' }}> · {serviceAreas[0]}</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats row — no experience for cars */}
              <div style={S.statsRow}>
                <div style={S.statBox}>
                  <StarBar rating={rating} />
                  <span style={S.statBig}>{rating.toFixed(1)}</span>
                  <span style={S.statSub}>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                </div>
                <div style={S.statDivider} />
                <div style={S.statBox}>
                  <span style={{ fontSize: 22 }}>💼</span>
                  <span style={S.statBig}>{bookingCount}</span>
                  <span style={S.statSub}>Trips Done</span>
                </div>
                {type !== 'car' && (
                  <>
                    <div style={S.statDivider} />
                    <div style={S.statBox}>
                      <span style={{ fontSize: 22 }}>🏅</span>
                      <span style={S.statBig}>{experience}<span style={{ fontSize: 14 }}>yr{experience !== 1 ? 's' : ''}</span></span>
                      <span style={S.statSub}>Experience</span>
                    </div>
                  </>
                )}
                {type === 'car' && (
                  <>
                    <div style={S.statDivider} />
                    <div style={S.statBox}>
                      <span style={{ fontSize: 22 }}>🪑</span>
                      <span style={S.statBig}>{profile.seats || '—'}</span>
                      <span style={S.statSub}>Seats</span>
                    </div>
                  </>
                )}
              </div>

              {/* ── CAR DETAILS CARD (only for car type) ── */}
              {type === 'car' && (
                <div style={{ marginBottom: 20 }}>
                  {/* Price row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', borderRadius: 14, padding: '12px 16px', border: '1px solid #BBF7D0', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Price</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#16A34A' }}>₹{profile.basePrice || '—'}</span>
                    <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 700 }}>/ km</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#16A34A', fontWeight: 700, background: 'white', padding: '2px 10px', borderRadius: 20, border: '1px solid #BBF7D0' }}>Best Price</span>
                  </div>

                  {/* Car info grid */}
                  <p style={S.sectionMicro}>CAR DETAILS</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[
                      { icon: '🚗', label: 'Car Name', value: profile.carName },
                      { icon: '🔖', label: 'Number Plate', value: profile.numberPlate },
                      { icon: '📅', label: 'Model Year', value: profile.modelYear },
                      { icon: '🪑', label: 'Seating', value: profile.seats ? `${profile.seats} Seats` : null },
                    ].filter(d => d.value).map(d => (
                      <div key={d.label} style={{ background: '#F8FAFC', borderRadius: 12, padding: '10px 14px', border: '1px solid #F1F5F9' }}>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{d.icon} {d.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{d.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* With Driver badge — always shown */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '8px 16px', marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>🧑‍✈️</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>Driver Included</span>
                  </div>

                  {/* Service cities */}
                  {profile.ownerId?.serviceCities?.length > 0 && (
                    <div>
                      <p style={S.sectionMicro}>AVAILABLE IN CITIES</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {profile.ownerId.serviceCities.map(c => (
                          <span key={c} style={{ fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '4px 12px', borderRadius: 20 }}>
                            📍 {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── LABOUR FIELDS (only for labour type) ── */}
              {type !== 'car' && (
                <>
                  {/* Charges */}
                  {charges && (
                    <div style={S.chargesRow}>
                      <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Starting from</span>
                      <span style={S.chargesValue}>₹{charges}</span>
                      <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 700, background: '#F0FDF4', padding: '2px 10px', borderRadius: 20, border: '1px solid #BBF7D0' }}>Best Price</span>
                    </div>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <p style={S.sectionMicro}>EXPERTISE</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {skills.map(skill => (
                          <span key={skill} style={S.skillChip}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {description && (
                    <div style={S.descBox}>
                      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, margin: 0 }}>
                        💬 {description}
                      </p>
                    </div>
                  )}

                  {/* Service areas */}
                  {serviceAreas.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <p style={S.sectionMicro}>SERVICE AREAS</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {serviceAreas.map(a => (
                          <span key={a} style={{ fontSize: 12, fontWeight: 600, background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', padding: '4px 12px', borderRadius: 20 }}>
                            📍 {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Book CTA — inside card (non-sticky) */}
              {currentUser && (currentUser.role === 'labour' || currentUser.role === 'carowner') ? (
                <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🚫</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#C2410C', marginBottom: 4 }}>Service providers cannot book</div>
                  <div style={{ fontSize: 12, color: '#92400E' }}>Please use a customer account to make bookings.</div>
                </div>
              ) : (
                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="book-btn"
                  style={S.inlineBookBtn}
                >
                  <span style={{ fontSize: 18 }}>{type === 'car' ? '🚗' : '📅'}</span>
                  {booking ? 'Processing…' : type === 'car' ? 'Book This Car' : 'Book Service Now'}
                </button>
              )}
            </div>


            {/* ── Video Gallery ─────────────────────────────────────── */}
            {videos.length > 0 && (
              <div style={S.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={S.sectionTitle}>🎥 Work Videos</h3>
                    <p style={S.sectionSub}>See {owner.name?.split(' ')[0] || 'this worker'}'s real work</p>
                  </div>
                  <span style={{ fontSize: 12, background: '#FFF7ED', color: '#C2410C', padding: '4px 12px', borderRadius: 20, fontWeight: 700, border: '1px solid #FED7AA' }}>
                    {videos.length} video{videos.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div style={S.videoGrid}>
                  {videos.map(video => (
                    <VideoCard key={video._id} video={video} onPlay={openVideoInline} />
                  ))}
                </div>

                {videos.length > 2 && (
                  <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12 }}>
                    Tap a video to watch the full Reel ↑
                  </p>
                )}
              </div>
            )}

            {/* ── Reviews Section ───────────────────────────────────── */}
            <div style={S.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h3 style={S.sectionTitle}>⭐ Customer Reviews</h3>
                <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{reviews.length} total</span>
              </div>

              {reviews.length > 0 && (
                <div style={S.ratingOverview}>
                  {/* Big number */}
                  <div style={{ textAlign: 'center', paddingRight: 20, borderRight: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: 42, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
                      {avgRating.toFixed(1)}
                    </div>
                    <StarBar rating={avgRating} />
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{reviews.length} reviews</div>
                  </div>
                  {/* Rating breakdown */}
                  <div style={{ flex: 1, paddingLeft: 20 }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviews.filter(r => Math.round(r.review?.rating) === star).length;
                      const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, width: 12, textAlign: 'right' }}>{star}</span>
                          <span style={{ fontSize: 11, color: '#FBBF24' }}>★</span>
                          <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct > 0 ? 'linear-gradient(90deg,#FBBF24,#F59E0B)' : 'transparent', borderRadius: 4, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#94A3B8', width: 22, textAlign: 'right' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div style={S.emptyReviews}>
                  <span style={{ fontSize: 36 }}>⭐</span>
                  <p style={{ fontSize: 14, color: '#94A3B8', margin: '8px 0 0' }}>No reviews yet. Be the first to book!</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                    {displayedReviews.map((r, i) => (
                      <div key={i} className="review-card" style={{ ...S.reviewCard, animationDelay: `${i * 0.06}s` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                              {r.userId?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#0F172A' }}>{r.userId?.name || 'Customer'}</p>
                              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFFBEB', padding: '4px 10px', borderRadius: 20, border: '1px solid #FDE68A' }}>
                            <span style={{ fontSize: 13, color: '#FBBF24' }}>★</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>{r.review?.rating}/5</span>
                          </div>
                        </div>
                        {r.review?.comment && (
                          <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6, paddingLeft: 46 }}>
                            "{r.review.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {reviews.length > 4 && (
                    <button
                      onClick={() => setShowAllReviews(v => !v)}
                      style={S.showMoreBtn}
                    >
                      {showAllReviews ? '▲ Show Less' : `▼ See All ${reviews.length} Reviews`}
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 120 }} />
        <BottomNav />
      </div>

      {/* ── Sticky Booking CTA ─────────────────────────────────────── */}
      <div style={S.stickyBar}>
        <div style={S.stickyInner}>
          {charges && (
            <div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontWeight: 600 }}>Starting from</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0 }}>₹{charges}</p>
            </div>
          )}
          <button
            onClick={handleBook}
            disabled={booking}
            className="book-btn"
            style={S.stickyBookBtn}
          >
            {booking ? '⏳ Processing…' : '📅 Book Now'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const S = {
  page: {
    background: '#F8FAFC',
    minHeight: '100vh',
    color: '#0F172A',
    paddingBottom: 0,
  },
  header: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'white',
    borderBottom: '1px solid #F1F5F9',
    position: 'sticky',
    top: 0,
    zIndex: 40,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  backBtn: {
    background: '#F1F5F9',
    border: 'none',
    borderRadius: '50%',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748B',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  headerTitle: { fontSize: 17, fontWeight: 800, margin: 0, color: '#0F172A' },
  container: { padding: '16px', maxWidth: 600, margin: '0 auto' },

  /* Hero card */
  heroCard: {
    background: 'white',
    borderRadius: 24,
    padding: 24,
    boxShadow: '0 4px 24px rgba(15,23,42,0.07)',
    marginBottom: 20,
    border: '1px solid #F1F5F9',
  },
  heroTop: { display: 'flex', gap: 18, marginBottom: 22, alignItems: 'flex-start' },
  avatar: {
    width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
    border: '3px solid #EEF2FF', flexShrink: 0,
    boxShadow: '0 4px 16px rgba(79,70,229,0.15)',
  },
  avatarFallback: {
    width: 88, height: 88, borderRadius: '50%',
    background: 'linear-gradient(135deg,#4F46E5,#818CF8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: 34, fontWeight: 900, flexShrink: 0,
    boxShadow: '0 4px 16px rgba(79,70,229,0.25)',
  },
  availDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid white',
  },
  name: {
    fontSize: 22, fontWeight: 900, margin: '0 0 8px',
    letterSpacing: '-0.5px', color: '#0F172A',
    lineHeight: 1.2,
  },
  trustBadge: {
    display: 'inline-block', fontSize: 12, fontWeight: 800,
    padding: '4px 12px', borderRadius: 20,
  },
  locationText: {
    fontSize: 13, color: '#64748B', margin: '8px 0 0', fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 4,
  },

  /* Stats */
  statsRow: {
    display: 'flex', alignItems: 'stretch',
    background: '#FAFAFA', borderRadius: 18,
    border: '1px solid #F1F5F9', marginBottom: 20,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '14px 8px', gap: 2, textAlign: 'center',
  },
  statDivider: { width: 1, background: '#E2E8F0', flexShrink: 0 },
  statBig: { fontSize: 20, fontWeight: 900, color: '#0F172A', lineHeight: 1.1 },
  statSub: { fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },

  /* Charges */
  chargesRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#F0FDF4', borderRadius: 14, padding: '12px 16px',
    border: '1px solid #BBF7D0', marginBottom: 20,
  },
  chargesValue: { fontSize: 22, fontWeight: 900, color: '#16A34A' },

  /* Skills */
  sectionMicro: {
    fontSize: 10, fontWeight: 800, color: '#94A3B8',
    letterSpacing: '1px', textTransform: 'uppercase',
    marginBottom: 10,
  },
  skillChip: {
    background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)',
    color: '#4338CA', padding: '6px 14px', borderRadius: 12,
    fontSize: 13, fontWeight: 700, border: '1px solid #C7D2FE',
  },

  /* Description */
  descBox: {
    background: '#FAFAFA', borderRadius: 14,
    padding: '12px 14px', marginBottom: 20,
    border: '1px solid #F1F5F9',
    borderLeft: '3px solid #4F46E5',
  },

  /* Inline Book button */
  inlineBookBtn: {
    width: '100%', padding: '16px', borderRadius: 16,
    background: 'linear-gradient(135deg,#F97316,#EA580C)',
    color: 'white', border: 'none', fontSize: 16, fontWeight: 800,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    boxShadow: '0 8px 24px rgba(249,115,22,0.35)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },

  /* Sections */
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: '#0F172A' },
  sectionSub: { fontSize: 13, color: '#94A3B8', margin: 0 },

  /* Video grid — compact 3-column */
  videoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
  },
  videoCard: {
    position: 'relative', borderRadius: 10, overflow: 'hidden',
    cursor: 'pointer', background: '#000',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    aspectRatio: '9/16',
  },
  videoThumb: {
    width: '100%', height: '100%',
    objectFit: 'cover', opacity: 0.82,
    display: 'block',
  },
  videoGradient: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)',
    pointerEvents: 'none',
  },
  playCircle: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 28, height: 28, borderRadius: '50%',
    background: 'rgba(255,255,255,0.22)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid rgba(255,255,255,0.4)',
    transition: 'transform 0.2s',
  },
  videoCaption: {
    position: 'absolute', bottom: 4, left: 0, right: 0,
    padding: '0 6px', color: 'white',
    fontSize: 9, fontWeight: 600, margin: 0,
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  ytBadge: {
    position: 'absolute', top: 4, right: 4,
    background: 'rgba(0,0,0,0.5)',
    borderRadius: 4, padding: '1px 3px',
    display: 'flex', alignItems: 'center',
  },

  /* Reviews */
  ratingOverview: {
    display: 'flex', alignItems: 'center',
    background: 'white', borderRadius: 18, padding: 16,
    border: '1px solid #F1F5F9',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    marginBottom: 4,
  },
  reviewCard: {
    background: 'white', padding: 16, borderRadius: 16,
    border: '1px solid #F1F5F9',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  showMoreBtn: {
    width: '100%', padding: '12px',
    marginTop: 12, borderRadius: 12,
    border: '1.5px solid #E2E8F0', background: 'white',
    fontSize: 13, fontWeight: 700, color: '#4F46E5',
    cursor: 'pointer',
  },
  emptyReviews: {
    textAlign: 'center', padding: '40px 20px',
    background: 'white', borderRadius: 18,
    border: '1.5px dashed #E2E8F0',
  },

  /* Sticky bar */
  stickyBar: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid #F1F5F9',
    padding: '12px 16px',
    zIndex: 50,
    boxShadow: '0 -4px 24px rgba(15,23,42,0.08)',
  },
  stickyInner: {
    display: 'flex', alignItems: 'center', gap: 16,
    maxWidth: 600, margin: '0 auto',
  },
  stickyBookBtn: {
    flex: 1, padding: '14px 20px', borderRadius: 16,
    background: 'linear-gradient(135deg,#F97316,#EA580C)',
    color: 'white', border: 'none', fontSize: 16, fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(249,115,22,0.4)',
    transition: 'transform 0.15s',
  },

  /* Confirm sheet */
  confirmBackdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 9999, animation: 'fadeUp 0.25s ease',
  },
  confirmSheet: {
    background: 'white', borderRadius: '28px 28px 0 0',
    padding: '16px 20px 36px', width: '100%', maxWidth: 480,
    boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
    animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
  },
};
