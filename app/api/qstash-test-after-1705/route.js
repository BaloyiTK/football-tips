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
    .update('qstash-test-after-1705-v1')
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

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    return Response.json({ ok: false, error: 'Missing QSTASH_TOKEN' }, { status: 500 });
  }

  const client = new Client({ token });
  const result = await client.publishJSON({
    url: DESTINATION,
    body: { mode: 'test', source: 'post-1705-fix-test' },
    retries: 3,
  });

  return Response.json({
    ok: true,
    messageId: result.messageId || null,
  });
}
