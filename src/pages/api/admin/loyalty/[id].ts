export const prerender = false;

import type { APIRoute } from 'astro';
import { auth } from '../../../../lib/auth';
import { db } from '../../../../lib/db';
import { loyaltyMembers, loyaltyTransactions } from '../../../../lib/schema';
import { eq } from 'drizzle-orm';

export const DELETE: APIRoute = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !session.user.email.endsWith('@mrbeefburger.com')) {
    return new Response('Forbidden', { status: 403 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.delete(loyaltyTransactions).where(eq(loyaltyTransactions.memberId, id));
  await db.delete(loyaltyMembers).where(eq(loyaltyMembers.id, id));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
