export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev fallback: skip verification when key not set

  if (!token) return false;

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  });

  const data = await res.json() as { success: boolean };
  return data.success === true;
}
