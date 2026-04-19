/**
 * ReelsPage.jsx
 * ─────────────
 * Full-screen vertical video feed — Instagram Reels-style.
 *
 * Key improvements:
 *  ✅ Real-time drag feedback (video follows your finger)
 *  ✅ Velocity-based snapping (quick flick = navigate)
 *  ✅ Rubber-band resistance at top/bottom edges
 *  ✅ Up/Down nav buttons on right side
 *  ✅ Back button (top-left) → navigate(-1), goes back to site
 *  ✅ sessionStorage saves last position — no restart on back/re-enter
 *  ✅ Left-edge swipe zone so YouTube controls still work in center
 *  ✅ isAnimating guard prevents double-skip
 *  ✅ Keyboard arrow key support
 *
 * Smart mode detection:
 *  ✅ HTTPS → YouTube iframe embeds
 *  🖼  HTTP  → thumbnail + "Watch" button (no Error 153)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

/* ── Secure origin check ── */
const IS_SECURE =
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

/* ── YouTube helpers ── */
const embedUrl = (id, muted = true) =>
    `https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}&controls=1&modestbranding=1&rel=0&playsinline=1&mute=${muted ? 1 : 0}`;
const thumbUrl = (id) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
const shortsUrl = (id) => `https://youtube.com/shorts/${id}`;

export default function ReelsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [booking, setBooking] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [showGuide, setShowGuide] = useState(false);
    // Unmute hint — videos autoplay muted on iPhone; show a guide badge
    const [showUnmuteHint, setShowUnmuteHint] = useState(false);

    /* ── Refs ── */
    const containerRef = useRef(null);      // the scrolling column
    const viewportRef = useRef(null);       // the fixed page wrapper (native touch target)
    const startY = useRef(0);
    const startTime = useRef(0);
    const liveDy = useRef(0);              // real-time drag offset
    const isDragging = useRef(false);
    const isAnimating = useRef(false);
    const currentIdxRef = useRef(0);       // mirror currentIdx for handlers
    const videosRef = useRef([]);          // mirror videos for handlers

    /* Keep refs in sync */
    useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
    useEffect(() => { videosRef.current = videos; }, [videos]);

    /* ── Apply CSS transform directly (avoids React re-render lag) ── */
    const applyTransform = useCallback((idx, animated = true) => {
        if (!containerRef.current) return;
        containerRef.current.style.transition = animated
            ? 'transform 0.36s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'none';
        containerRef.current.style.transform = `translateY(-${idx * 100}%)`;
    }, []);

    /* ── When currentIdx state changes, sync the transform & persist ── */
    useEffect(() => {
        applyTransform(currentIdx, true);
        sessionStorage.setItem('reels_idx', String(currentIdx));
    }, [currentIdx, applyTransform]);

    /* ── Prevent mobile browser pull-to-refresh while open ── */
    useEffect(() => {
        document.body.classList.add('reels-open');
        return () => document.body.classList.remove('reels-open');
    }, []);

    /* ─────────────────────────────────────────────────────────────────────
     * NATIVE touch listeners — MUST be { passive: false } so that
     * e.preventDefault() actually blocks iOS Safari's pull-to-refresh
     * and overscroll. React synthetic events cannot do this.
     * ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const handleStart = (e) => {
            if (isAnimating.current) return;
            // Don't capture touches on modals / buttons — only on the video area
            if (e.target.closest('button') || e.target.closest('a')) return;
            startY.current = e.touches[0].clientY;
            startTime.current = Date.now();
            liveDy.current = 0;
            isDragging.current = true;
        };

        const handleMove = (e) => {
            if (!isDragging.current || isAnimating.current) return;
            e.preventDefault(); // ← this actually works here (passive:false)

            const dy = e.touches[0].clientY - startY.current;
            liveDy.current = dy;

            const idx = currentIdxRef.current;
            const vids = videosRef.current;

            let drag = dy;
            if ((idx === 0 && dy > 0) || (idx === vids.length - 1 && dy < 0)) {
                drag = dy * 0.15;
            }

            if (containerRef.current) {
                containerRef.current.style.transition = 'none';
                containerRef.current.style.transform =
                    `translateY(calc(-${idx * 100}% + ${drag}px))`;
            }
        };

        const handleEnd = () => {
            if (!isDragging.current) return;
            isDragging.current = false;

            const dy = liveDy.current;
            const elapsed = Math.max(Date.now() - startTime.current, 1);
            const velocity = Math.abs(dy) / elapsed;

            const idx = currentIdxRef.current;
            const vids = videosRef.current;
            const DIST = window.innerHeight * 0.18;
            const VEL  = 0.3;

            let targetIdx = idx;
            if ((dy < -DIST || (velocity > VEL && dy < -25)) && idx < vids.length - 1) {
                targetIdx = idx + 1;
            } else if ((dy > DIST || (velocity > VEL && dy > 25)) && idx > 0) {
                targetIdx = idx - 1;
            }

            liveDy.current = 0;
            isAnimating.current = true;
            applyTransform(targetIdx, true);

            setTimeout(() => {
                setCurrentIdx(targetIdx);
                isAnimating.current = false;
            }, 360);
        };

        el.addEventListener('touchstart', handleStart, { passive: true });  // start is always passive
        el.addEventListener('touchmove',  handleMove,  { passive: false }); // move MUST be non-passive
        el.addEventListener('touchend',   handleEnd,   { passive: true });

        return () => {
            el.removeEventListener('touchstart', handleStart);
            el.removeEventListener('touchmove',  handleMove);
            el.removeEventListener('touchend',   handleEnd);
        };
    }, [applyTransform]); // applyTransform is stable (useCallback [])

    /* ── Fetch videos & restore position ── */
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/videos?limit=50');
                const vids = data.data || [];
                setVideos(vids);

                // Restore last viewed position (so back → re-enter doesn't restart)
                const saved = parseInt(sessionStorage.getItem('reels_idx') || '0', 10);

                // If navigated from a specific worker profile
                const stateVidId = window.history.state?.usr?.videoId;
                if (stateVidId) {
                    const idx = vids.findIndex(v => v.videoId === stateVidId);
                    if (idx !== -1) {
                        setCurrentIdx(idx);
                        return;
                    }
                }

                const startIdx = Math.min(Math.max(saved, 0), vids.length - 1);
                setCurrentIdx(startIdx);

                // Show swipe guide first time
                const hasSeenGuide = localStorage.getItem('reels_guide_seen');
                if (!hasSeenGuide) {
                    setShowGuide(true);
                    setTimeout(() => setShowGuide(false), 4500);
                    localStorage.setItem('reels_guide_seen', 'true');
                }

                // Always show unmute hint on first open (videos are muted on iPhone)
                const hasSeenMuteHint = sessionStorage.getItem('reels_mute_hint_seen');
                if (!hasSeenMuteHint) {
                    setShowUnmuteHint(true);
                    setTimeout(() => setShowUnmuteHint(false), 5000);
                    sessionStorage.setItem('reels_mute_hint_seen', 'true');
                }
            } catch {
                setError('Failed to load videos. Please try again.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* ─────────────────────────────────────────────────────────────────────
     * Navigate to a specific index with animation guard
     * ───────────────────────────────────────────────────────────────────── */
    const goTo = useCallback((newIdx) => {
        if (isAnimating.current) return;
        const vids = videosRef.current;
        if (!vids.length) return;
        const clamped = Math.max(0, Math.min(newIdx, vids.length - 1));
        if (clamped === currentIdxRef.current) {
            // Snap back to current if at boundary
            applyTransform(clamped, true);
            return;
        }

        isAnimating.current = true;
        applyTransform(clamped, true);

        setTimeout(() => {
            setCurrentIdx(clamped);
            isAnimating.current = false;
        }, 360);
    }, [applyTransform]);

    const goNext = useCallback(() => goTo(currentIdxRef.current + 1), [goTo]);
    const goPrev = useCallback(() => goTo(currentIdxRef.current - 1), [goTo]);

    /* ─────────────────────────────────────────────────────────────────────
     * React synthetic touch handlers — kept as fallback for elements
     * (gradient, swipe strip) that are outside the viewport's native
     * listener zone. Primary swipe is handled by the native useEffect above.
     * ───────────────────────────────────────────────────────────────────── */
    const onTouchStart = useCallback((e) => {
        if (isAnimating.current) return;
        if (e.target.closest('button') || e.target.closest('a')) return;
        startY.current = e.touches[0].clientY;
        startTime.current = Date.now();
        liveDy.current = 0;
        isDragging.current = true;
    }, []);

    const onTouchMove = useCallback((e) => {
        if (!isDragging.current || isAnimating.current) return;
        // Note: cannot call e.preventDefault() here reliably (passive)
        const dy = e.touches[0].clientY - startY.current;
        liveDy.current = dy;
        const idx = currentIdxRef.current;
        const vids = videosRef.current;
        let drag = dy;
        if ((idx === 0 && dy > 0) || (idx === vids.length - 1 && dy < 0)) drag = dy * 0.15;
        if (containerRef.current) {
            containerRef.current.style.transition = 'none';
            containerRef.current.style.transform = `translateY(calc(-${idx * 100}% + ${drag}px))`;
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        const dy = liveDy.current;
        const elapsed = Math.max(Date.now() - startTime.current, 1);
        const velocity = Math.abs(dy) / elapsed;
        const idx = currentIdxRef.current;
        const vids = videosRef.current;
        const DIST = window.innerHeight * 0.18;
        const VEL  = 0.3;
        let targetIdx = idx;
        if ((dy < -DIST || (velocity > VEL && dy < -25)) && idx < vids.length - 1) targetIdx = idx + 1;
        else if ((dy > DIST || (velocity > VEL && dy > 25)) && idx > 0) targetIdx = idx - 1;
        liveDy.current = 0;
        isAnimating.current = true;
        applyTransform(targetIdx, true);
        setTimeout(() => { setCurrentIdx(targetIdx); isAnimating.current = false; }, 360);
    }, [applyTransform]);

    /* ─────────────────────────────────────────────────────────────────────
     * MOUSE DRAG HANDLERS (desktop)
     * ───────────────────────────────────────────────────────────────────── */
    const onMouseDown = useCallback((e) => {
        if (isAnimating.current) return;
        startY.current = e.clientY;
        startTime.current = Date.now();
        liveDy.current = 0;
        isDragging.current = true;
    }, []);

    const onMouseMove = useCallback((e) => {
        if (!isDragging.current || isAnimating.current) return;
        const dy = e.clientY - startY.current;
        liveDy.current = dy;

        const idx = currentIdxRef.current;
        const vids = videosRef.current;
        let drag = dy;
        if ((idx === 0 && dy > 0) || (idx === vids.length - 1 && dy < 0)) {
            drag = dy * 0.15;
        }

        if (containerRef.current) {
            containerRef.current.style.transition = 'none';
            containerRef.current.style.transform =
                `translateY(calc(-${idx * 100}% + ${drag}px))`;
        }
    }, []);

    const onMouseUp = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;

        const dy = liveDy.current;
        const elapsed = Math.max(Date.now() - startTime.current, 1);
        const velocity = Math.abs(dy) / elapsed;

        const idx = currentIdxRef.current;
        const vids = videosRef.current;
        const DIST = window.innerHeight * 0.18;
        const VEL = 0.3;

        let targetIdx = idx;
        if ((dy < -DIST || (velocity > VEL && dy < -25)) && idx < vids.length - 1) {
            targetIdx = idx + 1;
        } else if ((dy > DIST || (velocity > VEL && dy > 25)) && idx > 0) {
            targetIdx = idx - 1;
        }

        liveDy.current = 0;
        isAnimating.current = true;
        applyTransform(targetIdx, true);

        setTimeout(() => {
            setCurrentIdx(targetIdx);
            isAnimating.current = false;
        }, 360);
    }, [applyTransform]);

    /* ── Keyboard navigation + browser/hardware back button ── */
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
            if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
            if (e.key === 'Escape')  navigate('/', { replace: true });
        };
        window.addEventListener('keydown', handleKey);

        // ── Hardware/browser back button → always go to homepage ──
        // Push a dummy entry on mount so pressing back doesn't leave the SPA.
        // When the popstate fires (back pressed), we intercept and go home.
        window.history.pushState({ reelsPage: true }, '');
        const handlePopState = () => {
            navigate('/', { replace: true });
        };
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [goNext, goPrev, navigate]);

    /* ─────────────────────────────────────────────────────────────────────
     * BOOKING HANDLERS
     * ───────────────────────────────────────────────────────────────────── */
    const handleBook = () => {
        if (!user) { navigate('/login'); return; }
        setShowConfirm(true);
    };

    const confirmBook = async () => {
        const vid = videos[currentIdx];
        if (!vid) return;
        setShowConfirm(false);
        setBooking(true);
        try {
            await api.post('/booking', {
                providerId: vid.uploaderId,
                providerType: vid.uploaderType === 'labour' ? 'labour' : 'car',
            });
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate('/dashboard', { state: { openTab: 'bookings' } });
            }, 2000);
        } catch (err) {
            alert(err.response?.data?.message || 'Booking failed. Please try again.');
        } finally {
            setBooking(false);
        }
    };

    /* ── Guard states ── */
    if (loading) return (
        <div style={S.center}>
            <div className="spinner" />
            <p style={{ color: '#94A3B8', marginTop: '12px', fontSize: '14px' }}>Loading videos…</p>
        </div>
    );

    if (!loading && videos.length === 0) return (
        <div style={S.center}>
            <span style={{ fontSize: '48px' }}>🎬</span>
            <p style={{ color: '#94A3B8', marginTop: '12px', fontSize: '14px' }}>No videos yet. Check back soon!</p>
        </div>
    );

    if (error) return (
        <div style={S.center}>
            <span style={{ fontSize: '48px' }}>⚠️</span>
            <p style={{ color: '#F87171', marginTop: '12px', fontSize: '14px' }}>{error}</p>
        </div>
    );

    const vid     = videos[currentIdx];
    const profile = vid?.profile || {};
    const owner   = vid?.userId  || {};

    return (
        <>
            {/* ── 2-sec booking success overlay ── */}
            {showSuccess && (
                <div style={S.successOverlay}>
                    <div style={S.successCard}>
                        <div style={{ fontSize: '54px' }}>✅</div>
                        <h2 style={{ color: '#fff', margin: '12px 0 6px', fontSize: '20px' }}>Booking Done!</h2>
                        <p style={{ color: '#94A3B8', fontSize: '13px' }}>Redirecting to My Bookings…</p>
                    </div>
                </div>
            )}

            {/* ── Booking confirmation bottom sheet ── */}
            {showConfirm && (
                <div style={S.confirmBackdrop} onClick={() => setShowConfirm(false)}>
                    <div style={S.confirmSheet} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', margin: '0 auto 20px' }} />
                        <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px', textAlign: 'center' }}>
                            Confirm Booking
                        </p>
                        <div style={S.confirmWorkerCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {owner.avatar
                                    ? <img src={owner.avatar} alt="" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF6600' }} />
                                    : <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#1A365D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '20px', border: '2px solid #FF6600', flexShrink: 0 }}>
                                        {owner.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                }
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: '#fff', fontWeight: '800', fontSize: '17px', margin: '0 0 3px' }}>{owner.name}</p>
                                    <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
                                        {vid.uploaderType === 'labour' ? '👷 Worker' : '🚗 Car Owner'}
                                        {profile.city ? ` · 📍 ${profile.city}` : ''}
                                    </p>
                                </div>
                                {profile.charges && (
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ color: '#4ADE80', fontWeight: '900', fontSize: '20px', margin: 0 }}>₹{profile.charges}</p>
                                        <p style={{ color: '#94A3B8', fontSize: '11px', margin: 0 }}>charges</p>
                                    </div>
                                )}
                            </div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '14px 0' }} />
                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ color: '#FBBF24', fontSize: '16px', margin: '0 0 2px', letterSpacing: '2px' }}>
                                        {'★'.repeat(Math.floor(profile.rating || 0))}{'☆'.repeat(5 - Math.floor(profile.rating || 0))}
                                    </p>
                                    <p style={{ color: '#94A3B8', fontSize: '11px', margin: 0 }}>{(profile.rating || 0).toFixed(1)} / 5 rating</p>
                                </div>
                                {profile.skills?.length > 0 && (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: '#A5B4FC', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>
                                            {profile.skills.slice(0, 2).join(', ')}
                                        </p>
                                        <p style={{ color: '#94A3B8', fontSize: '11px', margin: 0 }}>skills</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p style={{ color: '#64748B', fontSize: '12px', textAlign: 'center', margin: '12px 0 20px', lineHeight: 1.5 }}>
                            By confirming, a booking request will be sent to this worker. They will contact you shortly.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBook}
                                disabled={booking}
                                style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', background: '#FF6600', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,102,0,0.5)' }}
                            >
                                {booking ? '⏳ Booking…' : '✅ Yes, Book Now!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                MAIN VIEWPORT
                ════════════════════════════════════════════════════════════ */}
            <div
                ref={viewportRef}
                style={S.page}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            >

                {/* ── TOP BAR: Back button + counter ── */}
                <div style={S.topBar}>
                    <button
                        id="reels-back-btn"
                        style={S.backBtn}
                        onClick={() => {
                            // Force-clear any pending animation lock so the
                            // first tap ALWAYS works — even mid-swipe animation.
                            isAnimating.current = false;
                            isDragging.current  = false;
                            navigate('/', { replace: true }); // always go home
                        }}
                        aria-label="Go back to website"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
                        </svg>
                    </button>

                    <div style={S.counterPill}>
                        {currentIdx + 1} / {videos.length}
                    </div>

                    <div style={{ width: '44px' }} /> {/* spacer for centering counter */}
                </div>

                {/* ── RIGHT SIDE: Nav buttons ── */}
                <div style={S.navButtonGroup}>
                    <button
                        id="reels-prev-btn"
                        style={{
                            ...S.navBtn,
                            opacity: currentIdx === 0 ? 0.25 : 1,
                            cursor: currentIdx === 0 ? 'default' : 'pointer',
                        }}
                        onClick={goPrev}
                        aria-label="Previous video"
                        disabled={currentIdx === 0}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    </button>

                    <button
                        id="reels-next-btn"
                        style={{
                            ...S.navBtn,
                            opacity: currentIdx === videos.length - 1 ? 0.25 : 1,
                            cursor: currentIdx === videos.length - 1 ? 'default' : 'pointer',
                        }}
                        onClick={goNext}
                        aria-label="Next video"
                        disabled={currentIdx === videos.length - 1}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                </div>

                {/* ── LEFT EDGE swipe-capture strip (doesn't block YouTube controls) ── */}
                <div
                    style={S.swipeStrip}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onMouseDown={onMouseDown}
                    aria-hidden="true"
                />

                {/* ── SLIDE CONTAINER ── */}
                <div ref={containerRef} style={S.slideContainer}>
                    {videos.map((v, index) => {
                        const isAdjacent = Math.abs(index - currentIdx) <= 1;
                        const p = v.profile || {};
                        const o = v.userId  || {};

                        // Placeholder for far-away slides (performance)
                        if (!isAdjacent && videos.length > 3) {
                            return (
                                <div
                                    key={v._id || v.videoId}
                                    style={{ height: '100dvh', background: '#000', flexShrink: 0 }}
                                />
                            );
                        }

                        return (
                            <div key={v._id || v.videoId} style={S.reelSlide}>

                                {/* ── VIDEO ── */}
                                {IS_SECURE ? (
                                    <iframe
                                        src={isAdjacent ? embedUrl(v.videoId, index !== currentIdx) : ''}
                                        title={v.title || 'Worker reel'}
                                        style={S.iframe}
                                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; playsinline; accelerometer; gyroscope"
                                        allowFullScreen
                                        loading="lazy"
                                    />
                                ) : (
                                    <>
                                        <img
                                            src={thumbUrl(v.videoId)}
                                            alt={v.title || 'Video thumbnail'}
                                            style={S.thumbBg}
                                            onError={(e) => {
                                                if (!e.target.src.includes('hqdefault'))
                                                    e.target.src = `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;
                                            }}
                                        />
                                        <a href={shortsUrl(v.videoId)} target="_blank" rel="noopener noreferrer" style={S.playBtn}>
                                            <svg viewBox="0 0 68 48" width="60" height="43">
                                                <path d="M66.5 7.7c-.8-2.9-3-5.2-5.9-6C55.8 0 34 0 34 0S12.2 0 7.4 1.6c-2.9.8-5.1 3.1-5.9 6C0 12.5 0 24 0 24s0 11.5 1.5 16.3c.8 2.9 3 5.2 5.9 6C12.2 48 34 48 34 48s21.8 0 26.6-1.6c2.9-.8 5.1-3.1 5.9-6C68 35.5 68 24 68 24s0-11.5-1.5-16.3z" fill="#ff0000"/>
                                                <path d="M45 24 27 14v20" fill="#fff"/>
                                            </svg>
                                        </a>
                                    </>
                                )}

                                {/* ── Bottom gradient overlay ── */}
                                <div
                                    style={S.gradient}
                                    onTouchStart={onTouchStart}
                                    onTouchMove={onTouchMove}
                                    onTouchEnd={onTouchEnd}
                                    onMouseDown={onMouseDown}
                                />

                                {/* ── INFO CARD (always on top, always clickable) ── */}
                                <div style={S.card}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        {o.avatar
                                            ? <img src={o.avatar} alt={o.name} style={S.avatar} />
                                            : <div style={S.avatarFallback}>{o.name?.[0]?.toUpperCase() || '?'}</div>
                                        }
                                        <div
                                            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                                            onClick={() => navigate(`/profile/${v.uploaderType === 'labour' ? 'labour' : 'car'}/${v.uploaderId}`)}
                                        >
                                            <p style={S.name}>{o.name || 'Worker'} <span style={{ fontSize: '10px', opacity: 0.7 }}>›</span></p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                                                <span style={S.typePill}>{v.uploaderType === 'labour' ? '👷 Worker' : '🚗 Car Owner'}</span>
                                                {p.city && <span style={S.cityTag}>📍 {p.city}</span>}
                                            </div>
                                        </div>
                                        {p.charges && (
                                            <div style={S.chargeBadge}>
                                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', fontWeight: '600' }}>from</span>
                                                <span style={{ fontSize: '20px', fontWeight: '900', color: '#4ADE80', lineHeight: 1 }}>₹{p.charges}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                        <div style={S.ratingBox}>
                                            <span style={{ color: '#FBBF24', fontSize: '15px', letterSpacing: '2px' }}>
                                                {'★'.repeat(Math.floor(p.rating || 0))}{'☆'.repeat(5 - Math.floor(p.rating || 0))}
                                            </span>
                                            <span style={{ color: '#FCD34D', fontWeight: '800', fontSize: '14px' }}>{(p.rating || 0).toFixed(1)}</span>
                                        </div>
                                        {p.experience && <span style={S.expTag}>🕐 {p.experience} yrs exp.</span>}
                                    </div>

                                    {v.uploaderType === 'labour' && p.skills?.length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                            {p.skills.slice(0, 4).map((s) => <span key={s} style={S.skill}>{s}</span>)}
                                        </div>
                                    )}

                                    {v.title && <p style={S.caption}>💬 {v.title}</p>}

                                    <button onClick={handleBook} disabled={booking} style={S.bookBtn}>
                                        {booking ? '⏳ Booking…' : '📅 Book Now'}
                                    </button>

                                    {!user && (
                                        <p style={S.loginHint}>
                                            <span style={{ color: '#FF8533', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/login')}>Login</span>
                                            {' '}or{' '}
                                            <span style={{ color: '#FF8533', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/register')}>Register</span>
                                            {' '}to book
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Unmute hint badge (top-centre, auto-dismisses after 5 s) ── */}
                {showUnmuteHint && (
                    <div
                        style={S.unmuteHint}
                        onClick={() => setShowUnmuteHint(false)}
                        role="status"
                        aria-live="polite"
                    >
                        <span style={{ fontSize: '18px' }}>🔊</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.3 }}>
                            Video is muted<br />
                            <span style={{ fontWeight: '400', opacity: 0.8, fontSize: '12px' }}>Tap video controls to unmute</span>
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowUnmuteHint(false); }}
                            style={S.unmuteClose}
                            aria-label="Dismiss"
                        >✕</button>
                    </div>
                )}

                {/* ── First-time swipe guide ── */}
                {showGuide && (
                    <div style={S.guideOverlay} onClick={() => setShowGuide(false)}>
                        <div style={S.guideBox}>
                            <div style={S.guideHand}>👆</div>
                            <p style={S.guideTitle}>Swipe to Browse</p>
                            <p style={S.guideSub}>Swipe <strong>up</strong> for next · <strong>down</strong> for previous</p>
                            <p style={S.guideSub} className="reels-guide-or">Or use the <strong>▲ ▼</strong> buttons on the right</p>
                            <div style={S.guideDismiss}>Tap to dismiss</div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════════════════ */
const S = {

    /* ── Viewport ── */
    page: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100%',
        height: '100dvh',
        background: '#000',
        overflow: 'hidden',
        zIndex: 500,
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
    },

    /* ── Slide container (transform applied via ref) ── */
    slideContainer: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        willChange: 'transform',
    },
    reelSlide: {
        position: 'relative',
        width: '100%',
        height: '100dvh',
        flexShrink: 0,
        overflow: 'hidden',
    },

    /* ── Video / thumbnail ── */
    iframe: {
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        border: 'none',
    },
    thumbBg: {
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        objectFit: 'cover',
        filter: 'brightness(0.7)',
    },
    playBtn: {
        position: 'absolute', top: '42%', left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        zIndex: 6, textDecoration: 'none',
        filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.7))',
    },

    /* ── Left swipe strip (40 px wide, full height, transparent) ── */
    swipeStrip: {
        position: 'absolute',
        top: 0, left: 0,
        width: '44px',
        height: '100%',
        zIndex: 30,
        background: 'transparent',
        cursor: 'ns-resize',
        touchAction: 'none',
    },

    /* ── Gradient overlay (also used as secondary swipe zone) ── */
    gradient: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '65%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.3) 58%, transparent 100%)',
        pointerEvents: 'auto',  // ← catches swipes on gradient area
        zIndex: 5,
        touchAction: 'none',
    },

    /* ── TOP BAR ── */
    topBar: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        pointerEvents: 'none', // bar itself doesn't block swipes
    },
    backBtn: {
        pointerEvents: 'auto',
        width: '44px', height: '44px',
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        transition: 'background 0.2s, transform 0.15s',
    },
    counterPill: {
        pointerEvents: 'none',
        color: 'rgba(255,255,255,0.85)',
        fontSize: '13px',
        fontWeight: '700',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: '5px 14px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.15)',
        letterSpacing: '0.5px',
    },

    /* ── RIGHT SIDE nav buttons ── */
    navButtonGroup: {
        position: 'absolute',
        right: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    navBtn: {
        width: '46px', height: '46px',
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1.5px solid rgba(255,255,255,0.25)',
        color: '#fff',
        fontSize: '18px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'background 0.2s, transform 0.15s, opacity 0.2s',
        touchAction: 'manipulation', // prevent double-tap zoom on button
    },

    /* ── INFO CARD ── */
    card: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '0 16px 28px',
        zIndex: 20,
        background: 'transparent',
        pointerEvents: 'auto',
    },
    avatar: {
        width: '42px', height: '42px',
        borderRadius: '50%', objectFit: 'cover',
        border: '2px solid #FF6600', flexShrink: 0,
    },
    avatarFallback: {
        width: '42px', height: '42px', borderRadius: '50%',
        background: '#1A365D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: '800', fontSize: '16px',
        border: '2px solid #FF6600', flexShrink: 0,
    },
    name: {
        color: '#FFFFFF', fontWeight: '800', fontSize: '17px', margin: 0,
        lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textShadow: '0 1px 6px rgba(0,0,0,0.7)',
    },
    typePill: {
        background: 'rgba(255,255,255,0.18)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#FFFFFF', padding: '3px 9px', borderRadius: '20px',
        fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap',
        backdropFilter: 'blur(4px)',
    },
    cityTag: {
        color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600',
        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
    },
    chargeBadge: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0,
    },
    ratingBox: { display: 'flex', alignItems: 'center', gap: '4px' },
    expTag: { color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '600' },
    skill: {
        background: 'linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(124,58,237,0.3) 100%)',
        border: '1px solid rgba(255,255,255,0.4)',
        color: '#FFFFFF', padding: '5px 12px', borderRadius: '12px',
        fontSize: '11px', fontWeight: '800',
        backdropFilter: 'blur(10px)',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    },
    caption: {
        color: 'rgba(255,255,255,0.88)', fontSize: '13px',
        margin: '0 0 12px', lineHeight: 1.4,
        borderLeft: '3px solid rgba(255,255,255,0.4)',
        paddingLeft: '10px',
        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
    },
    bookBtn: {
        width: '100%', padding: '13px',
        background: '#FF6600',
        color: '#fff', border: 'none', borderRadius: '14px',
        fontSize: '15px', fontWeight: '700', cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(255,102,0,0.5)',
        transition: 'opacity .2s', marginBottom: '8px',
        touchAction: 'manipulation',
    },
    loginHint: { color: '#94A3B8', fontSize: '12px', textAlign: 'center', margin: 0 },

    /* ── Guide overlay ── */
    guideOverlay: {
        position: 'absolute', inset: 0, zIndex: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'reelsGuideFade 4.5s forwards',
    },
    guideBox: {
        textAlign: 'center',
        padding: '32px 40px',
        background: 'rgba(15,15,26,0.85)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        maxWidth: '280px',
    },
    guideHand: {
        fontSize: '52px',
        animation: 'reelsHandSwipe 1.4s ease-in-out infinite',
        display: 'block', marginBottom: '12px',
        filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))',
    },
    guideTitle: {
        color: '#fff', fontSize: '20px', fontWeight: '800', margin: '0 0 8px',
    },
    guideSub: {
        color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '4px 0', lineHeight: 1.5,
    },
    guideDismiss: {
        marginTop: '16px', color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: '1px',
    },

    /* ── Loading / error center ── */
    center: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100dvh', background: '#0F0F1A',
    },

    /* ── Success overlay ── */
    successOverlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(6px)',
    },
    successCard: {
        background: '#1A365D', borderRadius: '24px', padding: '36px 40px',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(26,54,93,0.6)',
    },

    /* ── Booking confirmation sheet ── */
    confirmBackdrop: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 9998,
    },
    confirmSheet: {
        background: 'linear-gradient(180deg, #1A1A2E 0%, #0F0F1A 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '28px 28px 0 0',
        padding: '16px 20px 36px',
        width: '100%', maxWidth: '480px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
    },
    confirmWorkerCard: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', padding: '16px', marginBottom: '4px',
    },

    /* ── Unmute hint badge ── */
    unmuteHint: {
        position: 'absolute',
        bottom: '140px',          // sits above the Book Now button
        left: '16px',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: '14px',
        padding: '10px 14px',
        color: '#fff',
        cursor: 'pointer',
        maxWidth: '220px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        animation: 'reelsMuteSlideIn 0.4s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
        pointerEvents: 'auto',
    },
    unmuteClose: {
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        borderRadius: '50%',
        width: '22px', height: '22px',
        color: '#fff',
        fontSize: '12px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        marginLeft: 'auto',
        lineHeight: 1,
        touchAction: 'manipulation',
    },
};
