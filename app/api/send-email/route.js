import { sendEmail } from '../../../lib/email.js';

export const runtime = 'nodejs';

function authorised(request) {
  const secret = process.env.EMAIL_SEND_SECRET;
  if (!secret) return false;

  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(request) {
  if (!authorised(request)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to, subject, html, text, replyTo, cc, bcc } = body || {};

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
      replyTo,
      cc,
      bcc,
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('Email send failed:', error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      },
      { status: 500 }
    );
  }
}
