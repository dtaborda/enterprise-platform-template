# Resend Email Integration

## Quick Start

1. Go to [resend.com](https://resend.com) and sign up
2. Create an API key
3. Verify your domain (recommended for production)

## Environment Variables

```bash
# Required
RESEND_API_KEY=re_123456789

# Optional (defaults to noreply@resend.dev in dev)
EMAIL_FROM=noreply@yourdomain.com
```

## Basic Usage

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.EMAIL_FROM || "onboarding@resend.dev",
  to: "user@example.com",
  subject: "Welcome!",
  html: "<p>Welcome to our app!</p>",
});
```

## Transactional Email Patterns

### Welcome Email

```typescript
export async function sendWelcomeEmail(email: string, name: string) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Welcome to {{APP_NAME}}",
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thanks for joining us.</p>
    `,
  });
}
```

### Password Reset

```typescript
export async function sendPasswordReset(email: string, token: string) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your password",
    html: `
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}">
        Reset Password
      </a>
    `,
  });
}
```

## Testing

In development, emails are logged to console. In production:
- Check Resend dashboard for sent emails
- Use [Resend test mode](https://resend.com/docs/test-mode) for testing

## Best Practices

1. **Verify sender domain** - Required for production deliverability
2. **Use templates** - For consistent branding
3. **Track engagement** - Monitor open/click rates
4. **Handle bounces** - Listen to webhook events