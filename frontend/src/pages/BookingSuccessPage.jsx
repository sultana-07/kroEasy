import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function BookingSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const providerName = location.state?.providerName || '';

  // If user navigates directly without booking, redirect home after 5s
  useEffect(() => {
    if (!location.state?.fromBooking) {
      const timer = setTimeout(() => navigate('/'), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #14532d 0%, #16a34a 50%, #22c55e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
    }}>

      {/* Animated checkmark circle */}
      <div style={{
        width: '120px',
        height: '120px',
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '28px',
        animation: 'bounceIn 0.6s ease-out',
        border: '4px solid rgba(255,255,255,0.4)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
      }}>
        <svg viewBox="0 0 52 52" style={{ width: '64px', height: '64px' }}>
          <circle cx="26" cy="26" r="25" fill="none" stroke="white" strokeWidth="2" />
          <path
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 27l8 8 16-16"
            style={{ animation: 'drawCheck 0.5s 0.4s ease-out both' }}
          />
        </svg>
      </div>

      {/* Main text */}
      <h1 style={{
        fontSize: '32px',
        fontWeight: '900',
        color: 'white',
        marginBottom: '12px',
        textShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        {t('requestSent')}
      </h1>

      {providerName && (
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: '8px' }}>
          {providerName}
        </p>
      )}

      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginBottom: '6px', lineHeight: '1.6' }}>
        {t('successMsg1')}
      </p>
      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginBottom: '32px', lineHeight: '1.6' }}>
        {t('successMsg2')}
      </p>

      {/* Bookings hint box */}
      <div style={{
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '18px 24px',
        marginBottom: '28px',
        maxWidth: '340px',
        border: '1px solid rgba(255,255,255,0.3)',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
        <p style={{ fontSize: '14px', color: 'white', lineHeight: '1.7' }}>
          {t('checkStatusIn')}{' '}
          <span style={{ fontWeight: '800', textDecoration: 'underline' }}>
            {t('myBookingSection')}
          </span>{' '}
          {t('section')}
        </p>
      </div>

      {/* Action buttons */}
      <button
        onClick={() => navigate('/dashboard', { state: { openTab: 'bookings' } })}
        style={{
          width: '100%',
          maxWidth: '300px',
          padding: '16px',
          borderRadius: '14px',
          background: 'white',
          color: '#16a34a',
          border: 'none',
          fontSize: '16px',
          fontWeight: '800',
          cursor: 'pointer',
          marginBottom: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        {t('goToBookings')} →
      </button>

      <button
        onClick={() => navigate('/')}
        style={{
          width: '100%',
          maxWidth: '300px',
          padding: '14px',
          borderRadius: '14px',
          background: 'rgba(255,255,255,0.15)',
          color: 'white',
          border: '2px solid rgba(255,255,255,0.4)',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        {t('goHome')}
      </button>

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes drawCheck {
          0% { stroke-dasharray: 0 60; }
          100% { stroke-dasharray: 60 0; }
        }
      `}</style>
    </div>
  );
}
