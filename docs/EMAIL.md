# Email sending

The project sends email through a provider-isolated serverless module.

## Files

- `api/lib/email.js` - email provider adapter (currently Brevo)
- `api/send-email.js` - protected Vercel API endpoint
- `.env.example` - required environment variables

## Vercel environment variables

Add these to the `football-tips` Vercel project:

- `BREVO_API_KEY`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_SEND_SECRET`

`EMAIL_FROM` must be a sender/domain verified by Brevo.

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

The endpoint also accepts multiple recipients:

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

## Security

Do not expose `BREVO_API_KEY` or `EMAIL_SEND_SECRET` in frontend code. They belong only in Vercel environment variables.

The public subscribe form should never call Brevo directly. A separate subscription endpoint/database layer will be added for subscriber management.
