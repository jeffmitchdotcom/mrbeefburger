import { useStore } from '@nanostores/react';
import { $orderLocation, clearOrderLocation } from '../stores/location';

export default function LocationBanner() {
  const location = useStore($orderLocation);
  if (!location) return null;

  return (
    <div style={{
      background: '#fff5f4',
      borderBottom: '2px solid #DA291C',
      padding: '0.625rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{ fontSize: '0.875rem', color: '#1a1a1a' }}>
        Ordering from <strong>{location.name}</strong>
      </span>
      <a
        href="/locations"
        onClick={clearOrderLocation}
        style={{
          fontSize: '0.775rem',
          color: '#DA291C',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textDecoration: 'none',
          textTransform: 'uppercase',
        }}
      >
        Change →
      </a>
    </div>
  );
}
