import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

const PLAN_PRICE = 499;
const TRIAL_DAYS = 90;

const statusConfig = {
  trial: {
    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
    icon: '🎁', label: 'Free Trial Active',
  },
  active: {
    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
    icon: '✅', label: 'Subscription Active',
  },
  expired: {
    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
    icon: '⚠️', label: 'Subscription Expired',
  },
  cancelled: {
    color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB',
    icon: '❌', label: 'Subscription Cancelled',
  },
  none: {
    color: '#9333EA', bg: '#FAF5FF', border: '#E9D5FF',
    icon: '🚀', label: 'Get Started',
  },
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/subscription/status');
      setSub(data);
    } catch (err) {
      toast.error('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setPaying(true);
    try {
      const { data } = await api.post('/subscription/create-order');

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'KroEasy',
        description: 'Monthly Subscription – ₹499/month',
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await api.post('/subscription/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('🎉 Subscription activated! Welcome to KroEasy Pro!');
            fetchStatus();
          } catch (err) {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        prefill: {
          name: user?.name || '',
          contact: user?.phone ? `+91${user.phone}` : '',
        },
        theme: { color: '#7C3AED' },
        modal: { ondismiss: () => setPaying(false) },
      };

      if (!window.Razorpay) {
        // Dynamically load Razorpay script
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = resolve;
          s.onerror = reject;
          document.body.appendChild(s);
        });
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment gateway error. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  const cfg = statusConfig[sub?.status || 'none'];
  const isExpired = sub?.status === 'expired' || sub?.status === 'cancelled';
  const canSubscribe = isExpired || sub?.status === 'none' || !sub;
  const isActive = sub?.status === 'active';
  const isTrial = sub?.status === 'trial';

  return (
    <div className="page-container" style={{ paddingBottom: '32px' }}>
      {/* Header */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '900' }}>🚀 KroEasy</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>Subscription Plans</div>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: '1.5px solid #CBD5E1', color: '#374151', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
        >
          ← Back
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Status Card */}
        <div style={{
          background: cfg.bg, border: `1.5px solid ${cfg.border}`,
          borderRadius: '16px', padding: '20px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <span style={{ fontSize: '36px' }}>{cfg.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: cfg.color }}>{cfg.label}</div>
            {isTrial && (
              <div style={{ fontSize: '13px', color: cfg.color, marginTop: '4px' }}>
                <strong>{sub.daysLeft}</strong> days left in your free trial
              </div>
            )}
            {isActive && (
              <div style={{ fontSize: '13px', color: cfg.color, marginTop: '4px' }}>
                Active until {new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN')} · <strong>{sub.daysLeft}</strong> days left
              </div>
            )}
            {isExpired && (
              <div style={{ fontSize: '13px', color: cfg.color, marginTop: '4px' }}>
                Your subscription has expired. Subscribe now to continue receiving jobs.
              </div>
            )}
          </div>
        </div>

        {/* Trial info for new/trial users */}
        {isTrial && (
          <div style={{
            background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
            border: '1.5px solid #C4B5FD', borderRadius: '16px',
            padding: '16px', marginBottom: '20px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#5B21B6', marginBottom: '8px' }}>
              🎁 Your Free Trial
            </div>
            <div style={{ fontSize: '13px', color: '#6D28D9', lineHeight: '1.6' }}>
              You have <strong>{sub.daysLeft} days</strong> remaining on your free trial.<br />
              Trial ends: <strong>{new Date(sub.trialEndsAt).toLocaleDateString('en-IN')}</strong><br />
              After trial: ₹499/month — subscribe before it expires so you don't miss any jobs!
            </div>
          </div>
        )}

        {/* Plan card */}
        <div style={{
          background: 'linear-gradient(135deg, #1E0A4A 0%, #7C3AED 100%)',
          borderRadius: '20px', padding: '24px', marginBottom: '20px', color: 'white',
          boxShadow: '0 20px 60px rgba(124, 58, 237, 0.35)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: '-30px', right: '-30px' }} />
          <div style={{ position: 'absolute', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', bottom: '10px', left: '10px' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8, marginBottom: '4px' }}>MONTHLY PLAN</div>
                <div style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-1px' }}>
                  ₹499<span style={{ fontSize: '16px', fontWeight: '500', opacity: 0.8 }}>/month</span>
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.15)', borderRadius: '12px',
                padding: '8px 14px', fontSize: '12px', fontWeight: '700',
                border: '1px solid rgba(255,255,255,0.25)',
              }}>
                🎁 3 months FREE
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                { icon: '✅', text: 'Unlimited job requests in your area' },
                { icon: '🚫', text: 'Zero commission — you keep 100%' },
                { icon: '📍', text: 'Location & skill-based matching' },
                { icon: '🔔', text: 'Instant push notifications for new jobs' },
                { icon: '⭐', text: 'Verified worker badge on your profile' },
                { icon: '📊', text: 'Profile analytics & insights' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ opacity: 0.92 }}>{item.text}</span>
                </div>
              ))}
            </div>

            {(canSubscribe || isTrial) && (
              <button
                id="subscribe-btn"
                onClick={handleSubscribe}
                disabled={paying}
                style={{
                  width: '100%', padding: '15px', borderRadius: '12px',
                  background: paying ? 'rgba(255,255,255,0.3)' : 'white',
                  color: paying ? 'rgba(255,255,255,0.7)' : '#7C3AED',
                  border: 'none', cursor: paying ? 'not-allowed' : 'pointer',
                  fontSize: '16px', fontWeight: '900',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s',
                }}
              >
                {paying ? 'Opening payment...' : isTrial ? '🔐 Subscribe Now ₹499/month' : '🚀 Activate Subscription'}
              </button>
            )}

            {isActive && (
              <div style={{
                background: 'rgba(255,255,255,0.15)', borderRadius: '12px',
                padding: '14px', textAlign: 'center', fontSize: '14px', fontWeight: '700',
                border: '1px solid rgba(255,255,255,0.25)',
              }}>
                ✅ You're subscribed! Renew when your plan expires.
              </div>
            )}
          </div>
        </div>

        {/* USP comparison */}
        <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', color: '#1E293B' }}>
            🆚 KroEasy vs Others
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', fontWeight: '700', textAlign: 'center', marginBottom: '8px', color: '#64748B' }}>
            <div>Feature</div>
            <div style={{ color: '#7C3AED' }}>KroEasy</div>
            <div style={{ color: '#6B7280' }}>Others</div>
          </div>
          {[
            ['Commission', '0%', '15–25%'],
            ['Jobs limit', 'Unlimited', 'Pay per lead'],
            ['Monthly fee', '₹499', '₹0 (but high cut)'],
            ['Radius control', '✅ Yes', '❌ No'],
          ].map(([f, a, o], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px', padding: '8px 0', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <div style={{ color: '#374151', fontWeight: '600', textAlign: 'left' }}>{f}</div>
              <div style={{ color: '#059669', fontWeight: '700' }}>{a}</div>
              <div style={{ color: '#DC2626' }}>{o}</div>
            </div>
          ))}
        </div>

        {/* Payment history */}
        {sub?.payments?.length > 0 && (
          <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', color: '#1E293B' }}>
              🧾 Payment History
            </div>
            {sub.payments.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', fontSize: '13px' }}>
                <div>
                  <div style={{ fontWeight: '700', color: p.status === 'success' ? '#059669' : '#DC2626' }}>
                    {p.status === 'success' ? '✅' : '❌'} ₹{((p.amount || 0) / 100).toFixed(0)}
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: '11px' }}>{new Date(p.paidAt).toLocaleDateString('en-IN')}</div>
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
                  {p.razorpayPaymentId?.slice(-8)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', color: '#1E293B' }}>❓ FAQs</div>
          {[
            ['Is the trial really free?', '100% free for 90 days. No credit card needed. Just register and start getting work.'],
            ['What happens after trial?', 'You can subscribe for ₹499/month. If you don\'t subscribe, you won\'t receive new job requests.'],
            ['Can I cancel anytime?', 'Yes. You can cancel at any time. Your access continues until the current billing period ends.'],
            ['Is there any commission?', 'Never. You keep 100% of what you earn. We only charge the flat monthly subscription.'],
          ].map(([q, a], i) => (
            <div key={i} style={{ marginBottom: '12px', padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>{q}</div>
              <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6' }}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
