export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyTurnstile } from '../../lib/turnstile';
import { sendEmail } from '../../lib/email';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (body?.website) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const turnstileOk = await verifyTurnstile(body?.['cf-turnstile-response']);
  if (!turnstileOk) {
    return new Response(JSON.stringify({ error: 'Verification failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body?.name || !body?.email || !body?.message) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name, email, subject, message } = body;

  try {
    await Promise.all([
      // Notification to inbox
      sendEmail({
        to: 'jeffmitchdotcom@me.com',
        subject: `New message via mrbeefburger.com — ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 2rem;">
            <h2 style="margin: 0 0 1.5rem; font-size: 1.1rem;">New contact form submission</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 0.5rem 1rem 0.5rem 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Name</td>
                <td style="padding: 0.5rem 0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 1rem 0.5rem 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Email</td>
                <td style="padding: 0.5rem 0;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 1rem 0.5rem 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Subject</td>
                <td style="padding: 0.5rem 0;">${subject}</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 1rem 0.5rem 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Message</td>
                <td style="padding: 0.5rem 0; white-space: pre-wrap;">${message}</td>
              </tr>
            </table>
          </div>
        `,
        text: `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      }),

      // Auto-reply to sender
      sendEmail({
        to: email,
        subject: 'Gerald has noted your inquiry.',
        html: `
          <div style="font-family: Georgia, serif; max-width: 560px; padding: 2rem; color: #1a1a1a; line-height: 1.7;">
            <p>Your message has been received. It has been logged. Gerald is aware.</p>
            <p>He reads all correspondence personally. He does not always respond. This is not a reflection of your message's quality. It is a reflection of Gerald's schedule, which is his own.</p>
            <p>If your matter is urgent, please reconsider whether it is actually urgent.</p>
            <p style="margin-top: 2rem;">— Mr. Beefburger</p>
            <p style="margin-top: 2rem; font-size: 0.75rem; color: #767676; font-family: sans-serif; border-top: 1px solid #e5e5e5; padding-top: 1rem;">
              Home of the Meaty Faced Sauce Burger.<br />
              <a href="https://mrbeefburger.com" style="color: #DA291C;">mrbeefburger.com</a>
            </p>
          </div>
        `,
        text: `Your message has been received. It has been logged. Gerald is aware.\n\nHe reads all correspondence personally. He does not always respond. This is not a reflection of your message's quality. It is a reflection of Gerald's schedule, which is his own.\n\nIf your matter is urgent, please reconsider whether it is actually urgent.\n\n— Mr. Beefburger\nmrbeefburger.com`,
      }),
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[contact] email send failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to send message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
