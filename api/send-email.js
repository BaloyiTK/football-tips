import { sendEmail } from './lib/email.js';

function authorised(req) {
  const secret = process.env.EMAIL_SEND_SECRET;
  if (!secret) return false;

  const auth = req.headers.authorization || '';
  return auth === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!authorised(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { to, subject, html, text, replyTo } = req.body || {};

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
      replyTo,
    });

    return res.status(200).json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('Email send failed:', error);

    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Email send failed',
    });
  }
}
