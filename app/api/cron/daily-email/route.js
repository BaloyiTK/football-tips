import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { sendEmail } from '../../../../lib/email.js';
import {
  listConfirmedSubscribers,
  markDailySent,
} from '../../../../lib/subscribers.js';
import {
  formatPercent,
  MODEL_VERSION,
  selectCorePicks,
} from '../../../../lib/value-model.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function manualAuthorised(request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
    request.headers.get('authorization') === `Bearer ${secret}`
  );
}

function sastDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildEmail(data) {
  const candidates = Array.isArray(data?.candidates)
    ? data.candidates
    : Array.isArray(data?.core)
      ? data.core
      : [];
  const selection = selectCorePicks(candidates);
  const core = selection.core;
  const date = data?.date || sastDateKey();

  const rows = core
    .map(
      (pick, index) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:700">
            ${index + 1}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb">
            <strong>${escapeHtml(pick.fixture)}</strong><br>
            <span style="color:#6b7280">${escapeHtml(pick.kickoff)}</span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb">
            ${escapeHtml(pick.market)}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:700">
            ${escapeHtml(pick.value.odds.toFixed(2))}<br>
            <span style="color:#6b7280;font-weight:400">
              Fair ${escapeHtml(pick.value.fairOdds.toFixed(2))} ·
              Edge +${escapeHtml(formatPercent(pick.value.edge))} ·
              EV +${escapeHtml(formatPercent(pick.value.expectedValue))}
            </span>
          </td>
        </tr>`
    )
    .join('');

  const textLines = core
    .map(
      (pick, index) =>
        `${index + 1}. ${pick.fixture} — ${pick.market} @ ${pick.value.odds.toFixed(2)} — ` +
        `Model ${formatPercent(pick.value.modelProbability, 0)} — Fair ${pick.value.fairOdds.toFixed(2)} — ` +
        `Edge +${formatPercent(pick.value.edge)} — EV +${formatPercent(pick.value.expectedValue)} — ${pick.kickoff}`
    )
    .join('\n');

  return {
    subject: `Football Tips — Core Picks — ${date}`,
    text:
      `Football Tips — Core Picks — ${date}\n\n` +
      (textLines || 'No Core picks were published today.') +
      '\n\nProbabilities are estimates, not guarantees. Bet responsibly.',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#111827">
        <div style="background:#08101d;color:#ffffff;padding:24px;border-radius:14px 14px 0 0">
          <div style="font-size:12px;letter-spacing:.16em;color:#79ffa8;font-weight:800">
            FOOTBALL TIPS · MODEL v${MODEL_VERSION}
          </div>
          <h1 style="margin:8px 0 0;font-size:28px">Core Picks — ${escapeHtml(date)}</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:0;padding:18px;border-radius:0 0 14px 14px">
          ${
            core.length
              ? `<table style="width:100%;border-collapse:collapse">
                  <thead>
                    <tr>
                      <th style="padding:12px;text-align:left">#</th>
                      <th style="padding:12px;text-align:left">Fixture</th>
                      <th style="padding:12px;text-align:left">Market</th>
                      <th style="padding:12px;text-align:left">Value</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>`
              : '<p>No Core picks were published today.</p>'
          }
          <p style="margin:18px 0 0;color:#6b7280;font-size:12px">
            Only selections with at least 65% model probability, +4pp no-vig edge and +5% EV are published as Core.<br>
            Probabilities are estimates, not guarantees. Bet responsibly.
          </p>
        </div>
      </div>
    `,
    corePublished: core.length,
    candidatesChecked: candidates.length,
    withheld: selection.rejected.length + selection.belowCut.length,
  };
}

async function loadPicks(request) {
  const response = await fetch(new URL('/data/today.json', request.url), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Could not load today.json: ${response.status}`);
  }

  return response.json();
}

async function runDailyEmail(request) {
  try {
    let payload = {};
    if (request.method === 'POST') {
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }
    }

    const testMode = payload?.mode === 'test';

    const [data, subscribers] = await Promise.all([
      loadPicks(request),
      listConfirmedSubscribers(),
    ]);

    const dateKey = sastDateKey();
    const email = buildEmail(data);

    if (testMode) {
      email.subject = `[TEST] ${email.subject}`;
    }

    let sent = 0;
    let skipped = 0;
    const failed = [];

    for (const subscriber of subscribers) {
      if (!testMode && subscriber.lastDailySentDate === dateKey) {
        skipped += 1;
        continue;
      }

      try {
        await sendEmail({
          to: subscriber.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });

        if (!testMode) {
          await markDailySent(subscriber.id, dateKey);
        }
        sent += 1;
      } catch (error) {
        failed.push({
          id: subscriber.id,
          error: error instanceof Error ? error.message : 'Send failed',
        });
      }
    }

    console.log('Daily Core Picks email run', {
      source: 'qstash',
      mode: testMode ? 'test' : 'daily',
      dateKey,
      subscribers: subscribers.length,
      sent,
      skipped,
      failed: failed.length,
      candidatesChecked: email.candidatesChecked,
      corePublished: email.corePublished,
      withheld: email.withheld,
    });

    return Response.json({
      ok: failed.length === 0,
      mode: testMode ? 'test' : 'daily',
      dateKey,
      subscribers: subscribers.length,
      sent,
      skipped,
      failed: failed.length,
      candidatesChecked: email.candidatesChecked,
      corePublished: email.corePublished,
      withheld: email.withheld,
    });
  } catch (error) {
    console.error('Daily email job failed:', error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Daily email job failed',
      },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(runDailyEmail);

export async function GET(request) {
  if (!manualAuthorised(request)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return runDailyEmail(request);
}
