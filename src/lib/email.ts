import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: import.meta.env.AWS_REGION ?? 'us-east-2',
  credentials: {
    accessKeyId: import.meta.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.AWS_SECRET_ACCESS_KEY,
  },
});

const FROM = 'Mr. Beefburger <noreply@mrbeefburger.com>';

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}) {
  const toAddresses = Array.isArray(to) ? to : [to];
  await ses.send(
    new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: toAddresses },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: html },
          Text: { Data: text },
        },
      },
    })
  );
}
