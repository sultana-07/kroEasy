import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

const roles = [
  { value: 'user', label: '👤 Customer', desc: 'Hire services or book cars' },
  { value: 'labour', label: '🔧 Service Provider', desc: 'Offer your skills & get hired' },
  { value: 'carowner', label: '🚗 Car Owner', desc: 'List your car for booking' },
];

const skillOptions = ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'Mason', 'Welder', 'Driver', 'Cleaner', 'Cook', 'Security Guard', 'Gardener', 'AC Technician'];

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState(searchParams.get('role') || 'user');
  const [form, setForm] = useState({ name: '', phone: '', password: '', city: '', skills: [], experience: '', charges: '', description: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const toggleSkill = (skill) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password || !form.city) return toast.error('Please fill all required fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (selectedRole === 'labour' && form.skills.length === 0) return toast.error('Please select at least one skill');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, role: selectedRole });
      login(data);
      toast.success(`Welcome to KroEasy, ${data.name}! 🎉`);
      const paths = { user: '/dashboard', labour: '/labour-dashboard', carowner: '/carowner-dashboard' };
      navigate(paths[data.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '32px' }}>
      <div className="app-header">
        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <div style={{ fontSize: '20px', fontWeight: '800' }}>⚡ KroEasy</div>
        </Link>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Create Account</h1>
        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>Join KroEasy for free</p>

        {/* Role Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '10px' }}>I am a...</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roles.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRole(r.value)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${selectedRole === r.value ? '#1E3A8A' : '#E2E8F0'}`,
                  background: selectedRole === r.value ? '#EFF6FF' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: selectedRole === r.value ? '#1E3A8A' : '#0F172A' }}>{r.label}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{r.desc}</div>
                </div>
                {selectedRole === r.value && <div style={{ marginLeft: 'auto', color: '#1E3A8A', fontSize: '18px' }}>✓</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>Full Name *</label>
            <input id="reg-name" className="input-field" placeholder="Your full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>Phone Number *</label>
            <input id="reg-phone" className="input-field" type="tel" placeholder="10-digit phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>Password *</label>
            <input id="reg-password" className="input-field" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>City *</label>
            <input id="reg-city" className="input-field" placeholder="Your city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>

          {/* Labour-specific fields */}
          {selectedRole === 'labour' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Skills * (select all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {skillOptions.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: `1.5px solid ${form.skills.includes(skill) ? '#1E3A8A' : '#E2E8F0'}`,
                        background: form.skills.includes(skill) ? '#1E3A8A' : 'white',
                        color: form.skills.includes(skill) ? 'white' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >{skill}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>Experience (years)</label>
                <input className="input-field" type="number" placeholder="0" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>About Yourself</label>
                <textarea className="input-field" rows={3} placeholder="Describe your experience..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'none' }} />
              </div>
            </>
          )}

          <button
            id="reg-submit"
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '⏳ Creating Account...' : '🎉 Create Account Free'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#64748B' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1E3A8A', fontWeight: '700', textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
