import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api';
import toast from 'react-hot-toast';

const skillOptions = [
  'Electrician', 'Plumber', 'Carpenter', 'Mason',
  'Beautician', 'AC Technician', 'Mehndi Artist', 'Helper',
];

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState(searchParams.get('role') || 'user');
  const [form, setForm] = useState({ name: '', phone: '', password: '', city: '', skills: [], experience: '', charges: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const roles = [
    { value: 'user', label: t('roleCustomerLabel'), desc: t('roleCustomerDesc') },
    { value: 'labour', label: t('roleWorkerLabel'), desc: t('roleWorkerDesc') },
    { value: 'carowner', label: t('roleCarOwnerLabel'), desc: t('roleCarOwnerDesc') },
  ];

  const toggleSkill = (skill) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.phone || !form.password || !form.city) {
      setError(t('errorFillAll'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('errorPassword6'));
      return;
    }
    if (selectedRole === 'labour' && form.skills.length === 0 && !customSkill.trim()) {
      setError(t('errorSelectSkill'));
      return;
    }

    setLoading(true);
    const finalSkills = customSkill.trim()
      ? [...form.skills, customSkill.trim()]
      : form.skills;

    try {
      const { data } = await api.post('/auth/register', { ...form, skills: finalSkills, role: selectedRole });
      login(data);
      toast.success(`KroEasy पर स्वागत है, ${data.name}! 🎉`);
      const paths = { user: '/dashboard', labour: '/labour-dashboard', carowner: '/carowner-dashboard' };
      navigate(paths[data.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'रजिस्ट्रेशन विफल। कृपया दोबारा प्रयास करें।');
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
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>{t('registerTitle')}</h1>
        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>{t('registerSub')}</p>

        {/* Role Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '10px' }}>{t('iAmA')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roles.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => { setSelectedRole(r.value); setError(''); }}
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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('fullName')}</label>
            <input id="reg-name" className="input-field" placeholder={t('fullNamePlaceholder')} value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('phoneNumberReq')}</label>
            <input id="reg-phone" className="input-field" type="tel" placeholder={t('phonePlaceholder')} value={form.phone} onChange={e => { setForm({ ...form, phone: e.target.value }); setError(''); }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('passwordReq')}</label>
            <input id="reg-password" className="input-field" type="password" placeholder={t('passwordPlaceholder')} value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('cityReq')}</label>
            <input id="reg-city" className="input-field" placeholder={t('cityPlaceholder')} value={form.city} onChange={e => { setForm({ ...form, city: e.target.value }); setError(''); }} />
          </div>

          {/* Labour-specific fields */}
          {selectedRole === 'labour' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{t('skillsLabel')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {skillOptions.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
                        border: `1.5px solid ${form.skills.includes(skill) ? '#1E3A8A' : '#E2E8F0'}`,
                        background: form.skills.includes(skill) ? '#1E3A8A' : 'white',
                        color: form.skills.includes(skill) ? 'white' : '#374151',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >{skill}</button>
                  ))}
                  {/* Other — custom skill pill */}
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(v => !v)}
                    style={{
                      padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
                      border: `1.5px solid ${showCustomInput ? '#F97316' : '#E2E8F0'}`,
                      background: showCustomInput ? '#FFF7ED' : 'white',
                      color: showCustomInput ? '#EA580C' : '#374151',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{t('otherCustom')}</button>
                </div>
                {showCustomInput && (
                  <div style={{ marginTop: '10px' }}>
                    <input
                      className="input-field"
                      placeholder={t('customSkillPlaceholder')}
                      value={customSkill}
                      onChange={e => setCustomSkill(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    />
                    {customSkill.trim() && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#16A34A', fontWeight: '600' }}>
                        {t('customSkillAdded')} "{customSkill.trim()}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('experienceYears')}</label>
                <input className="input-field" type="number" placeholder="0" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('aboutYourself')}</label>
                <textarea className="input-field" rows={3} placeholder={t('descPlaceholder')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'none' }} />
              </div>
            </>
          )}

          {/* Inline error */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1.5px solid #FECACA',
              borderRadius: '10px', padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>❌</span>
              <div style={{ fontSize: '13px', color: '#DC2626', lineHeight: '1.5' }}>{error}</div>
            </div>
          )}

          <button
            id="reg-submit"
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t('creatingAccount') : t('createAccountFree')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#94A3B8', lineHeight: '1.6' }}>
          {t('createAccountText')} {t('youAgree')}{' '}
          <Link to="/terms" style={{ color: '#1E3A8A', fontWeight: '600', textDecoration: 'underline' }}>{t('termsConditions')}</Link>
          {' '}{t('andText')}{' '}
          <Link to="/privacy" style={{ color: '#1E3A8A', fontWeight: '600', textDecoration: 'underline' }}>{t('privacyPolicy')}</Link>।
        </p>

        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', color: '#64748B' }}>
          {t('alreadyAccount')}{' '}
          <Link to="/login" style={{ color: '#1E3A8A', fontWeight: '700', textDecoration: 'none' }}>{t('loginLink')}</Link>
        </p>
      </div>
    </div>
  );
}
