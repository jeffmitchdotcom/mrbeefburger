import { useState } from 'react';
import { authClient } from '../lib/auth-client';

type Props = {
  user: { name: string; email: string } | null;
  orders: {
    orderNumber: string;
    locationName: string;
    orderType: string;
    total: number;
    createdAt: string;
  }[];
  loyaltyMember: { tier: string } | null;
  sauceUnits: number;
  transactions: {
    action: string;
    description: string;
    sauceUnits: number;
    createdAt: string;
  }[];
};

const RED = '#DA291C';
const YELLOW = '#F5C200';
const SURFACE = '#f7f4f0';
const MUTED = '#767676';

function fmt(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Login form ──────────────────────────────────────────────────────────────
function LoginForm() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1.5px solid rgba(0,0,0,0.15)',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    background: RED,
    color: '#ffffff',
    border: 'none',
    borderRadius: '999px',
    padding: '0.875rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  };

  const sendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: 'sign-in' });
      setCodeSent(true);
    } catch {
      setError('Failed to send code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Sign in with OTP — correct endpoint for the sign-in flow
      const result = await authClient.signIn.emailOtp({ email: email.trim(), otp: otp.trim() });
      if (result.error) throw new Error(result.error.message);

      // If user has no meaningful name yet, try to set one from loyalty/orders
      if (result.data?.user && (!result.data.user.name || result.data.user.name === result.data.user.email)) {
        let resolvedName = name.trim();
        if (!resolvedName) {
          const res = await fetch(`/api/account/name-lookup?email=${encodeURIComponent(email.trim())}`);
          const data = await res.json();
          resolvedName = data.name ?? '';
        }
        if (resolvedName) {
          await authClient.updateUser({ name: resolvedName }).catch(() => {});
        } else {
          setNeedsName(true);
          setLoading(false);
          return;
        }
      }

      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ background: SURFACE, minHeight: '100vh', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 800,
          color: RED,
          margin: '0 0 0.5rem',
        }}>Your Account</h1>
        <p style={{ color: MUTED, marginBottom: '2.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Enter your email. Gerald will send a verification code. No password required. Gerald does not trust passwords.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={codeSent}
              style={{ ...inputStyle, opacity: codeSent ? 0.6 : 1 }}
            />
          </label>

          {!codeSent && (
            <button onClick={sendCode} disabled={loading || !email.trim()} style={{ ...btnPrimary, opacity: loading || !email.trim() ? 0.4 : 1 }}>
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          )}

          {codeSent && (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                Verification code
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  style={inputStyle}
                />
              </label>

              {needsName && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                  Your name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First name is fine"
                    style={inputStyle}
                  />
                </label>
              )}

              <button onClick={signIn} disabled={loading || !otp.trim() || (needsName && !name.trim())} style={{ ...btnPrimary, opacity: loading || !otp.trim() || (needsName && !name.trim()) ? 0.4 : 1 }}>
                {loading ? 'Verifying...' : 'Sign In'}
              </button>

              <button onClick={() => { setCodeSent(false); setOtp(''); setError(''); }} style={{ background: 'none', border: 'none', color: MUTED, fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Use a different email
              </button>
            </>
          )}

          {error && <p style={{ color: RED, fontSize: '0.875rem', margin: 0 }}>{error}</p>}
        </div>
      </div>
    </main>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ user, orders, loyaltyMember, sauceUnits, transactions }: Props & { user: NonNullable<Props['user']> }) {
  const signOut = async () => {
    await authClient.signOut();
    window.location.href = '/';
  };

  const tierColors: Record<string, string> = {
    'The Initiated': '#767676',
    'The Committed': '#3178C6',
    'The Consecrated': '#DA291C',
    'The Beefborn': '#F5C200',
  };

  return (
    <main style={{ background: SURFACE, minHeight: '100vh', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 800, color: RED, margin: '0 0 0.25rem' }}>
              {user.name}
            </h1>
            <p style={{ color: MUTED, fontSize: '0.875rem', margin: 0 }}>{user.email}</p>
          </div>
          <button
            onClick={signOut}
            style={{ background: 'none', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: '999px', padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
          >
            Sign Out
          </button>
        </div>

        {/* Loyalty card */}
        {loyaltyMember ? (
          <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.4rem' }}>
                  Beefburger Loyalty Accord
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '3rem', fontWeight: 800, color: YELLOW, lineHeight: 1 }}>
                    {sauceUnits}
                  </span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Sauce Units</span>
                </div>
              </div>
              <span style={{
                display: 'inline-block',
                background: tierColors[loyaltyMember.tier] ?? MUTED,
                color: '#ffffff',
                borderRadius: '999px',
                padding: '0.3rem 0.9rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {loyaltyMember.tier}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '1rem', margin: '0 0 0.25rem' }}>Not in the Accord yet.</p>
              <p style={{ color: MUTED, fontSize: '0.875rem', margin: 0 }}>Join to earn Sauce Units on every order.</p>
            </div>
            <a
              href="/loyalty"
              onClick={() => sessionStorage.setItem('loyaltyPrefill', JSON.stringify({ email: user.email }))}
              style={{ background: RED, color: '#ffffff', textDecoration: 'none', borderRadius: '999px', padding: '0.6rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}
            >
              Join →
            </a>
          </div>
        )}

        {/* Transaction ledger */}
        {transactions.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem', color: '#1a1a1a' }}>
              Sauce Unit History
            </h2>
            <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
              {transactions.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.875rem 1.25rem', borderBottom: i < transactions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a', margin: '0 0 0.2rem' }}>{t.description}</p>
                    <p style={{ fontSize: '0.775rem', color: MUTED, margin: 0 }}>{fmt(t.createdAt)}</p>
                  </div>
                  <span style={{ fontWeight: 800, color: t.sauceUnits >= 0 ? '#16a34a' : RED, whiteSpace: 'nowrap', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    {t.sauceUnits >= 0 ? '+' : ''}{t.sauceUnits} SU
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Order history */}
        <section>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem', color: '#1a1a1a' }}>
            Order History
          </h2>
          {orders.length === 0 ? (
            <p style={{ color: MUTED, fontSize: '0.875rem' }}>No orders yet. <a href="/menu" style={{ color: RED, fontWeight: 700, textDecoration: 'none' }}>Browse the menu →</a></p>
          ) : (
            <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
              {orders.map((o, i) => (
                <a key={i} href={`/order/${o.orderNumber}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: i < orders.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', textDecoration: 'none', color: 'inherit', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.2rem', fontFamily: "'DM Sans', sans-serif" }}>{o.orderNumber}</p>
                    <p style={{ fontSize: '0.775rem', color: MUTED, margin: 0 }}>{o.locationName} · {o.orderType === 'dine-in' ? 'Dine-In' : 'Pickup'} · {fmt(o.createdAt)}</p>
                  </div>
                  <span style={{ fontWeight: 800, color: RED, whiteSpace: 'nowrap', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    ${o.total.toFixed(2)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function AccountIsland(props: Props) {
  if (!props.user) return <LoginForm />;
  return <Dashboard {...props} user={props.user} />;
}
