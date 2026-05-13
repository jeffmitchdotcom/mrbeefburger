import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { cartItems, cartTotal } from '../stores/cart';
import { $orderLocation, setOrderLocation, clearOrderLocation } from '../stores/location';
import LocationCard from './LocationCard';

type Location = {
  slug: string;
  name: string;
  address: string;
  hours: string;
  lat: number;
  lng: number;
  state: string;
};

type Props = {
  locations: Location[];
  user?: { name: string; email: string } | null;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1.5px solid rgba(0,0,0,0.15)',
  borderRadius: '6px',
  fontSize: '0.95rem',
  fontFamily: "'DM Sans', sans-serif",
  color: '#1a1a1a',
  background: '#ffffff',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#1a1a1a',
  fontFamily: "'DM Sans', sans-serif",
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (n: number) => n * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const defaultSort = (locs: Location[]) =>
  [...locs].sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

export default function OrderForm({ locations, user }: Props) {
  const [step, setStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [orderType, setOrderType] = useState<'pickup' | 'dine-in'>('pickup');
  const [customerName, setCustomerName] = useState(user?.name ?? '');
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? '');
  const [pickupTime, setPickupTime] = useState('ASAP');
  const [specialRequests, setSpecialRequests] = useState('');
  const [sortedLocations, setSortedLocations] = useState<Location[]>(() => defaultSort(locations));
  const [distances, setDistances] = useState<Record<string, string>>({});
  const [geoLabel, setGeoLabel] = useState('Use my location');
  const [geoDisabled, setGeoDisabled] = useState(false);

  const items = useStore(cartItems);
  const total = cartTotal(items);

  useEffect(() => {
    const stored = $orderLocation.get();
    if (stored) {
      const match = locations.find(l => l.slug.replace(/\.md$/, '') === stored.slug.replace(/\.md$/, ''));
      if (match) {
        setSelectedLocation(match);
        setStep(2);
      }
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    return () => clearTimeout(t);
  }, [step]);

  const handleSubmit = () => {
    if (!customerName.trim() || !customerEmail.trim() || !selectedLocation || items.length === 0) return;
    sessionStorage.setItem('orderSummary', JSON.stringify({
      items,
      total: cartTotal(items),
      locationName: selectedLocation.name,
      locationAddress: selectedLocation.address,
      locationSlug: selectedLocation.slug,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      orderType,
      pickupTime,
      specialRequests,
    }));
    window.location.href = '/payment';
  };

  const handleGeo = () => {
    setGeoLabel('Finding you...');
    setGeoDisabled(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        const withDist = locations.map(loc => ({
          loc,
          dist: haversine(latitude, longitude, loc.lat, loc.lng),
        }));
        withDist.sort((a, b) => a.dist - b.dist);
        setSortedLocations(withDist.map(({ loc }) => loc));
        const distMap: Record<string, string> = {};
        withDist.forEach(({ loc, dist }) => { distMap[loc.slug] = `${dist.toFixed(1)} mi`; });
        setDistances(distMap);
        const nearest = withDist[0].loc;
        setSelectedLocation(nearest);
        setGeoLabel(`📍 ${nearest.name} — nearest`);
        setGeoDisabled(false);
      },
      () => {
        setGeoLabel('Location unavailable');
        setGeoDisabled(false);
      }
    );
  };

  const btnPrimary: React.CSSProperties = {
    background: '#DA291C',
    color: '#ffffff',
    border: 'none',
    borderRadius: '999px',
    padding: '0.875rem 2rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'opacity 0.2s',
  };

  const btnOutline: React.CSSProperties = {
    background: 'transparent',
    color: '#DA291C',
    border: '2px solid #DA291C',
    borderRadius: '999px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  };

  const steps = [
    { label: 'Menu', done: true },
    { label: 'Location', done: step > 1 },
    { label: 'Details', done: false },
  ];

  return (
    <main style={{ background: '#f7f4f0', minHeight: '100vh', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {steps.map((s, i) => {
            const active = i === step; // step 0=Menu(done), 1=Location, 2=Details; internal step is 1-indexed so offset
            const completed = i === 0 || (i === 1 && step > 1);
            const isCurrent = (i === 1 && step === 1) || (i === 2 && step === 2);
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: completed ? '#DA291C' : isCurrent ? '#DA291C' : 'rgba(0,0,0,0.12)',
                  color: completed || isCurrent ? '#ffffff' : '#767676',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {completed && !isCurrent ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '0.8rem',
                  color: completed || isCurrent ? '#1a1a1a' : '#767676',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                }}>{s.label}</span>
                {i < steps.length - 1 && <span style={{ color: '#767676', margin: '0 0.25rem' }}>→</span>}
              </div>
            );
          })}
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              color: '#DA291C',
              margin: '0 0 0.5rem',
            }}>Choose your destination.</h1>
            <p style={{ color: '#767676', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Select a location, then tell us how you'll be joining us.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <button
                onClick={handleGeo}
                disabled={geoDisabled}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#1a1a1a',
                  background: '#f7f4f0',
                  border: '1.5px solid rgba(0,0,0,0.15)',
                  borderRadius: '999px',
                  padding: '0.7rem 1.4rem',
                  cursor: geoDisabled ? 'default' : 'pointer',
                  opacity: geoDisabled ? 0.6 : 1,
                  transition: 'border-color 0.2s, color 0.2s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="7"/>
                  <line x1="12" y1="2" x2="12" y2="5"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="2" y1="12" x2="5" y2="12"/>
                  <line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
                {geoLabel}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
              paddingBottom: '5.5rem',
            }}>
              {sortedLocations.map((loc) => (
                <LocationCard
                  key={loc.slug}
                  location={loc}
                  selected={selectedLocation?.slug === loc.slug}
                  onSelect={() => setSelectedLocation(loc)}
                  distance={distances[loc.slug]}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              color: '#DA291C',
              margin: '0 0 0.5rem',
            }}>A few more details.</h1>
            <p style={{ color: '#767676', marginBottom: '2rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <span>{selectedLocation?.name} · {orderType === 'dine-in' ? 'Dine-In' : 'Pickup'}</span>
              <button
                onClick={() => { clearOrderLocation(); setStep(1); setSelectedLocation(null); }}
                style={{ background: 'none', border: 'none', color: '#DA291C', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer', padding: 0, letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}
              >Change →</button>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              {user ? (
                <div style={{
                  background: '#f7f4f0',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#767676', margin: '0 0 0.3rem', fontFamily: "'DM Sans', sans-serif" }}>
                      Ordering as
                    </p>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.15rem', fontFamily: "'DM Sans', sans-serif" }}>
                      {user.name}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#767676', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                      {user.email}
                    </p>
                  </div>
                  <a
                    href="/account"
                    style={{ fontSize: '0.775rem', fontWeight: 700, color: '#DA291C', textDecoration: 'none', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
                  >
                    Not you? →
                  </a>
                </div>
              ) : (
                <>
                  <label style={labelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Your name
                      <span style={{ color: '#DA291C', fontWeight: 800 }}>*</span>
                      <span style={{ fontSize: '0.65rem', color: '#767676', letterSpacing: '0.1em', fontWeight: 700 }}>REQUIRED</span>
                    </span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="First name is fine"
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Email address
                      <span style={{ color: '#DA291C', fontWeight: 800 }}>*</span>
                      <span style={{ fontSize: '0.65rem', color: '#767676', letterSpacing: '0.1em', fontWeight: 700 }}>REQUIRED</span>
                    </span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="For your order confirmation"
                      style={inputStyle}
                    />
                  </label>
                </>
              )}

              <label style={labelStyle}>
                {orderType === 'dine-in' ? 'Arrival time' : 'Pickup time'}
                <select
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  style={inputStyle}
                >
                  <option>ASAP</option>
                  <option>15 min</option>
                  <option>30 min</option>
                  <option>45 min</option>
                  <option>1 hour</option>
                  <option>Whenever the universe allows</option>
                </select>
              </label>

              <label style={labelStyle}>
                Special requests{' '}
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#767676' }}>(optional)</span>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Allergies, preferences, philosophical positions on cheese..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </label>
            </div>

            {/* Cart summary */}
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#1a1a1a',
                  margin: 0,
                }}>Your Order</h3>
                <a href="/menu" style={{
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  color: '#DA291C',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                  fontFamily: "'DM Sans', sans-serif",
                }}>← Edit Cart</a>
              </div>
              {items.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: '#767676', fontStyle: 'italic' }}>
                  Your cart is empty.{' '}
                  <a href="/menu" style={{ color: '#DA291C', fontStyle: 'normal' }}>Add something first →</a>
                </p>
              ) : (
                <>
                  {items.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                      padding: '0.4rem 0',
                      borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    }}>
                      <span style={{ color: '#1a1a1a' }}>
                        {item.title}
                        {item.quantity > 1 && <span style={{ color: '#767676' }}> × {item.quantity}</span>}
                      </span>
                      <span style={{ color: '#DA291C', fontWeight: 700 }}>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '2px solid #1a1a1a',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                  }}>
                    <span>Total</span>
                    <span style={{ color: '#DA291C' }}>${total.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSubmit}
                disabled={!customerName.trim() || !customerEmail.trim() || items.length === 0}
                style={{
                  ...btnPrimary,
                  opacity: (!customerName.trim() || !customerEmail.trim() || items.length === 0) ? 0.4 : 1,
                  cursor: (!customerName.trim() || !customerEmail.trim() || items.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                Review Order →
              </button>
            </div>
          </div>
        )}
      </div>

      {step === 1 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          zIndex: 50,
          padding: '0.875rem 1.5rem',
        }}>
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {(['pickup', 'dine-in'] as const).map((type) => (
                <label key={type} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  border: `2px solid ${orderType === type ? '#DA291C' : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: '6px',
                  background: orderType === type ? '#fff5f4' : '#f7f4f0',
                  transition: 'border-color 0.2s',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1a1a1a',
                }}>
                  <input
                    type="radio"
                    value={type}
                    checked={orderType === type}
                    onChange={() => setOrderType(type)}
                    style={{ accentColor: '#DA291C' }}
                  />
                  {type === 'pickup' ? 'Pickup' : 'Dine-In'}
                </label>
              ))}
            </div>
            <button
              onClick={() => { if (selectedLocation) setOrderLocation({ slug: selectedLocation.slug, name: selectedLocation.name, address: selectedLocation.address }); setStep(2); }}
              disabled={!selectedLocation}
              style={{
                ...btnPrimary,
                opacity: selectedLocation ? 1 : 0.4,
                cursor: selectedLocation ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Continue to Order Details →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
