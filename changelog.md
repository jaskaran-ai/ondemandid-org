# Changelog — Turnstile "Verifying…" fix

## Fixed

- **Turnstile widget loop:** Parent re-renders (form `watch`, etc.) no longer tear down and re-create the widget on every render; callbacks use refs.
- **Script URL:** `api.js?render=explicit` per Cloudflare guidance.
- **CSP:** Response headers allow `challenges.cloudflare.com`, `blob:`, and frames for Turnstile.
- **Preconnect:** `challenges.cloudflare.com` in root layout.

## Notes

- Console CSP errors from `content.js` are usually a **browser extension**; test in a clean profile if verification still hangs.
