import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DESTINATION =
  'https://football-tips-theta.vercel.app/api/cron/daily-email';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function authorised(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update('qstash-bootstrap-v1')
    .digest('hex');

  const supplied = new URL(request.url).searchParams.get('proof') || '';

  return (
    supplied.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  );
}

async function qstash(path, headers = {}) {
  const base = required('QSTASH_URL').replace(/\/$/, '');
  const token = required('QSTASH_TOKEN');

  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: '{}',
    cache: 'no-store',
  });

  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `QStash ${response.status}: ${body?.error || body?.raw || 'request failed'}`
    );
  }

  return body;
}

export async function GET(request) {
  if (!authorised(request)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const encoded = encodeURIComponent(DESTINATION);

    const schedule = await qstash(`/v2/schedules/${encoded}`, {
      'Upstash-Cron': 'CRON_TZ=Africa/Johannesburg 0 16 * * *',
      'Upstash-Schedule-Id': 'football-tips-daily-email',
      'Upstash-Method': 'POST',
      'Upstash-Retries': '3',
    });

    const test = await qstash(`/v2/publish/${encoded}`, {
      'Upstash-Method': 'POST',
      'Upstash-Retries': '3',
    });

    return Response.json({
      ok: true,
      scheduleId: schedule.scheduleId || 'football-tips-daily-email',
      messageId: test.messageId || null,
    });
  } catch (error) {
    console.error('QStash setup failed:', error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'QStash setup failed',
      },
      { status: 500 }
    );
  }
}
