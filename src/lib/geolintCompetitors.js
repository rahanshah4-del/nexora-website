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

/** Asks the gateway for competitor domains. Returns [] when the AI is unavailable. */
export async function askGatewayForCompetitors(profile, { signal, exclude = [], fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl(`${AI_GATEWAY_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // purpose "translation" is the gateway's way of skipping the Nexora assistant persona, which is not wanted here
      body: JSON.stringify({ messages: [{ role: 'user', content: buildCompetitorPrompt(profile, { exclude }) }], maxTokens: 400, purpose: 'translation' }),
      signal,
    })
    if (!res.ok) return []
    const data = await res.json()
    return parseCompetitorDomains(data?.text, profile?.host)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return []
  }
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

/** The whole job: ask, verify, order. `exclude` is everything already added or already shown. */
export async function suggestCompetitors(profile, { lookup, signal, exclude = [], fetchImpl } = {}) {
  const skip = new Set([bare(profile?.host), ...exclude.map(bare)])
  const domains = (await askGatewayForCompetitors(profile, { signal, exclude: [...skip], fetchImpl })).filter((d) => !skip.has(d))
  const verified = await verifyCompetitors(domains, { lookup, signal })
  return orderByDomains(verified, domains)
}
