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

## Limits

- Messages live `MESSAGE_TTL_SECONDS` (default 3600), then KV deletes them.
- Mail over 512 KB is rejected, attachments are never stored (only counted).
- 50 messages per address. 10 new addresses per minute per IP (best effort).

## Adding another receiving domain

Add it to `TEMP_MAIL_DOMAINS` in `wrangler.toml`, set up Email Routing for it as in
step 3, redeploy. No code change.
