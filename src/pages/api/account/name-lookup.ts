export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { loyaltyMembers, orders } from '../../../lib/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get('email')?.trim().toLowerCase();
  if (!email) {
    return new Response(JSON.stringify({ name: null }), { status: 200 });
  }

  // Check loyalty_members first
  const [member] = await db
    .select({ name: loyaltyMembers.name })
    .from(loyaltyMembers)
    .where(eq(loyaltyMembers.email, email))
    .limit(1);
  if (member?.name) {
    return new Response(JSON.stringify({ name: member.name }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fall back to most recent order
  const [order] = await db
    .select({ name: orders.customerName })
    .from(orders)
    .where(eq(orders.customerEmail, email))
    .orderBy(desc(orders.createdAt))
    .limit(1);

  return new Response(JSON.stringify({ name: order?.name ?? null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
