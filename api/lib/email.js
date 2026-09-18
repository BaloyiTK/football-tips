const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function normaliseRecipients(to) {
  const list = Array.isArray(to) ? to : [to];

  return list.map((recipient) => {
    if (typeof recipient === 'string') return { email: recipient };

    if (recipient && typeof recipient === 'object' && recipient.email) {
      return {
        email: recipient.email,
        ...(recipient.name ? { name: recipient.name } : {}),
      };
    }

    throw new Error('Each recipient must be an email string or { email, name }.');
  });
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!to) throw new Error('Recipient is required.');
  if (!subject) throw new Error('Subject is required.');
  if (!html && !text) throw new Error('Email content is required.');

  const apiKey = required('BREVO_API_KEY');
  const senderEmail = required('EMAIL_FROM');
  const senderName = process.env.EMAIL_FROM_NAME || 'Football Tips';

  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: normaliseRecipients(to),
      subject,
      ...(html ? { htmlContent: html } : {}),
      ...(text ? { textContent: text } : {}),
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.message || `Brevo request failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    provider: 'brevo',
    messageId: body.messageId || null,
  };
}
