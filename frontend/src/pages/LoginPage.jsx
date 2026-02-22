import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
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
      toast.success(`Welcome back, ${data.name}! 👋`);
      const paths = { user: '/dashboard', labour: '/labour-dashboard', carowner: '/carowner-dashboard', admin: '/admin' };
      navigate(paths[data.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your phone number and password.');
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
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>👋</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>Welcome Back!</h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Login to access your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              📱 Phone Number
            </label>
            <input
              id="login-phone"
              className="input-field"
              type="tel"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={e => { setForm({ ...form, phone: e.target.value }); setError(''); }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              🔒 Password
            </label>
            <input
              id="login-password"
              className="input-field"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
            />
          </div>

          {/* Inline error message */}
          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1.5px solid #FECACA',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
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
            {loading ? '⏳ Logging in...' : '🚀 Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748B' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#1E3A8A', fontWeight: '700', textDecoration: 'none' }}>Register Free</Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#94A3B8' }}>
          Make sure your phone number is registered before logging in.
        </p>
      </div>
    </div>
  );
}
