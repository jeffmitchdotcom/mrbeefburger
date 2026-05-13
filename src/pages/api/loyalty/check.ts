export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { loyaltyMembers } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get('email')?.trim().toLowerCase();
  if (!email) {
    return new Response(JSON.stringify({ isMember: false }), { status: 200 });
  }
  const [member] = await db
    .select({ id: loyaltyMembers.id })
    .from(loyaltyMembers)
    .where(eq(loyaltyMembers.email, email))
    .limit(1);
  return new Response(JSON.stringify({ isMember: !!member }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
