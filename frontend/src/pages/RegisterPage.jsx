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
  const [serviceCities, setServiceCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const { login } = useAuth();
  const [locations, setLocations] = useState([]);
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  useState(() => {
    (async () => {
      try {
        const { data } = await api.get('/locations');
        setLocations(data);
      } catch (err) { console.error('Failed to fetch locations', err); }
    })();
  }, []);

  const roles = [
    { value: 'user', label: t('roleCustomerLabel'), desc: t('roleCustomerDesc') },
    { value: 'labour', label: t('roleWorkerLabel'), desc: t('roleWorkerDesc') },
    { value: 'carowner', label: t('roleCarOwnerLabel'), desc: t('roleCarOwnerDesc') },
  ];

  const toggleSkill = (skill) => {
    setForm(prev => {
      if (prev.skills.includes(skill)) {
        return { ...prev, skills: prev.skills.filter(s => s !== skill) };
      }
      if (prev.skills.length >= 3) {
        toast.error('Maximum 3 skills allowed. Deselect one to choose another.');
        return prev;
      }
      return { ...prev, skills: [...prev.skills, skill] };
    });
  };

  const toggleServiceCity = (cityEn) => {
    setServiceCities(prev => {
      if (prev.includes(cityEn)) return prev.filter(c => c !== cityEn);
      const updated = [...prev, cityEn];
      // Auto-set primary city to first selected
      if (!form.city) setForm(f => ({ ...f, city: cityEn }));
      return updated;
    });
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
    if (selectedRole === 'labour') {
      const totalSkills = form.skills.length + (customSkill.trim() ? 1 : 0);
      if (totalSkills > 3) {
        setError('Workers can select a maximum of 3 skills/services.');
        return;
      }
    }

    setLoading(true);
    const finalSkills = customSkill.trim()
      ? [...form.skills, customSkill.trim()]
      : form.skills;

    try {
      const payload = { ...form, skills: finalSkills, role: selectedRole };
      if ((selectedRole === 'labour' || selectedRole === 'carowner') && serviceCities.length > 0) {
        payload.serviceCities = serviceCities;
      }


      const { data } = await api.post('/auth/register', payload);
      login(data);
      toast.success(`KroEasy par swagat hai, ${data.name}! 🎉`);
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
      {/* Header — light theme */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' }}>🚀 KroEasy</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>{t('registerTitle')}</div>
        </Link>
        <Link to="/login" style={{ textDecoration: 'none', padding: '7px 14px', background: '#EEF2FF', border: '1.5px solid #C7D2FE', color: '#4338CA', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>
          {t('loginBtn') || 'Login'}
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
            <input id="reg-phone" className="input-field" type="tel" placeholder={t('phonePlaceholder')} value={form.phone} maxLength={10} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setForm({ ...form, phone: val }); setError(''); }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>{t('passwordReq')}</label>
            <input id="reg-password" className="input-field" type="password" placeholder={t('passwordPlaceholder')} value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>
              {t('cityReq')} {(selectedRole === 'labour' || selectedRole === 'carowner') ? '(Primary City)' : ''}
            </label>
            <select
              id="reg-city"
              className="input-field"
              value={form.city}
              onChange={e => {
                const val = e.target.value;
                setForm({ ...form, city: val });
                const locMatch = locations.find(l => l.city === val);
                if (locMatch && locMatch.location && locMatch.location.coordinates) {
                  setSelectedLocation({ lat: locMatch.location.coordinates[1], lng: locMatch.location.coordinates[0] });
                }
                setError('');
              }}
              style={{ appearance: 'auto' }}
            >
              <option value="">{t('selectCity')}</option>
              {locations.map(c => (
                <option key={c._id} value={c.city}>{lang === 'hi' ? (c.nameHi || c.city) : c.city}</option>
              ))}
            </select>
          </div>

          {/* Multi-city service area for workers/car owners */}
          {(selectedRole === 'labour' || selectedRole === 'carowner') && (
            <div style={{
              background: selectedRole === 'labour' ? 'linear-gradient(135deg,#EFF6FF,#E0E7FF)' : 'linear-gradient(135deg,#FFF7ED,#FFEDD5)',
              border: `1.5px solid ${selectedRole === 'labour' ? '#BFDBFE' : '#FED7AA'}`,
              borderRadius: '14px', padding: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>🌍</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: selectedRole === 'labour' ? '#1E3A8A' : '#C2410C' }}>
                    {lang === 'hi' ? 'सेवा शहर चुनें (एक या अधिक)' : 'Select Service Cities'}
                  </div>
                  <div style={{ fontSize: '11px', color: selectedRole === 'labour' ? '#3730A3' : '#9A3412', marginTop: '1px' }}>
                    {lang === 'hi' ? 'जिन शहरों में सेवा देंगे सभी चुनें' : 'Select all cities where you will provide service'}
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '9px 11px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: selectedRole === 'labour' ? '#1E40AF' : '#9A3412', lineHeight: '1.5' }}>
                💡 {lang === 'hi'
                  ? 'जितने ज़्यादा शहर, उतने ज़्यादा customers! पहला शहर आपका primary city बन जाएगा।'
                  : 'More cities = more customers! First city selected becomes your primary city.'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                {locations.map(c => {
                  const sel = serviceCities.includes(c.city);
                  const accent = selectedRole === 'labour' ? '#1E3A8A' : '#C2410C';
                  const light = selectedRole === 'labour' ? '#BFDBFE' : '#FED7AA';
                  const label = lang === 'hi' ? (c.nameHi || c.city) : c.city;
                  return (
                    <button key={c._id} type="button"
                      onClick={() => toggleServiceCity(c.city)}
                      style={{
                        padding: '7px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                        border: `2px solid ${sel ? accent : light}`,
                        background: sel ? accent : 'white',
                        color: sel ? 'white' : accent,
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: sel ? `0 2px 8px ${accent}40` : 'none'
                      }}>
                      {label} {sel ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
              {serviceCities.length > 0 && (
                <div style={{ fontSize: '12px', color: selectedRole === 'labour' ? '#1E40AF' : '#9A3412', fontWeight: '600' }}>
                  ✅ {serviceCities.length} {lang === 'hi' ? 'शहर चुने गए' : 'cities selected'}
                </div>
              )}
            </div>
          )}


          {/* Labour-specific fields */}
          {selectedRole === 'labour' && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{t('skillsLabel')}</label>
                  <span style={{
                    fontSize: '11px', fontWeight: '700',
                    color: form.skills.length >= 3 ? '#DC2626' : '#6366F1',
                    background: form.skills.length >= 3 ? '#FEF2F2' : '#EEF2FF',
                    padding: '2px 8px', borderRadius: '999px',
                  }}>
                    {form.skills.length}/3 {form.skills.length >= 3 ? '🔒 Max reached' : 'selected'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {skillOptions.map(skill => {
                    const primaryCityLoc = locations.find(l => l.city === form.city);
                    const cityEnabledSkills = primaryCityLoc?.enabledServices || [];
                    if (cityEnabledSkills.length > 0 && !cityEnabledSkills.includes(skill)) return null;

                    const isSelected = form.skills.includes(skill);
                    const isDisabled = !isSelected && form.skills.length >= 3;
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        disabled={isDisabled}
                        style={{
                          padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
                          border: `1.5px solid ${isSelected ? '#1E3A8A' : isDisabled ? '#E2E8F0' : '#E2E8F0'}`,
                          background: isSelected ? '#1E3A8A' : isDisabled ? '#F8FAFC' : 'white',
                          color: isSelected ? 'white' : isDisabled ? '#CBD5E1' : '#374151',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s',
                          opacity: isDisabled ? 0.5 : 1,
                        }}
                      >{skill}</button>
                    );
                  })}
                  {/* Other — custom skill pill (only if < 3 skills) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (form.skills.length >= 3 && !showCustomInput) {
                        toast.error('Maximum 3 skills allowed.');
                        return;
                      }
                      setShowCustomInput(v => !v);
                    }}
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
