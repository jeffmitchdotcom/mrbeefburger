export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { loyaltyMembers, loyaltyTransactions } from '../../lib/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../../lib/email';

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

    const memberNo = String(member.id).padStart(4, '0');

    // Welcome email — non-fatal: DB write already succeeded
    sendEmail({
      to: email.toLowerCase().trim(),
      subject: `You have been entered into the Register. Member No. ${memberNo}.`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; padding: 2rem; color: #1a1a1a; line-height: 1.7;">
          <p style="font-size: 0.75rem; font-family: sans-serif; letter-spacing: 0.1em; text-transform: uppercase; color: #767676; margin: 0 0 1.5rem;">The Beefburger Loyalty Accord</p>
          <p>Your application has been processed. You have been entered into the Register.</p>
          <p style="font-family: 'Courier New', monospace; font-size: 1rem; letter-spacing: 0.08em; margin: 1.5rem 0;">Member No. ${memberNo}</p>
          <p>You are now a member of <strong>The Initiated</strong>.</p>
          <p>10 Sauce Units have been credited to your account. This reflects your completion of the Application with Honest Answers. Gerald appreciates honesty. He does not require it. He simply appreciates it.</p>
          <p>There is nothing further to do at this time. Gerald has been informed.</p>
          <p style="margin-top: 2rem;">— Mr. Beefburger</p>
          <p style="margin-top: 2rem; font-size: 0.75rem; color: #767676; font-family: sans-serif; border-top: 1px solid #e5e5e5; padding-top: 1rem;">
            Home of the Meaty Faced Sauce Burger.<br />
            <a href="https://mrbeefburger.com/loyalty" style="color: #DA291C;">mrbeefburger.com/loyalty</a>
          </p>
        </div>
      `,
      text: `The Beefburger Loyalty Accord\n\nYour application has been processed. You have been entered into the Register.\n\nMember No. ${memberNo}\n\nYou are now a member of The Initiated.\n\n10 Sauce Units have been credited to your account. This reflects your completion of the Application with Honest Answers. Gerald appreciates honesty. He does not require it. He simply appreciates it.\n\nThere is nothing further to do at this time. Gerald has been informed.\n\n— Mr. Beefburger\nmrbeefburger.com/loyalty`,
    }).catch(err => console.error('[loyalty] welcome email failed:', err));

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
