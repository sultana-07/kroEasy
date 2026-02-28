import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { login } = useAuth();
  const { t, lang, switchLang } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.phone || !form.password) {
      setError('Please fill in all fields to login.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      toast.success(`${t('welcomeBack').replace('!','')} ${data.name}! 👋`);
      const paths = { user: '/dashboard', labour: '/labour-dashboard', carowner: '/carowner-dashboard', admin: '/admin' };
      navigate(paths[data.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your phone number and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotPhone) { toast.error('Please enter your phone number'); return; }
    setForgotLoading(true);
    try {
      await api.post('/auth/request-reset', { phone: forgotPhone });
      setForgotSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <div style={{ fontSize: '20px', fontWeight: '800' }}>{t('appName')}</div>
        </Link>
        {/* Language toggle */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['en', 'hi'].map(l => (
            <button
              key={l}
              onClick={() => switchLang(l)}
              style={{
                padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                border: 'none', cursor: 'pointer',
                background: lang === l ? 'white' : 'rgba(255,255,255,0.2)',
                color: lang === l ? '#1E3A8A' : 'white',
              }}
            >
              {l === 'en' ? '🌐 EN' : '🇮🇳 HI'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '32px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>👋</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>{t('welcomeBack')}</h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>{t('loginToAccount')}</p>
        </div>

        {!showForgot ? (
          <>
            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  {t('phoneNumber')}
                </label>
                <input
                  id="login-phone"
                  className="input-field"
                  type="tel"
                  placeholder={t('enterPhone')}
                  value={form.phone}
                  onChange={e => { setForm({ ...form, phone: e.target.value }); setError(''); }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  {t('password')}
                </label>
                <input
                  id="login-password"
                  className="input-field"
                  type="password"
                  placeholder={t('enterPassword')}
                  value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                />
                {/* Forgot Password link */}
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  style={{
                    marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', color: '#1E3A8A', fontWeight: '600', padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {t('forgotPassword')}
                </button>
              </div>

              {/* Inline error message */}
              {error && (
                <div style={{
                  background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '10px',
                  padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px',
                }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>❌</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#B91C1C', marginBottom: '2px' }}>Login Failed</div>
                    <div style={{ fontSize: '13px', color: '#DC2626', lineHeight: '1.5' }}>{error}</div>
                  </div>
                </div>
              )}

              <button
                id="login-submit"
                className="btn-primary"
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? t('loggingIn') : t('loginBtn')}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: '#94A3B8', lineHeight: '1.6' }}>
              By logging in, you agree to our{' '}
              <Link to="/terms" style={{ color: '#1E3A8A', fontWeight: '600', textDecoration: 'underline' }}>Terms &amp; Conditions</Link>
              {' '}and{' '}
              <Link to="/privacy" style={{ color: '#1E3A8A', fontWeight: '600', textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>

            <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', color: '#64748B' }}>
              {t('dontHaveAccount')}{' '}
              <Link to="/register" style={{ color: '#1E3A8A', fontWeight: '700', textDecoration: 'none' }}>{t('registerFree')}</Link>
            </p>
          </>
        ) : (
          /* Forgot Password Panel */
          <div>
            <div style={{
              background: '#EFF6FF', borderRadius: '16px', padding: '20px',
              marginBottom: '20px', border: '1px solid #BFDBFE',
            }}>
              <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>🔒</div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1E3A8A', textAlign: 'center', marginBottom: '10px' }}>
                {t('forgotPasswordTitle')}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.7', textAlign: 'center' }}>
                {t('forgotPasswordInfo')}
              </p>
            </div>

            {!forgotSent ? (
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    {t('phoneNumber')}
                  </label>
                  <input
                    className="input-field"
                    type="tel"
                    placeholder={t('enterPhone')}
                    value={forgotPhone}
                    onChange={e => setForgotPhone(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={forgotLoading}
                  style={{ width: '100%', padding: '14px', fontSize: '15px', opacity: forgotLoading ? 0.7 : 1 }}
                >
                  {forgotLoading ? t('submitting') : t('submitRequest')}
                </button>
              </form>
            ) : (
              <div style={{
                background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '12px',
                padding: '20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
                <p style={{ fontWeight: '700', color: '#16A34A', fontSize: '14px', lineHeight: '1.7' }}>
                  {t('resetRequestSent')}
                </p>
              </div>
            )}

            <button
              onClick={() => { setShowForgot(false); setForgotSent(false); setForgotPhone(''); }}
              style={{
                marginTop: '16px', background: 'none', border: 'none',
                color: '#1E3A8A', fontWeight: '700', cursor: 'pointer',
                fontSize: '14px', textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'center',
              }}
            >
              {t('backToLogin')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
