# nexora-sentinel

Watches the Nexora platform every 5 minutes, tries a few safe first-aid fixes,
and emails the owner (rahanshah4@gmail.com) when something stays broken.
The Control Centre > System Health tab shows it live.

## What it checks
- Website pages: home, pricing, blog, login, temp mail (HTTP 200 and the app shell present).
- API Workers: email, background jobs, passkeys, payments, AI gateway (their `/health`).
- Temp Mail service (`/api/domains`, which has no side effects).
- Firebase sign-in keys and Firestore reachability.
- Browser errors that real visitors hit on the live site.

## When you get an email
- One failed check is ignored (blips happen).
- A problem becomes an incident after 2 failures in a row (about 10 minutes), or when
  a check keeps failing on and off (6 of the last 12 runs).
- It is closed only after 2 good runs in a row, so a flapping service does not
  send you an email pair every 10 minutes.
- While it lasts you get a reminder every 6 hours, and a "recovered" email at the end.
- If an email fails to send it is retried every run for about an hour; the panel
  says when an alert has not reached you.
- Browser errors: only when the same error is reported 10+ times by 3+ visitors,
  at most 3 such emails a day. Links in visitor text are removed.
- If every check fails at once (Google included), the problem is on the monitoring
  side, so no incident is opened; you get one email after 3 such runs.
- If the Sentinel itself crashes or cannot save, it emails you at most once an hour.

## What it fixes by itself (and what it cannot)
Only for failing website pages, and only when the secrets below are set:
- **Cache purge** (at most every 30 min): clears Cloudflare's cached copies. Helps
  when a cached error or stale copy is the cause; it cannot fix broken code.
- **Site rebuild** after 3 failed runs (at most every 30 min): triggers a fresh build
  of the current code through a deploy hook. Helps after a failed deploy, not after
  a real bug in the code.

Workers, Firebase and other services cannot be restarted from outside. For those it
re-checks, records and emails you. It never reports a fix it did not make.

## One-time setup
1. KV: done (namespace id is in wrangler.toml).
2. Email: Cloudflare dashboard > Email > Email Routing > Destination addresses:
   rahanshah4@gmail.com must be **Verified**.
3. `npm run sentinel:deploy`
4. Control Centre > System Health > "Send test email".
5. Optional first aid (a fix is skipped while its secret is missing):
   - `npx wrangler secret put CF_API_TOKEN --config workers/nexora-sentinel/wrangler.toml`
     (API token with Zone > Cache Purge for nexorasolution.us)
   - `npx wrangler secret put CF_ZONE_ID --config workers/nexora-sentinel/wrangler.toml`
   - `npx wrangler secret put DEPLOY_HOOK --config workers/nexora-sentinel/wrangler.toml`
     (Workers & Pages > nexora > Settings > Builds > Deploy Hooks > create one, paste its URL)

## Limits (Cloudflare free plan)
- KV writes (1,000 a day for the whole account, shared with temp mail): while all is
  well the state is saved every 15 minutes (~100 writes a day); during trouble every
  run. Browser-error reports are batched per error and capped, so a storm cannot use
  up the quota.
- Subrequests per run stay well under 50 (13 checks plus at most a few fixes and re-checks).
- The Sentinel runs on Cloudflare: if Cloudflare itself is down it cannot email.
  Add a free external monitor (for example UptimeRobot on https://nexorasolution.us)
  as a second pair of eyes. The panel warns when no check has been saved for 25 minutes.
- Two runs at the same moment (cron plus "Check now") could announce the same
  incident twice; "Check now" is refused within a minute of the last run to make
  this unlikely.
