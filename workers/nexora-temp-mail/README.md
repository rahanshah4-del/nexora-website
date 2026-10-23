# nexora-temp-mail

Free disposable inbox for the Nexora tools page. Receive only, nothing is sent.

## One-time setup (Cloudflare dashboard + terminal)

1. **KV namespace**
   `npx wrangler kv namespace create TEMP_MAIL --config workers/nexora-temp-mail/wrangler.toml`
   Paste the printed `id` into `wrangler.toml` (replace `REPLACE_WITH_KV_NAMESPACE_ID`).
2. **Deploy the Worker**
   `npm run temp-mail:deploy`
3. **Email Routing on the subdomain** (Cloudflare dashboard, zone `nexorasolution.us`,
   Email, Email Routing):
   - Settings, Subdomains, add `mail.nexorasolution.us`. Cloudflare adds the MX and
     SPF records for that subdomain only. The root domain's own mail records are not touched.
   - Routing rules, **Catch-all address** for `mail.nexorasolution.us`: action
     "Send to a Worker", destination `nexora-temp-mail`, status Active.
4. **Test**: `curl -X POST https://nexora-temp-mail.<account>.workers.dev/api/address`,
   send a mail to the returned address from any mailbox, then
   `curl https://nexora-temp-mail.<account>.workers.dev/api/inbox/<address>`.

## How it works

- An address is a session created by `POST /api/address` (random, or a chosen name). Mail for an
  address without a live session is rejected at SMTP time.
- A session is readable for `MESSAGE_TTL_SECONDS` (3600) and can be extended `MAX_EXTENSIONS` times
  (default 1) by one period each (`POST /api/inbox/:address/extend`), never past
  `MAX_LIFETIME_SECONDS` (7200). Then the inbox is closed and wiped. Everything also carries a KV TTL up to the hard cap.
- The inbox list is one KV `list` call: each message's summary is stored as KV metadata.
- Verification codes (4-8 digits) are detected server side and returned as `code`.
- Attachments: up to 5 per message, 1 MB each and 2 MB in total, stored in their own keys. Programs,
  scripts and HTML/SVG files are listed but never kept. Downloads are always an opaque forced download.

## Abuse controls

- Optional Cloudflare Turnstile on address creation. Enforced only when BOTH
  `TURNSTILE_SECRET` (secret) and `TURNSTILE_SITE_KEY` (var, public) are set:
  `npx wrangler secret put TURNSTILE_SECRET --config workers/nexora-temp-mail/wrangler.toml`
- Per-IP limits (best effort): 5 new addresses per minute / 20 per hour, 6 extends per minute,
  3 reports per minute.
- Reserved names (admin, info, support, ...) cannot be claimed.
- `POST /api/report` stores a report (30 days). Three different inboxes reporting one sender
  domain blocks it for 24 h. Big mail providers are never auto-blocked (From can be forged).
  `BLOCKED_SENDER_DOMAINS` is a permanent list. Both check the envelope sender and the From header.
- Reports are KV keys `report:*` (read them in the dashboard or with `wrangler kv key list`).

## Limits

- 50 messages per address. Mail over 3 MB is rejected.
- Free Workers plans limit CPU time and KV operations per day. Expect to need the paid plan once the
  tool gets real traffic (every poll is a couple of KV reads).

## Adding another receiving domain

Add it to `TEMP_MAIL_DOMAINS` in `wrangler.toml`, set up Email Routing for it as in
step 3, redeploy. No code change.

## Browser push alerts and the installable app

Visitors can turn on "Enable alerts" to get a notification when mail arrives, even with the tab closed, and can install the tool as an app (its own manifest and service worker, scope `/tools/temp-mail/`).

- Web Push with VAPID. Pushes carry **no payload**: the service worker wakes up, fetches the newest message for the address the page handed it, and shows the sender, subject and any detected code. Nothing readable passes through the push service.
- Only these push services are accepted: FCM, Mozilla, Apple, Windows (`isAllowedPushEndpoint`). A failed push never loses the mail; a 404/410 drops the stale subscription.
- Subscriptions are stored as `push:<address>` and expire with the address.
- Limit: 6/min and 20/hour per IP on `/api/push`.

One-time setup (run from the repo root):

1. `npm run temp-mail:vapid` — creates the key pair, stores the private key as the `VAPID_PRIVATE_KEY` secret (never printed) and writes the public key into `wrangler.toml` as `VAPID_PUBLIC_KEY`.
2. `npm run temp-mail:deploy`
3. Commit and push the `wrangler.toml` change.

Until `VAPID_PUBLIC_KEY` is set, `/api/config` returns an empty key and the page hides the alerts button.

### Turnstile status

The widget "Nexora Temp Mail" exists in Cloudflare (hostname `nexorasolution.us`) and its public site key is in `wrangler.toml`. The captcha is enforced only after the secret is also set:

```
npx wrangler secret put TURNSTILE_SECRET --config workers/nexora-temp-mail/wrangler.toml
npm run temp-mail:deploy
```
