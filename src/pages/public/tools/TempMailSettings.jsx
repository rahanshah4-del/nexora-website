import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HiOutlineArrowRightOnRectangle, HiOutlineArrowUturnRight, HiOutlineCheck, HiOutlineClipboardDocument, HiOutlineGlobeAlt, HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineTrash, HiOutlineXMark,
} from 'react-icons/hi2'
import { formatDate, lockScroll, splitLongTime } from './tempMailClient.js'
import {
  addDomain, daysLeftLabel, deleteDomain, deleteOwnedAddress, listDomains, premiumErrorMessage, startDomainForwarding, stopDomainForwarding,
  verifyDomain, verifyDomainForwarding,
} from './tempMailPremiumClient.js'
import { ForwardingEditor, ManageBilling } from './TempMailPremium.jsx'
import { signOutClient } from '../../../lib/geolintClient.js'

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'domains', label: 'Custom domains' },
]

const AVATAR_TONES = ['#0071e3', '#5e5ce6', '#bf5af2', '#ff375f', '#ff9f0a', '#30b0c7', '#34c759']
const toneFor = (text) => AVATAR_TONES[[...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_TONES.length]

const SORTS = {
  newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  expiring: (a, b) => new Date(a.expiresAt) - new Date(b.expiresAt),
  name: (a, b) => a.address.localeCompare(b.address),
}

function AddressesTab({ prem, forwardingReady, onCopy, say, current, onSwitch, onNew, busy }) {
  const [openRow, setOpenRow] = useState('')
  const [confirm, setConfirm] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [now] = useState(() => Date.now())
  const rows = prem.me?.addresses || []
  const max = prem.me?.limits?.maxAddresses || 10

  const remove = async (address) => {
    try {
      await deleteOwnedAddress(address)
      setConfirm('')
      say('Address deleted')
      prem.reload()
    } catch (e) { say(premiumErrorMessage(e)) }
  }

  if (!rows.length) {
    return (
      <div className="tm-mine-empty" style={{ margin: 0 }}>
        <b>No Premium addresses yet</b>
        <p>Make your first one. It is kept for you, and mail sent to it is waiting whenever you open it.</p>
        <div className="tm-set-actions" style={{ marginTop: '.75rem' }}><button type="button" className="tm-btn tm-btn-primary" onClick={onNew} disabled={busy}>New address</button></div>
      </div>
    )
  }

  const needle = query.trim().toLowerCase()
  const shown = rows.filter((r) => !needle || r.address.toLowerCase().includes(needle) || String(r.forwardTo || '').toLowerCase().includes(needle)).sort(SORTS[sort])
  // the address that is open now always sits first so it is never lost in a long list
  shown.sort((x, y) => (y.address === current) - (x.address === current))
  const forwardingOn = rows.filter((r) => r.forwardTo).length

  return (
    <>
      <div className="tm-set-bar">
        <span className="tm-set-count"><b>{rows.length}</b> of <b>{max}</b> addresses{forwardingOn ? <> · <b>{forwardingOn}</b> forwarding</> : null}</span>
        <button type="button" className="tm-btn tm-btn-primary" onClick={onNew} disabled={busy || rows.length >= max}>New address</button>
      </div>
      <div className="tm-mine-meter tm-set-meter" role="img" aria-label={`${rows.length} of ${max} addresses used`}><i style={{ width: `${Math.min(100, Math.round((rows.length / max) * 100))}%` }} /></div>
      {rows.length > 3 ? (
        <div className="tm-set-tools">
          <input className="tm-input grow" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your addresses" aria-label="Search your addresses" autoComplete="off" spellCheck={false} />
          <select className="tm-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort addresses">
            <option value="newest">Newest first</option>
            <option value="expiring">Expiring soon</option>
            <option value="name">A to Z</option>
          </select>
        </div>
      ) : null}
      {!shown.length ? <p className="tm-hint">No address matches "{query}".</p> : null}
      <ul className="tm-addr-list">
        {shown.map((row) => {
          const [local, domain] = row.address.split('@')
          const left = splitLongTime((new Date(row.expiresAt).getTime() - now) / 1000)
          const total = Math.max(1, (new Date(row.expiresAt).getTime() - new Date(row.createdAt).getTime()) / 86400000)
          const pct = Math.max(2, Math.min(100, Math.round((left.days / total) * 100)))
          const isCurrent = row.address === current
          const isOpen = openRow === row.address
          const isConfirm = confirm === row.address
          return (
            <li key={row.address} className={`tm-addr ${isCurrent ? 'is-current' : ''}`}>
              <div className="tm-addr-row">
                <span className="tm-addr-av" style={{ background: toneFor(local) }} aria-hidden="true">{(local[0] || '?').toUpperCase()}</span>
                <div className="tm-addr-main">
                  <b className="tm-addr-name" title={row.address}>{local}<span>@{domain}</span></b>
                  <span className="tm-mine-tags">
                    {isCurrent ? <em className="tm-tag is-on">Open now</em> : null}
                    <em className="tm-tag">{daysLeftLabel(left.days)}</em>
                    <em className={`tm-tag ${row.forwardTo ? 'is-fw' : 'is-quiet'}`}>{row.forwardTo ? `Forwarding to ${row.forwardTo}` : 'Forwarding off'}</em>
                    {row.createdAt ? <em className="tm-tag is-quiet">Created {formatDate(row.createdAt)}</em> : null}
                  </span>
                  <div className="tm-addr-life" role="img" aria-label={`${left.days} days left on this address`}><i style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="tm-addr-actions">
                  {isCurrent
                    ? <span className="tm-addr-here">Viewing</span>
                    : <button type="button" className="tm-btn tm-btn-primary" onClick={() => onSwitch(row)}>Open inbox</button>}
                  <button type="button" className="tm-icon-btn" onClick={() => onCopy(row.address, 'Address')} aria-label={`Copy ${row.address}`} title="Copy address"><HiOutlineClipboardDocument className="tm-icon" /></button>
                  <button type="button" className={`tm-icon-btn ${isOpen || row.forwardTo ? 'is-on' : ''}`} onClick={() => setOpenRow(isOpen ? '' : row.address)} aria-expanded={isOpen} aria-label={row.forwardTo ? 'Forwarding settings' : 'Set up forwarding'} title={row.forwardTo ? 'Forwarding settings' : 'Set up forwarding'}><HiOutlineArrowUturnRight className="tm-icon" /></button>
                  <button type="button" className="tm-icon-btn is-danger" onClick={() => setConfirm(isConfirm ? '' : row.address)} aria-label={`Delete ${row.address}`} title="Delete address"><HiOutlineTrash className="tm-icon" /></button>
                </div>
              </div>
              {isConfirm ? (
                <div className="tm-addr-confirm" role="alert">
                  <p>This erases <b>{row.address}</b> and every mail in it for good. Mail sent to it later will not arrive.</p>
                  <span className="tm-mine-confirm"><button type="button" className="tm-btn tm-btn-danger" onClick={() => remove(row.address)}>Yes, delete it</button><button type="button" className="tm-btn" onClick={() => setConfirm('')}>Keep</button></span>
                </div>
              ) : null}
              {isOpen ? (forwardingReady
                ? <div className="tm-addr-fw"><ForwardingEditor row={row} say={say} onChanged={prem.reload} /></div>
                : <p className="tm-hint">Forwarding is not switched on yet. Please check back soon.</p>) : null}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function DnsTable({ records, onCopy }) {
  return (
    <div className="tm-dns" role="table" aria-label="DNS records to add">
      <div className="tm-dns-row tm-dns-head" role="row"><span>Type</span><span>Name / Host</span><span>Value</span><span>Priority</span></div>
      {records.map((r) => (
        <div className="tm-dns-row" role="row" key={`${r.type}-${r.name}-${r.value}`}>
          <span><b>{r.type}</b></span>
          <button type="button" className="tm-dns-copy" onClick={() => onCopy(r.name, 'Name')} title="Copy name">{r.name}</button>
          <button type="button" className="tm-dns-copy" onClick={() => onCopy(r.value, 'Value')} title="Copy value">{r.value}</button>
          <span>{r.priority === '' ? '-' : r.priority}</span>
        </div>
      ))}
    </div>
  )
}

function DomainCard({ item, onChanged, onCopy, say }) {
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const verified = item.status === 'verified'

  const check = async () => {
    setBusy(true)
    setError('')
    try {
      const { domain } = await verifyDomain(item.domain)
      say(domain.status === 'verified' ? 'Domain connected' : 'Not found yet. DNS can take a few minutes, sometimes longer.')
      onChanged()
    } catch (e) { setError(premiumErrorMessage(e)) } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await deleteDomain(item.domain); say('Domain removed'); onChanged() } catch (e) { setError(premiumErrorMessage(e)); setBusy(false) }
  }
  const ops = {
    start: (to) => startDomainForwarding(item.domain, to),
    verify: (code) => verifyDomainForwarding(item.domain, code),
    stop: () => stopDomainForwarding(item.domain),
  }

  return (
    <li className="tm-set-card">
      <div className="tm-set-top">
        <b className="tm-set-name">{item.domain}</b>
        <em className={`tm-tag ${verified ? 'is-fw' : ''}`}>{verified ? (item.forwardTo ? 'Active' : 'Connected') : 'Waiting for DNS'}</em>
      </div>
      {!verified ? (
        <>
          <ol className="tm-steps" aria-label="How to connect your domain">
            <li className="is-now"><b>1</b> Add this record at your domain provider</li>
            <li><b>2</b> Press "Check records"</li>
            <li><b>3</b> Choose where the mail goes</li>
          </ol>
          <DnsTable records={item.records} onCopy={onCopy} />
          <p className="tm-hint">Open the DNS settings of the company where you bought the domain (GoDaddy, Namecheap, Cloudflare and so on), add the record above, then come back. If this domain already receives email somewhere (for example Google Workspace), connect a subdomain such as <b>mail.{item.domain}</b> instead, so your current mailboxes keep working.</p>
          <div className="tm-set-actions">
            <button type="button" className="tm-btn tm-btn-primary" onClick={check} disabled={busy}>{busy ? 'Checking…' : 'Check records'}</button>
          </div>
        </>
      ) : (
        <>
          <p className="tm-ok"><HiOutlineCheck className="tm-icon" /> DNS is set up. Mail sent to <b>anything@{item.domain}</b> now reaches Nexora.</p>
          <ForwardingEditor row={item} say={say} onChanged={onChanged} ops={ops} target="domain" />
        </>
      )}
      {error ? <p role="alert" className="tm-error">{error}</p> : null}
      <div className="tm-set-actions">
        {confirm ? (
          <span className="tm-mine-confirm"><button type="button" className="tm-btn tm-btn-danger" onClick={remove} disabled={busy}>Yes, remove it</button><button type="button" className="tm-btn tm-btn-ghost" onClick={() => setConfirm(false)}>Keep</button></span>
        ) : (
          <button type="button" className="tm-btn tm-btn-ghost tm-btn-danger" onClick={() => setConfirm(true)}><HiOutlineTrash className="tm-icon" /> Remove domain</button>
        )}
      </div>
    </li>
  )
}

function DomainsTab({ onCopy, say }) {
  const [state, setState] = useState({ loading: true, domains: [], limit: 3, ready: true })
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick((n) => n + 1), [])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listDomains()
        if (!cancelled) setState({ loading: false, domains: data.domains || [], limit: data.limit || 3, ready: data.ready !== false })
      } catch (e) {
        if (!cancelled) { setState((s) => ({ ...s, loading: false })); setError(premiumErrorMessage(e)) }
      }
    })()
    return () => { cancelled = true }
  }, [tick])

  const add = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addDomain(name.trim())
      setName('')
      load()
    } catch (e) { setError(premiumErrorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="tm-set-intro">
        <HiOutlineGlobeAlt className="tm-icon" />
        <p>Use your own domain for email forwarding. Add one DNS record and every mail sent to <b>anything@your-domain.com</b> is forwarded to your real inbox. No mailbox to buy.</p>
      </div>
      {!state.ready ? <p className="tm-hint">Custom domains are being set up and will be available soon.</p> : null}
      {state.loading ? <p className="tm-hint">Loading…</p> : (
        <ul className="tm-set-list">
          {state.domains.map((item) => <DomainCard key={item.domain} item={item} onChanged={load} onCopy={onCopy} say={say} />)}
        </ul>
      )}
      {state.ready && state.domains.length < state.limit ? (
        <form className="tm-field" onSubmit={add}>
          <input className="tm-input grow" placeholder="yourdomain.com" value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[\s/]+/g, ''))} aria-label="Your domain" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} inputMode="url" enterKeyHint="go" />
          <button type="submit" className="tm-btn tm-btn-primary" disabled={busy || !name.trim()}>{busy ? 'Adding…' : 'Add domain'}</button>
        </form>
      ) : null}
      {state.ready && state.domains.length >= state.limit ? <p className="tm-hint">You have connected the maximum of {state.limit} domains.</p> : null}
      {error ? <p role="alert" className="tm-error">{error}</p> : null}
    </div>
  )
}

function AccountTab({ prem, onTab }) {
  const email = prem.user?.email || ''
  const name = prem.user?.name || email.split('@')[0] || 'Your account'
  const plan = prem.me?.premium
  const rows = prem.me?.addresses || []
  const max = prem.me?.limits?.maxAddresses || 10
  const used = Math.min(100, Math.round((rows.length / max) * 100))
  const withFwd = rows.filter((r) => r.forwardTo).length
  return (
    <div>
      <div className="tm-acct">
        <span className="tm-acct-av" aria-hidden="true">{(name[0] || '?').toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <b className="tm-acct-name">{name} <em className="tm-tag is-on">👑 Premium</em></b>
          <small className="tm-acct-mail">{email}</small>
        </div>
      </div>
      <dl className="tm-acct-grid">
        <div><dt>Plan</dt><dd>{plan?.cycle === 'yearly' ? 'Yearly' : plan?.cycle === 'monthly' ? 'Monthly' : 'Premium'}</dd></div>
        <div><dt>Paid until</dt><dd>{plan?.expiresAt ? formatDate(plan.expiresAt) : '—'}</dd></div>
        <div><dt>Addresses</dt><dd>{rows.length} / {max}</dd></div>
        <div><dt>Forwarding</dt><dd>{withFwd ? `${withFwd} on` : 'Off'}</dd></div>
      </dl>
      <div className="tm-mine-meter" role="img" aria-label={`${rows.length} of ${max} addresses used`}><i style={{ width: `${used}%` }} /></div>
      <div className="tm-set-actions" style={{ marginTop: '.9rem' }}>
        <button type="button" className="tm-btn" onClick={() => onTab('addresses')}>My addresses</button>
        <button type="button" className="tm-btn" onClick={() => onTab('domains')}>Connect a domain</button>
      </div>
      <h3 className="tm-set-h">Billing</h3>
      <ManageBilling prem={prem} />
      <ul className="tm-trust" aria-label="Security">
        <li title="Your address list, the All addresses inbox, domains and forwarding settings need your sign-in"><HiOutlineLockClosed className="tm-icon" /> Sign-in protected</li>
        <li title="Everything between your browser and Nexora is encrypted"><HiOutlineShieldCheck className="tm-icon" /> HTTPS encrypted</li>
        <li title="Forwarding only turns on after a code sent to your own email is entered"><HiOutlineCheck className="tm-icon" /> Verified forwarding</li>
        <li title="Deleting an address erases all its mail and attachments"><HiOutlineTrash className="tm-icon" /> Erased on delete</li>
      </ul>
    </div>
  )
}

/** Premium settings window: addresses, custom domains, plan. */
export default function PremiumSettings({ prem, forwardingReady, initialTab = 'account', onCopy, say, onClose, current, onSwitch, onNew, busy }) {
  const [tab, setTab] = useState(initialTab === 'plan' ? 'account' : initialTab)
  const ref = useRef(null)
  // The parent re-renders every second (the timer), which hands us a new onClose each time. Keep the latest one in a ref so
  // this effect runs once: re-running it would pull focus out of the box the visitor is typing in.
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') closeRef.current() }
    const unlock = lockScroll()
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => { unlock(); document.removeEventListener('keydown', onKey) }
  }, [])

  return (
    <div className="tm-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tm-modal tm-modal-wide" role="dialog" aria-modal="true" aria-labelledby="tm-set-title" tabIndex={-1} ref={ref}>
        <button type="button" className="tm-btn tm-btn-ghost tm-modal-x" onClick={onClose} aria-label="Close"><HiOutlineXMark className="tm-icon" /></button>
        <div className="tm-set-head">
          <span className="tm-set-crown" aria-hidden="true">👑</span>
          <div>
            <p className="tm-eyebrow">Nexora Temp Mail Premium</p>
            <h2 id="tm-set-title">Settings</h2>
          </div>
        </div>
        <div className="tm-tabs tm-set-tabs" role="tablist">
          {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tm-tab ${tab === t.id ? 'is-on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        <div className="tm-set-body">
          {tab === 'account' ? <AccountTab prem={prem} onTab={setTab} /> : null}
          {tab === 'addresses' ? <AddressesTab prem={prem} forwardingReady={forwardingReady} onCopy={onCopy} say={say} current={current} onSwitch={onSwitch} onNew={onNew} busy={busy} /> : null}
          {tab === 'domains' ? <DomainsTab onCopy={onCopy} say={say} /> : null}
        </div>
        <div className="tm-set-foot">
          <span className="tm-set-who"><HiOutlineLockClosed className="tm-icon" /> Signed in as <b>{prem.user?.email || 'your account'}</b></span>
          <button type="button" className="tm-btn tm-btn-danger" onClick={() => { signOutClient().catch(() => {}); onClose() }}><HiOutlineArrowRightOnRectangle className="tm-icon" /> Sign out</button>
        </div>
      </div>
    </div>
  )
}
