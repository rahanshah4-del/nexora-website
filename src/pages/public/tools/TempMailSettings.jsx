import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HiOutlineCheck, HiOutlineClipboardDocument, HiOutlineGlobeAlt, HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineSparkles, HiOutlineTrash, HiOutlineXMark,
} from 'react-icons/hi2'
import { formatDate, splitLongTime } from './tempMailClient.js'
import {
  addDomain, daysLeftLabel, deleteDomain, deleteOwnedAddress, listDomains, premiumErrorMessage, startDomainForwarding, stopDomainForwarding,
  verifyDomain, verifyDomainForwarding,
} from './tempMailPremiumClient.js'
import { ForwardingEditor, ManageBilling } from './TempMailPremium.jsx'

const TABS = [
  { id: 'addresses', label: 'Addresses' },
  { id: 'domains', label: 'Custom domains' },
  { id: 'plan', label: 'Plan & security' },
]

function AddressesTab({ prem, forwardingReady, onCopy, say }) {
  const [openRow, setOpenRow] = useState('')
  const [confirm, setConfirm] = useState('')
  const [now] = useState(() => Date.now())
  const rows = prem.me?.addresses || []

  const remove = async (address) => {
    try {
      await deleteOwnedAddress(address)
      setConfirm('')
      say('Address deleted')
      prem.reload()
    } catch (e) { say(premiumErrorMessage(e)) }
  }

  if (!rows.length) return <p className="tm-hint">You have no Premium addresses yet. Close this window and press "New address".</p>
  return (
    <ul className="tm-set-list">
      {rows.map((row) => {
        const left = splitLongTime((new Date(row.expiresAt).getTime() - now) / 1000)
        const total = Math.max(1, (new Date(row.expiresAt).getTime() - new Date(row.createdAt).getTime()) / 86400000)
        const pct = Math.max(2, Math.min(100, Math.round((left.days / total) * 100)))
        const isOpen = openRow === row.address
        return (
          <li key={row.address} className="tm-set-card">
            <b className="tm-set-name">{row.address}</b>
            <span className="tm-mine-tags">
              <em className="tm-tag">{daysLeftLabel(left.days)}</em>
              <em className={`tm-tag ${row.forwardTo ? 'is-fw' : ''}`}>{row.forwardTo ? `Forwarding to ${row.forwardTo}` : 'Forwarding off'}</em>
              {row.createdAt ? <em className="tm-tag is-quiet">Created {formatDate(row.createdAt)}</em> : null}
            </span>
            <div className="tm-mine-life" role="img" aria-label={`${left.days} days left on this address`}><i style={{ width: `${pct}%` }} /></div>
            <div className="tm-set-actions">
              <button type="button" className="tm-btn" onClick={() => onCopy(row.address, 'Address')}><HiOutlineClipboardDocument className="tm-icon" /> Copy</button>
              <button type="button" className="tm-btn" onClick={() => setOpenRow(isOpen ? '' : row.address)} aria-expanded={isOpen}>{row.forwardTo ? 'Forwarding settings' : 'Set up forwarding'}</button>
              {confirm === row.address ? (
                <span className="tm-mine-confirm"><button type="button" className="tm-btn tm-btn-danger" onClick={() => remove(row.address)}>Yes, delete it</button><button type="button" className="tm-btn tm-btn-ghost" onClick={() => setConfirm('')}>Keep</button></span>
              ) : (
                <button type="button" className="tm-btn tm-btn-ghost tm-btn-danger" onClick={() => setConfirm(row.address)}><HiOutlineTrash className="tm-icon" /> Delete</button>
              )}
            </div>
            {confirm === row.address ? <p className="tm-hint tm-mine-warn">This erases the address and every mail in it for good. Mail sent to it later will not arrive.</p> : null}
            {isOpen ? (forwardingReady
              ? <ForwardingEditor row={row} say={say} onChanged={prem.reload} />
              : <p className="tm-hint">Forwarding is not switched on yet. Please check back soon.</p>) : null}
          </li>
        )
      })}
    </ul>
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
          <input className="tm-input grow" placeholder="yourdomain.com" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your domain" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          <button type="submit" className="tm-btn tm-btn-primary" disabled={busy || !name.trim()}>{busy ? 'Adding…' : 'Add domain'}</button>
        </form>
      ) : null}
      {state.ready && state.domains.length >= state.limit ? <p className="tm-hint">You have connected the maximum of {state.limit} domains.</p> : null}
      {error ? <p role="alert" className="tm-error">{error}</p> : null}
    </div>
  )
}

function PlanTab({ prem }) {
  return (
    <div>
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
export default function PremiumSettings({ prem, forwardingReady, initialTab = 'addresses', onCopy, say, onClose }) {
  const [tab, setTab] = useState(initialTab)
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div className="tm-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tm-modal tm-modal-wide" role="dialog" aria-modal="true" aria-labelledby="tm-set-title" tabIndex={-1} ref={ref}>
        <button type="button" className="tm-btn tm-btn-ghost tm-modal-x" onClick={onClose} aria-label="Close"><HiOutlineXMark className="tm-icon" /></button>
        <p className="tm-eyebrow"><HiOutlineSparkles className="tm-icon" style={{ verticalAlign: '-3px' }} /> Nexora Temp Mail Premium</p>
        <h2 id="tm-set-title">Settings</h2>
        <div className="tm-tabs tm-set-tabs" role="tablist">
          {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tm-tab ${tab === t.id ? 'is-on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        <div className="tm-set-body">
          {tab === 'addresses' ? <AddressesTab prem={prem} forwardingReady={forwardingReady} onCopy={onCopy} say={say} /> : null}
          {tab === 'domains' ? <DomainsTab onCopy={onCopy} say={say} /> : null}
          {tab === 'plan' ? <PlanTab prem={prem} /> : null}
        </div>
      </div>
    </div>
  )
}
