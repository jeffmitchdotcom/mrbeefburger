import { useState, useEffect } from 'react';
import { authClient } from '../lib/auth-client';

const iconStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-red, #DA291C)',
  textDecoration: 'none',
  padding: '4px',
  borderRadius: '4px',
  transition: 'color 0.2s, opacity 0.2s',
};

function SignInIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-3.8 3.6-7 8-7s8 3.2 8 7"/>
    </svg>
  );
}

export default function AuthButton() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    authClient.getSession()
      .then((result) => setIsSignedIn(!!result?.data?.user))
      .catch(() => setIsSignedIn(false));
  }, []);

  if (isSignedIn === null) return <div style={{ width: 30, height: 30 }} />;

  return (
    <a
      href="/account"
      style={iconStyle}
      aria-label={isSignedIn ? 'My Account' : 'Sign In'}
      title={isSignedIn ? 'My Account' : 'Sign In'}
    >
      {isSignedIn ? <UserIcon /> : <SignInIcon />}
    </a>
  );
}
