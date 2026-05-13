import { useState, useEffect } from 'react';
import type { CartItem } from '../stores/cart';
import { clearCart } from '../stores/cart';
import { clearOrderLocation } from '../stores/location';

type OrderSummary = {
  items: CartItem[];
  total: number;
  locationName: string;
  locationAddress: string;
  locationSlug: string;
  customerName: string;
  customerEmail: string;
  orderType: string;
  pickupTime: string;
  specialRequests: string;
};

export default function PaymentTheater() {
  const [orderNumber, setOrderNumber] = useState('');
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loyaltyStatus, setLoyaltyStatus] = useState<'loading' | 'member' | 'non-member'>('loading');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [joinAccord, setJoinAccord] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('orderSummary');
    if (raw) {
      try {
        const parsed: OrderSummary = JSON.parse(raw);
        setSummary(parsed);
        if (parsed.customerEmail) {
          fetch(`/api/loyalty/check?email=${encodeURIComponent(parsed.customerEmail)}`)
            .then((r) => r.json())
            .then((d) => setLoyaltyStatus(d.isMember ? 'member' : 'non-member'))
            .catch(() => setLoyaltyStatus('non-member'));
        } else {
          setLoyaltyStatus('non-member');
        }
      } catch {
        setLoyaltyStatus('non-member');
      }
    } else {
      setLoyaltyStatus('non-member');
    }
  }, []);

  return (
    <>
      <style>{`
        @keyframes gotcha-in {
          from { transform: scale(0.6) rotate(-5deg); opacity: 0; }
          to { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes burger-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-24px) rotate(-8deg); }
          75% { transform: translateY(-12px) rotate(8deg); }
        }
      `}</style>

      <main style={{
        background: '#f7f4f0',
        minHeight: '100vh',
        padding: '4rem 1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 800,
            color: '#1a1a1a',
            margin: '0 0 0.35rem',
            lineHeight: 1.1,
          }}>
            {summary?.customerName ? `Almost there, ${summary.customerName}...` : 'Almost there...'}
          </h1>
          {orderNumber && (
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.875rem',
              color: '#767676',
              margin: '0 0 2rem',
            }}>Order #{orderNumber}</p>
          )}

          {/* Order summary */}
          {summary && (
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '2rem',
            }}>
              <div style={{
                padding: '1rem 1.25rem',
                background: '#1a1a1a',
                color: '#ffffff',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: '0 0 0.2rem' }}>
                      Ordering from
                    </p>
                    <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.2rem', lineHeight: 1.2 }}>
                      {summary.locationName}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>
                      {summary.locationAddress}
                    </p>
                  </div>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', paddingTop: '0.1rem' }}>
                    {summary.orderType === 'dine-in' ? 'Dine-In' : 'Pickup'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <a
                    href="/order"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5C200', textDecoration: 'none' }}
                  >
                    Change location →
                  </a>
                  <a
                    href="/menu"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
                  >
                    Edit Cart →
                  </a>
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {summary.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{item.title}</span>
                      {item.quantity > 1 && <span style={{ color: '#767676', fontSize: '0.8rem' }}> × {item.quantity}</span>}
                      {item.customizations.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#767676', marginTop: '0.15rem' }}>
                          {item.customizations.join(', ')}
                        </div>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, color: '#DA291C', marginLeft: '1rem', flexShrink: 0 }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                padding: '0.875rem 1.25rem',
                borderTop: '2px solid #1a1a1a',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '1rem',
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}>
                <span>Total</span>
                <span style={{ color: '#DA291C' }}>${summary.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Loyalty banner */}
          {loyaltyStatus === 'member' && (
            <div style={{
              background: '#fffbea',
              border: '1.5px solid #F5C200',
              borderRadius: '8px',
              padding: '0.875rem 1.25rem',
              marginBottom: '1.25rem',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b8920a', margin: '0 0 0.4rem' }}>
                Loyalty
              </p>
              <p style={{ fontSize: '0.875rem', color: '#1a1a1a', lineHeight: 1.5, margin: 0 }}>
                <span style={{ fontWeight: 700 }}>You're in the Accord.</span>{' '}
                {summary && Math.floor(summary.total) > 0 ? (
                  <>
                    This order earns you{' '}
                    <span style={{ fontWeight: 800, color: '#b8920a' }}>{Math.floor(summary.total)} Sauce Units</span>.
                    {' '}Gerald will credit them once he's reviewed the transaction.
                  </>
                ) : (
                  <>Gerald will credit your Sauce Units once he's reviewed the transaction.</>
                )}
              </p>
            </div>
          )}
          {loyaltyStatus === 'non-member' && (
            <div style={{
              background: '#f7f4f0',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#DA291C', margin: '0 0 0.4rem' }}>
                Loyalty
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.3rem' }}>
                You're not in the Accord.
              </p>
              {summary && Math.floor(summary.total) > 0 && (
                <p style={{ fontSize: '0.875rem', color: '#767676', lineHeight: 1.5, margin: '0 0 0.875rem' }}>
                  This order would earn you{' '}
                  <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{Math.floor(summary.total)} Sauce Units</span>
                  {' '}as a member.
                </p>
              )}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={joinAccord}
                  onChange={(e) => setJoinAccord(e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: '#DA291C', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.875rem', color: '#767676', lineHeight: 1.5 }}>
                  <span style={{ color: '#1a1a1a', fontWeight: 600 }}>Apply to the Accord after checkout</span>
                  {' '}— Gerald will hold your Sauce Units.
                </span>
              </label>
            </div>
          )}

          {placeError && (
            <p style={{ color: '#DA291C', fontSize: '0.875rem', marginBottom: '1rem', fontFamily: "'DM Sans', sans-serif" }}>
              {placeError}
            </p>
          )}

          <button
            onClick={async () => {
              if (!summary || placing) return;
              setPlacing(true);
              setPlaceError('');
              try {
                const res = await fetch('/api/orders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customerName: summary.customerName,
                    customerEmail: summary.customerEmail,
                    orderType: summary.orderType,
                    locationSlug: summary.locationSlug,
                    locationName: summary.locationName,
                    locationAddress: summary.locationAddress,
                    pickupTime: summary.pickupTime,
                    specialRequests: summary.specialRequests,
                    items: summary.items,
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setOrderNumber(data.orderNumber);
                sessionStorage.setItem('orderNumber', data.orderNumber);
                if (joinAccord) {
                  sessionStorage.setItem('loyaltyPrefill', JSON.stringify({
                    email: summary.customerEmail,
                    orderNumber: data.orderNumber,
                  }));
                }
                clearCart();
                clearOrderLocation();
                setShowModal(true);
              } catch {
                setPlaceError('Something went wrong. Gerald is not surprised. Try again.');
              } finally {
                setPlacing(false);
              }
            }}
            disabled={placing || !summary}
            style={{
              width: '100%',
              background: '#DA291C',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              padding: '1rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: placing || !summary ? 'not-allowed' : 'pointer',
              opacity: placing || !summary ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {placing ? 'One moment...' : 'Pay Now'}
          </button>
        </div>
      </main>

      {/* Gotcha Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.88)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: 'clamp(2rem, 5vw, 3.5rem)',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            animation: 'gotcha-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          }}>
            <div style={{
              fontSize: 'clamp(3rem, 10vw, 5rem)',
              animation: 'burger-bounce 1.2s ease-in-out infinite',
              display: 'block',
              marginBottom: '1rem',
            }}>🍔</div>

            <h1 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              fontWeight: 800,
              color: '#DA291C',
              margin: '0 0 1rem',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}>GOTCHA</h1>

            <p style={{
              fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
              color: '#1a1a1a',
              lineHeight: 1.6,
              margin: '0 0 2rem',
            }}>
              This isn't a real restaurant. We don't want your money.
              We can't even make burgers.
            </p>

            {joinAccord && (
              <p style={{
                fontSize: '0.875rem',
                color: '#767676',
                margin: '0 0 1.5rem',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Gerald also notes your interest in the Accord.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <a
                href={orderNumber ? `/order/${orderNumber}` : '/menu'}
                style={{
                  display: 'inline-block',
                  background: '#DA291C',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '0.9rem 2rem',
                  borderRadius: '999px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                See My Order Anyway →
              </a>
              {joinAccord && (
                <a
                  href="/loyalty"
                  style={{
                    display: 'inline-block',
                    background: '#1a1a1a',
                    color: '#F5C200',
                    textDecoration: 'none',
                    padding: '0.9rem 2rem',
                    borderRadius: '999px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Apply to the Accord →
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
