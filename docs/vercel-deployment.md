# Vercel Deployment Guide

## Quick Deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add environment variables (see below)
4. Deploy!

## Environment Variables

### Required

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (SECRET) | Supabase → Settings → API |
| `NEXT_PUBLIC_APP_URL` | Your app URL | Vercel will set this |
| `NEXT_PUBLIC_APP_NAME` | App display name | Your choice |
| `NEXT_PUBLIC_APP_ENV` | `production` | Set to `production` |

### Optional (if using)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (SECRET) |
| `SENTRY_ORG` | Sentry organization |
| `SENTRY_PROJECT` | Sentry project |
| `RESEND_API_KEY` | Resend API key for emails |

## Project Settings

- **Framework Preset**: Next.js
- **Build Command**: `pnpm build`
- **Output Directory**: `.next` (default)
- **Install Command**: `pnpm install`

## Environment: Development vs Production

For local development, use `.env.local`:

```
NEXT_PUBLIC_APP_ENV=development
```

For Vercel production environment:

```
NEXT_PUBLIC_APP_ENV=production
```

## Troubleshooting

### Build fails

- Ensure all dependencies are in `package.json`
- Check that `pnpm` is specified as package manager in Vercel

### RLS issues in production

- Verify RLS policies are applied: `supabase db push`
- Check Supabase project has correct environment variables

### Images/fonts not loading

- Ensure `NEXT_PUBLIC_APP_URL` matches your Vercel deployment URL
- Check for mixed content (http vs https)