import crypto from 'node:crypto';
import { Client } from '@upstash/qstash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DESTINATION =
  'https://football-tips-theta.vercel.app/api/cron/daily-email';

function authorised(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update('qstash-bootstrap-v2')
    .digest('hex');

  const supplied = new URL(request.url).searchParams.get('proof') || '';

  return (
    supplied.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  );
}

export async function GET(request) {
  if (!authorised(request)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error('Missing QSTASH_TOKEN');
    }

    const client = new Client({ token });

    const schedule = await client.schedules.create({
      destination: DESTINATION,
      scheduleId: 'football-tips-daily-email',
      cron: 'CRON_TZ=Africa/Johannesburg 0 16 * * *',
    });

    const test = await client.publishJSON({
      url: DESTINATION,
      body: { source: 'qstash-bootstrap-test' },
      retries: 3,
    });

    return Response.json({
      ok: true,
      scheduleId: schedule.scheduleId || 'football-tips-daily-email',
      messageId: test.messageId || null,
    });
  } catch (error) {
    console.error('QStash SDK setup failed:', error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'QStash setup failed',
      },
      { status: 500 }
    );
  }
}
