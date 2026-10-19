/**
 * Finds likely competitors for the order wizard. The Nexora AI gateway names well-known rivals for the
 * client's kind of business; every name is then checked by really reading that website (name, logo,
 * description), so an invented or dead domain never reaches the client. Pure helpers plus two thin
 * network functions that take their dependencies as arguments, so they run in plain Node tests.
 */

const AI_GATEWAY_URL = String(import.meta.env?.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev').replace(/\/$/, '')
export const SUGGEST_LIMIT = 6
const bare = (host) => String(host || '').toLowerCase().replace(/^www\./, '')

export function buildCompetitorPrompt(profile, { exclude = [] } = {}) {
  const host = bare(profile?.host)
  const lines = [
    'You are a market analyst. Below is a business website.',
    `Name: ${String(profile?.title || host).slice(0, 120)}`,
    `Domain: ${host}`,
    profile?.description ? `About: ${String(profile.description).slice(0, 400)}` : '',
    '',
    'List up to 10 REAL direct competitors: businesses that sell the same kind of product or service to the same kind of customer, in the same country or region when the domain or text shows one (otherwise the best-known global rivals).',
    'Only include websites you are sure exist. Use each competitor\'s main website domain.',
    exclude.length ? `Do not include: ${exclude.slice(0, 20).join(', ')}.` : '',
    'Answer with ONLY a JSON array of bare domains, for example ["one.com","two.io"]. No other text.',
  ]
  return lines.filter((l) => l !== '').join('\n')
}

/** Pulls domains out of the model's answer, whatever wrapper it put around the array. Own site, duplicates and junk are dropped. */
export function parseCompetitorDomains(text, ownHost = '', limit = 10) {
  const own = bare(ownHost)
  const raw = String(text || '')
  let list = []
  const match = raw.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) list = parsed.map((item) => (typeof item === 'string' ? item : item?.domain || item?.url || ''))
    } catch { /* fall through to the line scan below */ }
  }
  if (!list.length) list = raw.split(/[\s,;]+/)
  const seen = new Set()
  const out = []
  for (const item of list) {
    const host = bare(String(item || '').trim().replace(/^https?:\/\//i, '').split(/[/?#\s"']/)[0])
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) continue
    if (host === own || host.endsWith(`.${own}`) || own.endsWith(`.${host}`) || seen.has(host)) continue
    seen.add(host)
    out.push(host)
    if (out.length >= limit) break
  }
  return out
}

const faviconFor = (domain) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`

async function askOnce(profile, { signal, exclude, fetchImpl, purpose }) {
  const res = await fetchImpl(`${AI_GATEWAY_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // enough room for models that think before they answer; a short cap came back empty
    body: JSON.stringify({ messages: [{ role: 'user', content: buildCompetitorPrompt(profile, { exclude }) }], maxTokens: 1500, ...(purpose ? { purpose } : {}) }),
    signal,
  })
  if (!res.ok) throw new Error(`gateway ${res.status}`)
  const data = await res.json()
  return parseCompetitorDomains(data?.text, profile?.host)
}

/**
 * Asks the gateway for competitor domains. The first try skips the Nexora assistant persona (purpose
 * "translation" is the gateway's switch for that); if that gives nothing usable, one more try in normal mode.
 * Returns { domains, failed } where failed is true only when the gateway itself could not be reached.
 */
export async function askGatewayForCompetitors(profile, { signal, exclude = [], fetchImpl = fetch } = {}) {
  let failed = false
  for (const purpose of ['translation', '']) {
    try {
      const domains = await askOnce(profile, { signal, exclude, fetchImpl, purpose })
      if (domains.length) return { domains, failed: false }
      failed = false
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      failed = true
    }
  }
  return { domains: [], failed }
}

/** Reads up to `want` of the named websites, a few at a time, keeping only the ones that really load. */
export async function verifyCompetitors(domains, { lookup, want = SUGGEST_LIMIT, concurrency = 4, signal } = {}) {
  const found = []
  let next = 0
  const worker = async () => {
    while (next < domains.length && found.length < want) {
      const domain = domains[next]
      next += 1
      if (signal?.aborted) return
      try {
        const profile = await lookup(`https://${domain}`)
        if (profile?.url && found.length < want && !found.some((p) => bare(p.host) === bare(profile.host))) found.push(profile)
      } catch { /* a site we cannot read is not a suggestion */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, domains.length) }, worker))
  return found
}

/** Domains first named by the AI keep their order after verification (the AI lists the best-known first). */
export function orderByDomains(profiles, domains) {
  const rank = new Map(domains.map((d, i) => [bare(d), i]))
  return [...profiles].sort((a, b) => (rank.get(bare(a.host)) ?? 99) - (rank.get(bare(b.host)) ?? 99))
}

/** A candidate we could not read yet: shown with its domain and favicon; adding it reads the site for real. */
export const unverifiedProfile = (domain) => ({ url: `https://${domain}/`, host: domain, title: domain, description: '', logo: faviconFor(domain), unverified: true })

/**
 * The whole job: ask, verify, order. `exclude` is everything already added or already shown.
 * Returns { items, reason }: reason is "ai" when the gateway failed, "none" when it had no answer, "" otherwise.
 * Names that could not be read are still offered (marked unverified) so a busy site-reader never empties the list.
 */
export async function suggestCompetitors(profile, { lookup, signal, exclude = [], fetchImpl } = {}) {
  const skip = new Set([bare(profile?.host), ...exclude.map(bare)])
  const { domains: named, failed } = await askGatewayForCompetitors(profile, { signal, exclude: [...skip], fetchImpl })
  const domains = named.filter((d) => !skip.has(d))
  if (!domains.length) return { items: [], reason: failed ? 'ai' : 'none' }
  const verified = orderByDomains(await verifyCompetitors(domains, { lookup, signal }), domains)
  const have = new Set(verified.map((p) => bare(p.host)))
  const filler = domains.filter((d) => !have.has(d)).slice(0, Math.max(0, 4 - verified.length)).map(unverifiedProfile)
  return { items: [...verified, ...filler].slice(0, SUGGEST_LIMIT), reason: '' }
}
