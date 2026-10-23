# nexora-sentinel

Watches the whole Nexora platform every 5 minutes, tries safe first-aid fixes,
and emails the owner (rahanshah4@gmail.com) only when something stays broken.
The Control Centre > System Health tab shows it live.

## What it checks
Website pages (home, pricing, blog, login, temp mail), the API Workers (email,
background jobs, passkeys, payments, AI gateway), the Temp Mail service,
Firebase sign-in keys and Firestore, and browser errors reported by real visitors.

## What it fixes by itself
- A failing page: purges the Cloudflare cache, checks again; if it keeps failing, triggers a fresh site build (max one per 30 min).
- Everything else (Workers, Firebase) cannot be restarted from outside, so it retries, records it, and emails you. It never claims a fix it did not make.
- One failed check is ignored (blips). A problem becomes an incident after 2 failures in a row (about 10 min), is re-emailed every 6 h, and a "recovered" email follows.

## One-time setup
1. KV: `npx wrangler kv namespace create SENTINEL --config workers/nexora-sentinel/wrangler.toml`, paste the id into wrangler.toml.
2. Email: Cloudflare dashboard > Email > Email Routing. Enable it for nexorasolution.us (already on) and make sure rahanshah4@gmail.com is a **verified destination address** (Destination addresses tab; add and confirm it if missing).
3. `npm run sentinel:deploy`
4. Optional first aid (the Worker skips a fix whose secret is missing):
   - `npx wrangler secret put CF_API_TOKEN --config workers/nexora-sentinel/wrangler.toml` (token with Zone > Cache Purge) and `CF_ZONE_ID`
   - `npx wrangler secret put PAGES_DEPLOY_HOOK --config workers/nexora-sentinel/wrangler.toml` (Pages > Settings > Deploy hooks)
5. Control Centre > System Health > "Send test email" to prove alerts arrive.

## Limits
- It runs on Cloudflare. If Cloudflare itself is down, it cannot email; add a free external monitor (for example UptimeRobot on https://nexorasolution.us) as a second pair of eyes.
- The panel warns if the Sentinel has not run for 15 minutes.
