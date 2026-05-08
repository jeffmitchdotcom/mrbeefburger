type Location = {
  slug: string;
  name: string;
  address: string;
  hours: string;
};

type Props = {
  location: Location;
  selected: boolean;
  onSelect: () => void;
  distance?: string;
};

export default function LocationCard({ location, selected, onSelect, distance }: Props) {
  return (
    <div
      onClick={onSelect}
      style={{
        border: `2px solid ${selected ? '#DA291C' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: '8px',
        padding: '1.25rem',
        cursor: 'pointer',
        background: selected ? '#fff5f4' : '#ffffff',
        transition: 'border-color 0.2s, background 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        position: 'relative',
      }}
    >
      {selected && (
        <span style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: '#DA291C',
          color: '#ffffff',
          borderRadius: '50%',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 800,
        }}>✓</span>
      )}
      <h3 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: '0.95rem',
        fontWeight: 700,
        color: '#1a1a1a',
        margin: 0,
        lineHeight: 1.3,
        paddingRight: selected ? '2rem' : 0,
      }}>{location.name}</h3>
      <p style={{ fontSize: '0.85rem', color: '#767676', margin: 0, lineHeight: 1.5 }}>{location.address}</p>
      <p style={{ fontSize: '0.8rem', color: '#767676', margin: 0 }}>
        <strong style={{ color: '#1a1a1a' }}>Hours:</strong> {location.hours}
      </p>
      {distance && (
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#767676', margin: 0, letterSpacing: '0.05em' }}>
          {distance}
        </p>
      )}
    </div>
  );
}
