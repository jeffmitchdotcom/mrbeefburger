import { useState } from 'react';
import { addToCart } from '../stores/cart';

type Props = {
  slug: string;
  title: string;
  price: number;
  description: string;
  toppings?: string[];
  image?: string;
};

export default function MenuItemCard({ slug, title, price, description, toppings, image }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>(toppings ?? []);
  const [added, setAdded] = useState(false);

  const toggleTopping = (t: string) =>
    setSelected((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const removalCount = (toppings ?? []).filter(t => !selected.includes(t)).length;

  const handleAdd = () => {
    const removals = (toppings ?? [])
      .filter(t => !selected.includes(t))
      .map(t => `NO ${t}`);
    addToCart({ slug, title, price, quantity: 1, customizations: removals });
    setAdded(true);
    setSelected(toppings ?? []);
    setExpanded(false);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: '8px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <div style={{
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: '6px',
        border: '1.5px solid #F5C200',
        overflow: 'hidden',
        flexShrink: 0,
        background: image ? undefined : '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {image ? (
          <img
            src={image}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <svg viewBox="0 0 80 58" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: '128px', opacity: 0.15 }}>
            <path d="M14 27 Q14 9 40 9 Q66 9 66 27" />
            <line x1="12" y1="27" x2="68" y2="27" />
            <path d="M12 31 Q20 26 28 31 Q36 36 44 31 Q52 26 60 31 Q65 29 68 31" />
            <rect x="13" y="33" width="54" height="8" rx="4" />
            <line x1="12" y1="43" x2="68" y2="43" />
            <path d="M12 43 Q12 53 40 53 Q68 53 68 43" />
          </svg>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <h3 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1.05rem',
          fontWeight: 700,
          color: '#1a1a1a',
          margin: 0,
          lineHeight: 1.3,
        }}>{title}</h3>
        <span style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1rem',
          fontWeight: 700,
          color: '#DA291C',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>${price}</span>
      </div>

      <p style={{ fontSize: '0.875rem', color: '#767676', lineHeight: 1.6, margin: 0 }}>{description}</p>

      {toppings && toppings.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: 'none',
              border: '1px solid #DA291C',
              color: '#DA291C',
              borderRadius: '999px',
              padding: '0.3rem 0.9rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {expanded ? 'Done' : removalCount > 0 ? `Customize (${removalCount} removed)` : 'Customize'}
          </button>

          {expanded && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#767676', margin: '0 0 0.25rem' }}>Uncheck to remove an ingredient.</p>
              {toppings.map((t) => (
                <label key={t} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(t)}
                    onChange={() => toggleTopping(t)}
                    style={{ accentColor: '#DA291C', width: '15px', height: '15px' }}
                  />
                  {t}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={added}
        style={{
          marginTop: 'auto',
          background: added ? '#767676' : '#DA291C',
          color: '#ffffff',
          border: 'none',
          borderRadius: '999px',
          padding: '0.65rem 1.5rem',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: added ? 'default' : 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          transition: 'background 0.2s',
          alignSelf: 'flex-start',
        }}
      >
        {added ? 'Added ✓' : 'Add to Cart'}
      </button>
    </div>
  );
}
