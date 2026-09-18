import { Client } from '@upstash/qstash';

const SCHEDULE_ID = 'football-tips-daily-email';
const DESTINATION =
  'https://football-tips-theta.vercel.app/api/cron/daily-email';
const CRON = 'CRON_TZ=Africa/Johannesburg 35 18 * * *';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping QStash schedule configuration outside production.');
  process.exit(0);
}

const token = process.env.QSTASH_TOKEN;

if (!token) {
  throw new Error(
    'QSTASH_TOKEN is required in the Vercel Production environment.'
  );
}

const client = new Client({ token });

const schedule = await client.schedules.create({
  destination: DESTINATION,
  scheduleId: SCHEDULE_ID,
  cron: CRON,
  retries: 3,
});

console.log('QStash daily email schedule configured', {
  scheduleId: schedule.scheduleId || SCHEDULE_ID,
  cron: CRON,
  destination: DESTINATION,
});
