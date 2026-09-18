# Email sending

Football Tips runs on Next.js App Router and uses Nodemailer with standard SMTP.

Vercel stores all production secrets as Environment Variables. Nothing sensitive is committed to GitHub or exposed to the browser.

## Files

- `lib/email.js` - server-only Nodemailer SMTP module
- `app/api/send-email/route.js` - protected Next.js Route Handler
- `.env.example` - variable names only; no real secrets

## Vercel environment variables

Configure these in the `football-tips` Vercel project:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_SEND_SECRET`

Typical ports:

- `587` - STARTTLS
- `465` - TLS from connection start

The application uses Node.js runtime for the email route because Nodemailer requires normal Node networking.

## Send an email

```http
POST /api/send-email
Authorization: Bearer YOUR_EMAIL_SEND_SECRET
Content-Type: application/json
```

Example body:

```json
{
  "to": "subscriber@example.com",
  "subject": "Today's Football Tips",
  "html": "<h1>Today's Core Picks</h1><p>Your picks go here.</p>",
  "text": "Today's Core Picks"
}
```

The email module also supports multiple recipients, `cc`, `bcc`, and `replyTo`.

## Security

Do not prefix any SMTP variable with `NEXT_PUBLIC_`. Variables with that prefix are exposed to browser code.

The public subscription form must use a separate controlled server route. It must never receive SMTP credentials or `EMAIL_SEND_SECRET`.
