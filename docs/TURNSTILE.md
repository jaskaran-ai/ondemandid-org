# Cloudflare Turnstile (signup CAPTCHA)

Signup uses Turnstile when `CAPTCHA_PROVIDER=turnstile` (default). Flow:

1. **Client:** `components/ui/turnstile.tsx` loads `https://challenges.cloudflare.com/turnstile/v0/api.js` and renders the widget on `/signup`.
2. **Submit:** Token is sent as `captchaToken` in `POST /api/signup`.
3. **Server:** `lib/captcha/turnstile.ts` validates via [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) (`POST https://challenges.cloudflare.com/turnstile/v0/siteverify`).

## Environment variables

| Variable | Scope | Purpose |
|----------|--------|---------|
| `CAPTCHA_PROVIDER` | Server | `turnstile` (default) or `recaptcha` |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | Client | Must match provider |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client | Widget site key |
| `TURNSTILE_SECRET_KEY` | Server | Siteverify secret |

If the **secret** is set, signup **requires** a valid token. If only the site key is set, the widget shows but the server does not enforce (warn in logs).

## Create a production widget

1. [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → **Add widget**.
2. **Widget mode:** Managed (recommended).
3. **Domains:** add at least:
   - `register.ondemandid.com`
   - `localhost` (local dev)
4. Copy **Site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
5. Copy **Secret key** → `TURNSTILE_SECRET_KEY` (Vercel: mark as sensitive)

Or create via API ([widget management](https://developers.cloudflare.com/turnstile/get-started/widget-management/api/)):

```bash
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/challenges/widgets" \
  --request POST \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --json '{
    "domains": ["register.ondemandid.com", "localhost"],
    "mode": "managed",
    "name": "iVALT OnDemand ID Signup"
  }'
```

Token needs **Turnstile Sites Write** on the account.

## Local / CI testing keys

Cloudflare [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) (always pass, any hostname):

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

**Do not use test keys on production Vercel** — use real widget keys tied to `register.ondemandid.com`.

## Vercel

```bash
npx vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY production
npx vercel env add TURNSTILE_SECRET_KEY production
```

Redeploy after adding env vars (public keys are inlined at build time).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Widget blank | Site key missing or wrong domain on widget |
| "Security verification required" | Secret set but no token — complete widget |
| "Security verification failed" | Secret/site key mismatch or expired token; check server logs for `error-codes` |
| Works locally, fails on prod | Production widget must list `register.ondemandid.com` |
| Stuck on "Verifying…" | Browser extension CSP (`content.js`) blocking `blob:` scripts — try incognito or disable extensions; confirm widget hostname in Cloudflare |
