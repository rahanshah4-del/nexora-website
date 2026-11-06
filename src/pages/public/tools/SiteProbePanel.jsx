import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildProbeGroups, fetchSiteProbe } from '../../../lib/siteProbe.js'

const TONE_LABEL = { good: 'Good', warn: 'Check', bad: 'Fix', info: '' }

function Group({ group }) {
  return (
    <section className="sp-group" aria-labelledby={`sp-${group.id}`}>
      <h3 id={`sp-${group.id}`}>{group.title}</h3>
      <p className="sp-lead">{group.lead}</p>
      <ul>
        {group.rows.map((r) => (
          <li key={r.label} className={`sp-row sp-${r.tone}`}>
            <div className="sp-row-main">
              <span className="sp-label">{r.label}</span>
              <span className="sp-value">{r.value}{TONE_LABEL[r.tone] ? <b className="sp-chip">{TONE_LABEL[r.tone]}</b> : null}</span>
            </div>
            {r.note ? <p className="sp-note">{r.note}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The part of the speed test Google does not show: server answer time, DNS, redirects, caching, CDN, page contents
 * and security headers, measured from Cloudflare's network by the site's own Worker.
 */
export default function SiteProbePanel({ url, guide = false }) {
  const [state, setState] = useState({ status: 'loading', probe: null, error: '' })
  useEffect(() => {
    const ctl = new AbortController()
    fetchSiteProbe(url, { signal: ctl.signal })
      .then((probe) => setState({ status: 'done', probe, error: '' }))
      .catch((e) => { if (!ctl.signal.aborted) setState({ status: 'error', probe: null, error: e?.message || 'The server check could not run.' }) })
    return () => ctl.abort()
  }, [url])

  return (
    <section className="sp" aria-label="Server and delivery check" aria-busy={state.status === 'loading'}>
      <header className="sp-head">
        <p className="sp-eyebrow">Extra data, not in Google PageSpeed</p>
        <h2>Server, network and delivery check</h2>
        <p>Google measures how the page paints. This part measures the server behind it: how fast it answers, how the visit is routed, what is cached and what the page asks the browser to load.</p>
      </header>
      {state.status === 'loading' ? (
        <div className="sp-loading" role="status"><span className="sp-spin" aria-hidden="true" /> Checking the server, DNS and headers. About 5 to 15 seconds.</div>
      ) : state.status === 'error' ? (
        <p role="alert" className="sp-error">{state.error}</p>
      ) : (
        <>
          <div className="sp-grid">{buildProbeGroups(state.probe).map((g) => <Group key={g.id} group={g} />)}</div>
          <p className="sp-foot">Measured from a Cloudflare server, so timings show the server and network, not a phone on mobile data. Tested {new Date(state.probe.testedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.{guide ? <> <Link to="/tools/server-response-time-test">What each row means: the server response time guide</Link>.</> : null}</p>
        </>
      )}
    </section>
  )
}
