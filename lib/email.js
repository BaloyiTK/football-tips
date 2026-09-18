import nodemailer from 'nodemailer';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT || 587);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a valid port number.');
  }

  return nodemailer.createTransport({
    host: required('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: {
      user: required('SMTP_USER'),
      pass: required('SMTP_PASS'),
    },
  });
}

function normaliseRecipient(recipient) {
  if (typeof recipient === 'string') return recipient;

  if (recipient && typeof recipient === 'object' && recipient.email) {
    return recipient.name
      ? `"${recipient.name.replaceAll('"', '')}" <${recipient.email}>`
      : recipient.email;
  }

  throw new Error('Each recipient must be an email string or { email, name }.');
}

function normaliseRecipients(value) {
  const recipients = Array.isArray(value) ? value : [value];

  if (recipients.length === 0) {
    throw new Error('At least one recipient is required.');
  }

  return recipients.map(normaliseRecipient);
}

export async function verifyEmailTransport() {
  return createTransporter().verify();
}

export async function sendEmail({ to, subject, html, text, replyTo, cc, bcc }) {
  if (!to) throw new Error('Recipient is required.');
  if (!subject) throw new Error('Subject is required.');
  if (!html && !text) throw new Error('Email content is required.');

  const info = await createTransporter().sendMail({
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Football Tips',
      address: required('EMAIL_FROM'),
    },
    to: normaliseRecipients(to),
    ...(cc ? { cc: normaliseRecipients(cc) } : {}),
    ...(bcc ? { bcc: normaliseRecipients(bcc) } : {}),
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo ? { replyTo } : {}),
  });

  return {
    provider: 'smtp',
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
  };
}
