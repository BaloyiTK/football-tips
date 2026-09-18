import { sendEmail } from '../../../lib/email.js';
import {
  checkSubscriberStorage,
  confirmSubscriber,
  createPendingSubscriber,
} from '../../../lib/subscribers.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  if (id || token) {
    try {
      const result = await confirmSubscriber(id, token);
      const redirectUrl = new URL('/', request.url);

      redirectUrl.searchParams.set(
        'subscription',
        result.ok ? 'confirmed' : 'invalid'
      );
      redirectUrl.hash = 'subscribe';

      return Response.redirect(redirectUrl, 303);
    } catch (error) {
      console.error('Subscription confirmation failed:', error);

      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('subscription', 'error');
      redirectUrl.hash = 'subscribe';

      return Response.redirect(redirectUrl, 303);
    }
  }

  try {
    await checkSubscriberStorage();
    return Response.json({ ok: true, storage: 'ready' });
  } catch (error) {
    console.error('Subscriber storage check failed:', error);
    return Response.json(
      { ok: false, storage: 'not_configured' },
      { status: 503 }
    );
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) {
    return Response.json({ ok: false, error: 'Invalid origin.' }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body?.website) {
      return Response.json({ ok: true, status: 'pending' });
    }

    if (body?.consent !== true) {
      return Response.json(
        { ok: false, error: 'Please agree to receive the daily email.' },
        { status: 400 }
      );
    }

    const subscriber = await createPendingSubscriber(body?.email);

    if (!subscriber.created) {
      if (subscriber.status === 'confirmed') {
        return Response.json({
          ok: true,
          status: 'already_subscribed',
          message: 'This email is already subscribed.',
        });
      }

      return Response.json({
        ok: true,
        status: 'pending',
        message: 'Check your inbox for the confirmation email.',
      });
    }

    const confirmUrl = new URL('/api/subscribe', request.url);
    confirmUrl.searchParams.set('id', subscriber.id);
    confirmUrl.searchParams.set('token', subscriber.confirmationToken);

    await sendEmail({
      to: subscriber.email,
      subject: 'Confirm your Football Tips subscription',
      text:
        'Confirm your Football Tips subscription by opening this link: ' +
        confirmUrl.toString(),
      html:
        '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">' +
        '<h2>Confirm your Football Tips subscription</h2>' +
        '<p>You asked to receive the daily Core picks.</p>' +
        '<p><a href="' + confirmUrl.toString() + '" ' +
        'style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px">' +
        'Confirm subscription</a></p>' +
        '<p>If you did not request this, you can ignore this email.</p>' +
        '</div>',
    });

    return Response.json({
      ok: true,
      status: 'pending',
      message: 'Check your inbox and confirm your subscription.',
    });
  } catch (error) {
    console.error('Subscription failed:', error);

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Could not create the subscription.',
      },
      { status: 500 }
    );
  }
}
