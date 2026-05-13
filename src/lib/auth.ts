import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { db } from './db';
import { authUser, authSession, authAccount, authVerification } from './schema';
import { sendEmail } from './email';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  secret: import.meta.env.BETTER_AUTH_SECRET,
  baseURL: import.meta.env.BETTER_AUTH_URL,
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendEmail({
          to: email,
          subject: 'Gerald requires verification.',
          html: `
            <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:2rem;color:#1a1a1a">
              <p style="font-size:1rem;margin:0 0 1.5rem">Your verification code is:</p>
              <p style="font-size:2.75rem;font-weight:bold;letter-spacing:0.25em;color:#DA291C;margin:0 0 1.5rem">${otp}</p>
              <p style="font-size:0.875rem;color:#767676;margin:0">
                This code expires in 10 minutes. Gerald does not issue extensions.
              </p>
            </div>
          `,
          text: `Your Mr. Beefburger verification code is: ${otp}\n\nExpires in 10 minutes. Gerald does not issue extensions.`,
        });
      },
      expiresIn: 600,
    }),
  ],
});
