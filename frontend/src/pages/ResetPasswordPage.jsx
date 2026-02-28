import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setError(t('passwordsNotMatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password: form.password });
      setSuccess(true);
      toast.success(t('resetSuccess'));
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="app-header">
        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <div style={{ fontSize: '20px', fontWeight: '800' }}>⚡ KroEasy</div>
        </Link>
      </div>

      <div style={{ flex: 1, padding: '32px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🔑</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>{t('resetPassword')}</h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Enter your new password below</p>
        </div>

        {success ? (
          <div style={{
            background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '12px',
            padding: '20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <p style={{ fontWeight: '700', color: '#16A34A', fontSize: '15px' }}>{t('resetSuccess')}</p>
            <p style={{ color: '#64748B', fontSize: '13px', marginTop: '6px' }}>Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                🔒 {t('enterNewPassword')}
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                🔒 {t('confirmPassword')}
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="Re-enter new password"
                value={form.confirm}
                onChange={e => { setForm({ ...form, confirm: e.target.value }); setError(''); }}
              />
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '10px',
                padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>❌</span>
                <div style={{ fontSize: '13px', color: '#DC2626' }}>{error}</div>
              </div>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? '⏳ Resetting...' : t('resetBtn')}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
              <Link to="/login" style={{ color: '#1E3A8A', fontWeight: '700', textDecoration: 'none' }}>
                {t('backToLogin')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
