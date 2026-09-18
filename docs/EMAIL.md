# Email sending

Football Tips uses Nodemailer with standard SMTP.

This keeps the application independent from a specific email API provider. To move to another SMTP host later, change the Vercel environment variables instead of rewriting the email code.

## Files

- `api/lib/email.js` - reusable Nodemailer SMTP module
- `api/send-email.js` - protected Vercel API endpoint
- `.env.example` - required environment variables

## Vercel environment variables

Add these variables to the `football-tips` Vercel project:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_SEND_SECRET`

Typical SMTP ports:

- `587` - STARTTLS
- `465` - TLS from connection start

The application automatically uses secure mode when `SMTP_PORT=465`.

## Send an email

Request:

```http
POST /api/send-email
Authorization: Bearer YOUR_EMAIL_SEND_SECRET
Content-Type: application/json
```

Body:

```json
{
  "to": "subscriber@example.com",
  "subject": "Today's Football Tips",
  "html": "<h1>Today's Core Picks</h1><p>Your picks go here.</p>",
  "text": "Today's Core Picks"
}
```

Multiple recipients are also supported:

```json
{
  "to": [
    { "email": "one@example.com", "name": "Subscriber One" },
    { "email": "two@example.com", "name": "Subscriber Two" }
  ],
  "subject": "Today's Football Tips",
  "html": "<h1>Today's Core Picks</h1>"
}
```

The reusable email module also supports `cc`, `bcc`, and `replyTo`.

## Security

Never put SMTP credentials or `EMAIL_SEND_SECRET` in frontend code.

The React subscribe form must not call an SMTP server directly. Browser requests should go through controlled server-side endpoints.

For newsletter delivery, subscriber addresses should normally be sent using `bcc` or processed in batches so subscribers cannot see one another's addresses.
