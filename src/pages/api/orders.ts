export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { orders } from '../../lib/schema';
import { nanoid } from 'nanoid';

const waitPhrases = [
  'Heat death of the universe',
  'When pigs fly (first class)',
  'Shortly after never',
  'Ask your grandchildren',
  'Once the sun becomes a red giant',
  'In a timeline where this restaurant is real',
  'Approximately forever',
  'When we figure out time travel',
  'Right after we open (we never open)',
  'Three to five business eternities',
  'After your next reincarnation settles in',
  'Whenever the vibes align',
];

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      customerName,
      orderType,
      locationSlug,
      locationName,
      locationAddress,
      pickupTime,
      specialRequests,
      items,
    } = body;

    if (!customerName || !orderType || !locationSlug || !pickupTime || !items?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderNumber = `MRB-${nanoid(6).toUpperCase()}`;
    const waitPhrase = waitPhrases[Math.floor(Math.random() * waitPhrases.length)];

    await db.insert(orders).values({
      orderNumber,
      customerName,
      orderType,
      locationSlug,
      locationName,
      locationAddress,
      pickupTime,
      specialRequests: specialRequests || '',
      items,
      waitPhrase,
    });

    // TODO: sendEmail(orderConfirmation) — wire up when order confirmation emails are scoped

    return new Response(JSON.stringify({ orderNumber }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Order failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
