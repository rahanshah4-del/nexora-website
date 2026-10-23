/**
 * One-time setup for temp-mail browser push alerts.
 *
 *   npm run temp-mail:vapid
 *
 * Creates a VAPID (ECDSA P-256) key pair. The private key is sent straight to
 * Cloudflare as the VAPID_PRIVATE_KEY secret (it is never printed or written to
 * disk); the public key is written into workers/nexora-temp-mail/wrangler.toml.
 * Then deploy: npm run temp-mail:deploy
 *
 * Re-running would replace the key and silently end every existing subscription,
 * so it refuses unless VAPID_PUBLIC_KEY is still empty or you pass --force.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'

const CONFIG = 'workers/nexora-temp-mail/wrangler.toml'
const toml = readFileSync(CONFIG, 'utf8')
const current = /^VAPID_PUBLIC_KEY\s*=\s*"([^"]*)"/m.exec(toml)
if (!current) {
  console.error(`VAPID_PUBLIC_KEY line not found in ${CONFIG}.`)
  process.exit(1)
}
if (current[1] && !process.argv.includes('--force')) {
  console.error('A VAPID public key is already set. Replacing it ends every existing push subscription. Use --force if you really want that.')
  process.exit(1)
}

const b64url = (bytes) => Buffer.from(bytes).toString('base64url')
const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const privateJwk = JSON.stringify(await webcrypto.subtle.exportKey('jwk', pair.privateKey))
const publicKey = b64url(new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey)))

const result = spawnSync('npx', ['wrangler', 'secret', 'put', 'VAPID_PRIVATE_KEY', '--config', CONFIG], {
  input: privateJwk,
  stdio: ['pipe', 'inherit', 'inherit'],
})
if (result.status !== 0) {
  console.error('Could not store the VAPID_PRIVATE_KEY secret, so nothing was changed. Fix the error above and run it again.')
  process.exit(result.status || 1)
}

writeFileSync(CONFIG, toml.replace(/^VAPID_PUBLIC_KEY\s*=\s*"[^"]*"/m, `VAPID_PUBLIC_KEY = "${publicKey}"`))
console.log(`\nDone. Public key written to ${CONFIG}.\nNext: npm run temp-mail:deploy (then commit and push the wrangler.toml change).`)
