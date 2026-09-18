import crypto from 'node:crypto';
import { get, list, put } from '@vercel/blob';

const PREFIX = 'subscribers/';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();

  if (
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('Please enter a valid email address.');
  }

  return email;
}

function recordPath(id) {
  return `${PREFIX}${id}.json`;
}

async function readSubscriberById(id) {
  const result = await get(recordPath(id), {
    access: 'private',
    useCache: false,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

export async function createPendingSubscriber(emailValue) {
  const email = normalizeEmail(emailValue);
  const id = sha256(email);
  const existing = await readSubscriberById(id);

  if (existing) {
    return {
      created: false,
      id,
      email,
      status: existing.status || 'pending',
    };
  }

  const confirmationToken = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();

  const record = {
    id,
    email,
    status: 'pending',
    consent: true,
    consentVersion: 'daily-core-picks-v1',
    consentAt: now,
    createdAt: now,
    confirmedAt: null,
    tokenHash: sha256(confirmationToken),
  };

  await put(recordPath(id), JSON.stringify(record), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: 'application/json',
  });

  return {
    created: true,
    id,
    email,
    status: 'pending',
    confirmationToken,
  };
}

export async function confirmSubscriber(id, token) {
  if (!/^[a-f0-9]{64}$/.test(String(id || ''))) {
    return { ok: false, reason: 'invalid' };
  }

  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) {
    return { ok: false, reason: 'invalid' };
  }

  const record = await readSubscriberById(id);

  if (!record) {
    return { ok: false, reason: 'not_found' };
  }

  if (record.status === 'confirmed') {
    return { ok: true, alreadyConfirmed: true, email: record.email };
  }

  if (record.tokenHash !== sha256(token)) {
    return { ok: false, reason: 'invalid' };
  }

  const updated = {
    ...record,
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
    tokenHash: null,
  };

  await put(recordPath(id), JSON.stringify(updated), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });

  return { ok: true, alreadyConfirmed: false, email: record.email };
}

export async function checkSubscriberStorage() {
  await list({ prefix: PREFIX, limit: 1 });
  return true;
}
