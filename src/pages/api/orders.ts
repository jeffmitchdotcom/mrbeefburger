export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { orders, loyaltyMembers, loyaltyTransactions } from '../../lib/schema';
import { eq, sum } from 'drizzle-orm';

function tierForBalance(balance: number): string {
  if (balance >= 1000) return 'The Beefborn';
  if (balance >= 500) return 'The Consecrated';
  if (balance >= 200) return 'The Committed';
  return 'The Initiated';
}
import { nanoid } from 'nanoid';
import { sendEmail } from '../../lib/email';

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
      customerEmail,
      orderType,
      locationSlug,
      locationName,
      locationAddress,
      pickupTime,
      specialRequests,
      items,
    } = body;

    if (!customerName || !customerEmail || !orderType || !locationSlug || !pickupTime || !items?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = customerEmail.trim().toLowerCase();
    const orderNumber = `MRB-${nanoid(6).toUpperCase()}`;
    const waitPhrase = waitPhrases[Math.floor(Math.random() * waitPhrases.length)];
    const total: number = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);

    await db.insert(orders).values({
      orderNumber,
      customerName,
      customerEmail: normalizedEmail,
      orderType,
      locationSlug,
      locationName,
      locationAddress,
      pickupTime,
      specialRequests: specialRequests || '',
      items,
      waitPhrase,
    });

    // Credit Sauce Units if email matches a loyalty member
    const suToCredit = Math.floor(total);
    let suAwarded = 0;
    let suNewBalance: number | null = null;

    if (suToCredit > 0) {
      try {
        const [member] = await db.select({ id: loyaltyMembers.id })
          .from(loyaltyMembers)
          .where(eq(loyaltyMembers.email, normalizedEmail))
          .limit(1);
        if (member) {
          await db.insert(loyaltyTransactions).values({
            memberId: member.id,
            action: 'order_purchase',
            description: `Order ${orderNumber} — ${suToCredit} Sauce Units`,
            sauceUnits: suToCredit,
            referenceId: orderNumber,
          });
          suAwarded = suToCredit;
          const [balRow] = await db
            .select({ total: sum(loyaltyTransactions.sauceUnits) })
            .from(loyaltyTransactions)
            .where(eq(loyaltyTransactions.memberId, member.id));
          suNewBalance = Number(balRow?.total ?? 0);
          const newTier = tierForBalance(suNewBalance);
          await db
            .update(loyaltyMembers)
            .set({ tier: newTier })
            .where(eq(loyaltyMembers.id, member.id));
        }
      } catch (err) {
        console.error('SU credit failed:', err);
      }
    }

    // Send order confirmation email — non-fatal
    const itemRows = (items as { title: string; quantity: number; price: number; customizations?: string[] }[])
      .map((item) => {
        const customLine = item.customizations?.length
          ? `<div style="font-size:0.8rem;color:#767676;margin-top:2px">${item.customizations.join(', ')}</div>`
          : '';
        return `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #f0ece6">
            ${item.title} × ${item.quantity}${customLine}
          </td>
          <td style="padding:6px 0;border-bottom:1px solid #f0ece6;text-align:right;font-weight:600">
            $${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>`;
      })
      .join('');

    sendEmail({
      to: normalizedEmail,
      subject: `Your order has been received. Gerald is aware. — ${orderNumber}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;color:#1a1a1a">
          <h1 style="font-family:'Bricolage Grotesque',Georgia,serif;font-size:1.5rem;color:#DA291C;margin:0 0 0.25rem">
            Mr. Beefburger
          </h1>
          <p style="font-size:0.8rem;color:#767676;margin:0 0 2rem;letter-spacing:0.08em;text-transform:uppercase">
            Order Confirmation
          </p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
            <tr><td style="color:#767676;font-size:0.85rem;padding:4px 0">Order No.</td>
                <td style="font-weight:700;text-align:right;padding:4px 0">${orderNumber}</td></tr>
            <tr><td style="color:#767676;font-size:0.85rem;padding:4px 0">Name</td>
                <td style="text-align:right;padding:4px 0">${customerName}</td></tr>
            <tr><td style="color:#767676;font-size:0.85rem;padding:4px 0">Location</td>
                <td style="text-align:right;padding:4px 0">${locationName}</td></tr>
            <tr><td style="color:#767676;font-size:0.85rem;padding:4px 0">Type</td>
                <td style="text-align:right;padding:4px 0">${orderType === 'dine-in' ? 'Dine-In' : 'Pickup'}</td></tr>
            <tr><td style="color:#767676;font-size:0.85rem;padding:4px 0">Time</td>
                <td style="text-align:right;padding:4px 0">${pickupTime}</td></tr>
          </table>

          <table style="width:100%;border-collapse:collapse;margin-bottom:1rem">
            ${itemRows}
            <tr>
              <td style="padding:10px 0 0;font-weight:700">Total</td>
              <td style="padding:10px 0 0;font-weight:700;text-align:right;color:#DA291C;font-size:1.1rem">
                $${total.toFixed(2)}
              </td>
            </tr>
            ${suAwarded > 0 && suNewBalance !== null ? `
            <tr>
              <td style="padding:8px 0 2px;color:#767676;font-size:0.85rem">Sauce Units earned</td>
              <td style="padding:8px 0 2px;text-align:right;font-weight:700;color:#b8920a">+${suAwarded} SU</td>
            </tr>
            <tr>
              <td style="padding:2px 0;color:#767676;font-size:0.85rem">Accord balance</td>
              <td style="padding:2px 0;text-align:right;font-weight:700;color:#b8920a">${suNewBalance} SU total</td>
            </tr>
            ` : ''}
          </table>

          <p style="font-size:0.875rem;color:#767676;border-top:1px solid #f0ece6;padding-top:1.5rem;line-height:1.7;margin:0">
            Gerald does not send reminders. He does not send updates. This email is the update.
            Plan accordingly.
          </p>
          <p style="font-size:0.875rem;color:#767676;margin:1rem 0 0">— Mr. Beefburger</p>
        </div>
      `,
      text: `Mr. Beefburger — Order Confirmation\n\nOrder No.: ${orderNumber}\nName: ${customerName}\nLocation: ${locationName}\nType: ${orderType}\nTime: ${pickupTime}\n\nItems:\n${(items as { title: string; quantity: number; price: number }[]).map((i) => `  ${i.title} × ${i.quantity}  $${(i.price * i.quantity).toFixed(2)}`).join('\n')}\n\nTotal: $${total.toFixed(2)}${suAwarded > 0 && suNewBalance !== null ? `\nSauce Units earned: +${suAwarded} SU\nAccord balance: ${suNewBalance} SU total` : ''}\n\nGerald does not send reminders. He does not send updates. This email is the update. Plan accordingly.\n\n— Mr. Beefburger`,
    }).catch((err) => console.error('Order confirmation email failed:', err));

    return new Response(JSON.stringify({ orderNumber, sauceUnitsAwarded: suAwarded }), {
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
