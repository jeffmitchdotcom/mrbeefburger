export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { loyaltyMembers, loyaltyTransactions } from '../../lib/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, city, preferredBurger, beefRelationship, wellDone } = body;

    if (!name || !email || !city || !preferredBurger || !beefRelationship || !wellDone) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await db.select({ id: loyaltyMembers.id }).from(loyaltyMembers).where(eq(loyaltyMembers.email, email.toLowerCase().trim()));
    if (existing.length > 0) {
      return new Response(JSON.stringify({
        error: 'duplicate',
        message: 'You are already enrolled in the Accord. Gerald has your record. Attempting to join twice does not earn additional Sauce Units. Gerald checked.',
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [member] = await db.insert(loyaltyMembers).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      city: city.trim(),
      preferredBurger,
      beefRelationship: beefRelationship.trim(),
      wellDone,
      tier: 'The Initiated',
    }).returning({ id: loyaltyMembers.id });

    await db.insert(loyaltyTransactions).values({
      memberId: member.id,
      action: 'application_signup',
      description: 'Completed the Application with Honest Answers',
      sauceUnits: 10,
    });

    return new Response(JSON.stringify({ ok: true, sauceUnits: 10, memberId: member.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Submission failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
