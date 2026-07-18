import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }) => void;
    };
  }
}

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
  boxSizing: 'border-box',
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

const subjects = [
  'General inquiry',
  'Catering & events',
  'Franchise information',
  'Feedback (good)',
  'Feedback (bad, but brave)',
  'The Sauce — questions I cannot stop thinking about',
  'Something else entirely',
];

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(subjects[0]);
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const render = () => {
      if (turnstileRef.current && window.turnstile) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: '0x4AAAAAAD36HqBUZW4Ax1Wo',
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
        });
      }
    };
    if (window.turnstile) {
      render();
    } else {
      const script = document.querySelector('script[src*="turnstile"]');
      script?.addEventListener('load', render);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject, message: message.trim(), website: honeypot, 'cf-turnstile-response': turnstileToken }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div style={{
        background: '#ffffff',
        border: '2px solid #DA291C',
        borderRadius: '8px',
        padding: '3rem 2rem',
        textAlign: 'center',
        maxWidth: '720px',
        margin: '0 auto',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#DA291C', margin: '0 0 0.75rem' }}>
          Message received.
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#767676', lineHeight: 1.7, margin: '0 0 2rem' }}>
          Gerald or someone on his team will get back to you. Please allow 1–3 business days, or longer if Gerald is having a Sauce Day.
        </p>
        <a href="/" style={{
          display: 'inline-block',
          background: '#DA291C',
          color: '#ffffff',
          textDecoration: 'none',
          padding: '0.75rem 1.75rem',
          borderRadius: '999px',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>Back to Home</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff', border: '2px solid #DA291C', borderRadius: '8px', padding: '2rem' }}>
      <style>{`.contact-name-email{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}@media(max-width:600px){.contact-name-email{grid-template-columns:1fr}}`}</style>

      <div className="contact-name-email">
        <label style={labelStyle}>
          <span>Your name <span style={{ color: '#DA291C' }}>*</span></span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name is fine"
            required
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span>Email <span style={{ color: '#DA291C' }}>*</span></span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={inputStyle}
          />
        </label>
      </div>

      <label style={labelStyle}>
        Subject
        <select value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle}>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label style={labelStyle}>
        <span>Message <span style={{ color: '#DA291C' }}>*</span></span>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What's on your mind? Beef-related or otherwise."
          required
          rows={6}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </label>

      <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div ref={turnstileRef} />

      {status === 'error' && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: '#DA291C', margin: 0 }}>
          Something went wrong. Gerald is devastated. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !name.trim() || !email.trim() || !message.trim()}
        style={{
          background: '#DA291C',
          color: '#ffffff',
          border: 'none',
          borderRadius: '999px',
          padding: '0.9rem 2rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: (status === 'loading' || !name.trim() || !email.trim() || !message.trim()) ? 'not-allowed' : 'pointer',
          opacity: (status === 'loading' || !name.trim() || !email.trim() || !message.trim()) ? 0.45 : 1,
          fontFamily: "'DM Sans', sans-serif",
          alignSelf: 'flex-start',
          transition: 'opacity 0.2s',
        }}
      >
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>

    </form>
  );
}
