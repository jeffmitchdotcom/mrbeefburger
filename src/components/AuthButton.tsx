import { useState, useEffect } from 'react';
import { authClient } from '../lib/auth-client';

export default function AuthButton() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    authClient.getSession()
      .then((result) => setIsSignedIn(!!result?.data?.user))
      .catch(() => {});
  }, []);

  return (
    <a
      href="/account"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        fontWeight: 700,
        color: 'inherit',
        textDecoration: 'none',
        letterSpacing: '0.04em',
      }}
    >
      {isSignedIn ? 'Account' : 'Sign In'}
    </a>
  );
}
