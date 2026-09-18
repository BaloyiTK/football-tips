import { verifyEmailTransport } from '../../../lib/email.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await verifyEmailTransport();
    return Response.json({ ok: true, smtp: 'ready' });
  } catch (error) {
    console.error('SMTP verification failed:', error);
    return Response.json(
      {
        ok: false,
        smtp: 'error',
        error: error instanceof Error ? error.message : 'SMTP verification failed',
      },
      { status: 500 }
    );
  }
}
