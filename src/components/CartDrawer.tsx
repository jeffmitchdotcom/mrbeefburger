import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartItems, removeFromCart, updateQuantity, cartTotal } from '../stores/cart';

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const items = useStore(cartItems);
  const total = cartTotal(items);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open cart"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 800,
          background: '#DA291C',
          color: '#ffffff',
          border: 'none',
          borderRadius: '999px',
          padding: '0.85rem 1.4rem',
          fontSize: '0.875rem',
          fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 4px 20px rgba(218,41,28,0.35)',
          letterSpacing: '0.04em',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        {count > 0 ? (
          <span style={{
            background: '#F5C200',
            color: '#1a1a1a',
            borderRadius: '999px',
            padding: '0.1rem 0.5rem',
            fontSize: '0.75rem',
            fontWeight: 800,
          }}>{count}</span>
        ) : (
          <span>Cart</span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 900,
          }}
        />
      )}

      {/* Drawer panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(400px, 100vw)',
        background: '#ffffff',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#1a1a1a',
            margin: 0,
          }}>Your Order</h2>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#767676',
              lineHeight: 1,
              padding: '0.25rem',
            }}
          >×</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {items.length === 0 ? (
            <p style={{
              fontSize: '0.9rem',
              color: '#767676',
              fontStyle: 'italic',
              lineHeight: 1.6,
              marginTop: '2rem',
              textAlign: 'center',
            }}>
              "Your cart is as empty as our dining room (we don't have one)."
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, i) => (
                <div key={i} style={{
                  padding: '1rem',
                  background: '#f7f4f0',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}>
                  {/* Title + price row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', lineHeight: 1.3 }}>{item.title}</span>
                    <span style={{ fontWeight: 700, color: '#DA291C', fontSize: '0.9rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* Customizations */}
                  {item.customizations.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '0.875rem', fontSize: '0.775rem', color: '#767676', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      {item.customizations.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  )}

                  {/* Quantity controls + remove */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                      <button
                        onClick={() => updateQuantity(i, -1)}
                        aria-label="Decrease quantity"
                        style={{
                          width: '28px', height: '28px',
                          background: '#ffffff', border: '1.5px solid rgba(0,0,0,0.15)',
                          borderRadius: '6px 0 0 6px', cursor: 'pointer',
                          fontSize: '1rem', fontWeight: 700, color: '#1a1a1a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >−</button>
                      <span style={{
                        width: '32px', height: '28px',
                        background: '#ffffff', border: '1.5px solid rgba(0,0,0,0.15)',
                        borderLeft: 'none', borderRight: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a',
                        fontFamily: "'DM Sans', sans-serif",
                      }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(i, 1)}
                        aria-label="Increase quantity"
                        style={{
                          width: '28px', height: '28px',
                          background: '#ffffff', border: '1.5px solid rgba(0,0,0,0.15)',
                          borderRadius: '0 6px 6px 0', cursor: 'pointer',
                          fontSize: '1rem', fontWeight: 700, color: '#DA291C',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >+</button>
                    </div>
                    <button
                      onClick={() => removeFromCart(i)}
                      style={{
                        background: 'none', border: 'none',
                        color: '#767676', fontSize: '0.75rem', fontWeight: 600,
                        cursor: 'pointer', padding: 0, textDecoration: 'underline',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem' }}>
              <span style={{ color: '#1a1a1a' }}>Subtotal</span>
              <span style={{ color: '#DA291C' }}>${total.toFixed(2)}</span>
            </div>
            <a
              href="/order"
              style={{
                display: 'block',
                background: '#DA291C',
                color: '#ffffff',
                textDecoration: 'none',
                textAlign: 'center',
                padding: '0.875rem',
                borderRadius: '999px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Choose Location →
            </a>
          </div>
        )}
      </div>
    </>
  );
}
