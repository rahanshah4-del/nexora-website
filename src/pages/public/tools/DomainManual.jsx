import { useState } from 'react'

/** A drawn mock-up of a screen (not a real screenshot): a small window frame with a caption. */
function Shot({ title, caption, children }) {
  return (
    <figure className="tm-man-shot">
      <div className="tm-man-win" aria-hidden="true">
        <div className="tm-man-bar"><i /><i /><i /><span>{title}</span></div>
        <div className="tm-man-body">{children}</div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

const Arrow = ({ children }) => <span className="tm-man-pin">{children}</span>

function Step({ n, title, children }) {
  return (
    <li className="tm-man-step">
      <span className="tm-man-n">{n}</span>
      <div>
        <h4>{title}</h4>
        {children}
      </div>
    </li>
  )
}

const PROVIDERS = {
  cloudflare: {
    label: 'Cloudflare',
    path: 'Cloudflare dashboard → your domain → DNS → Records → Add record',
    fields: [['Type', 'MX'], ['Name', '@  (or the name shown in Nexora)'], ['Mail server', 'the Value from Nexora'], ['Priority', 'the Priority from Nexora (e.g. 10)'], ['TTL', 'Auto']],
    notes: ['MX records have no orange cloud, so there is nothing to switch off.', 'Press Save. The record appears in the list straight away.'],
  },
  godaddy: {
    label: 'GoDaddy',
    path: 'GoDaddy → My Products → your domain → DNS → Add New Record',
    fields: [['Type', 'MX'], ['Name', '@  (or the name shown in Nexora)'], ['Value', 'the Value from Nexora'], ['Priority', 'the Priority from Nexora (e.g. 10)'], ['TTL', '1 Hour']],
    notes: ['If GoDaddy already has an MX record for Google or Microsoft, do not delete it. Use a subdomain instead (see the tip below).', 'Press Save.'],
  },
  namecheap: {
    label: 'Namecheap',
    path: 'Namecheap → Domain List → Manage → Advanced DNS → Add New Record',
    fields: [['Type', 'MX Record'], ['Host', '@  (or the name shown in Nexora)'], ['Value', 'the Value from Nexora'], ['Priority', 'the Priority from Nexora (e.g. 10)'], ['TTL', 'Automatic']],
    notes: ['Under "Mail Settings" choose Custom MX, otherwise Namecheap hides MX records.', 'Press the green tick to save.'],
  },
  other: {
    label: 'Other provider',
    path: 'Log in where you bought the domain → find "DNS", "DNS records" or "Nameservers" → add a record',
    fields: [['Type', 'MX'], ['Host / Name', 'the Name from Nexora (@ means the domain itself)'], ['Value / Points to', 'the Value from Nexora'], ['Priority', 'the Priority from Nexora']],
    notes: ['Some providers want a dot at the end of the value. Both forms are accepted by almost all of them.', 'If your domain uses nameservers of another company, edit DNS there, not at the registrar.'],
  },
}

function ProviderTabs() {
  const [id, setId] = useState('cloudflare')
  const p = PROVIDERS[id]
  return (
    <div className="tm-man-prov">
      <div className="tm-man-tabs" role="tablist" aria-label="Domain provider">
        {Object.entries(PROVIDERS).map(([key, v]) => (
          <button key={key} type="button" role="tab" aria-selected={id === key} className={id === key ? 'is-on' : ''} onClick={() => setId(key)}>{v.label}</button>
        ))}
      </div>
      <p className="tm-man-path"><b>Where:</b> {p.path}</p>
      <Shot title={`${p.label} · Add DNS record`} caption={`Fill the form like this in ${p.label}. The wording of the labels may differ slightly.`}>
        <div className="tm-man-form">
          {p.fields.map(([k, v]) => (
            <div key={k} className="tm-man-frow"><label>{k}</label><span>{v}</span></div>
          ))}
          <div className="tm-man-save">Save</div>
        </div>
      </Shot>
      <ul className="tm-man-list">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </div>
  )
}

const FAQ = [
  ['It still says "Waiting for DNS" after I pressed Check records.', 'DNS changes can take a few minutes, sometimes a few hours. Wait 10 to 15 minutes and press Check records again. If it is still waiting after a few hours, open your provider and make sure the record is saved exactly as shown (type MX, the same value, the same priority) and that there is no typo or extra space.'],
  ['My domain already has email (Google Workspace, Zoho, Outlook).', 'Do not replace those records, your current mailboxes would stop working. Add a subdomain instead, for example mail.yourdomain.com, and connect that. Mail to anything@mail.yourdomain.com is then forwarded and your normal mail is untouched.'],
  ['Nexora says the domain is not allowed.', 'Free mail domains (Gmail, Yahoo, Outlook, iCloud, Proton and similar) and Nexora\'s own domains cannot be connected. Only a domain you own and can edit DNS for will work.'],
  ['I typed https://www.mysite.com or an email address.', 'That is fine. Nexora removes https://, www. and anything before @ for you and keeps only the domain.'],
  ['I did not get the verification code.', 'Check spam first. The code goes to the forwarding mailbox you typed, not to your domain. Make sure that mailbox is a real inbox you can open, then press send again.'],
  ['Test mail does not arrive.', 'Send from a different address (for example your Gmail) to anything@yourdomain. Mail from the same domain can be filtered. Look in spam, wait one minute, and confirm the domain shows Active and forwarding is on.'],
  ['How many domains can I connect?', 'Up to 3 per Premium account. Remove one to add another. Removing a domain stops forwarding at once; you can delete the MX record afterwards.'],
  ['Are attachments forwarded?', 'Forwarding sends a plain-text copy of the message. Attachments are not forwarded; the copy tells you how many there were.'],
]

/** Full step-by-step manual for the Custom domains tab. */
export default function DomainManual() {
  return (
    <details className="tm-man">
      <summary><span>📘 Complete user manual: connect your own domain</span><small>Step by step, with screens</small></summary>
      <div className="tm-man-inner">
        <p className="tm-man-lead">Total time: about 5 minutes of work, plus waiting for DNS. You do not need any technical knowledge. The pictures below are drawn examples of each screen, so your screen may look a little different.</p>

        <h3>Before you start</h3>
        <ul className="tm-man-list">
          <li>You need a <b>domain you own</b> (for example <b>mybrand.com</b>) and access to its DNS settings at the company where you bought it.</li>
          <li>You need a <b>real inbox</b> (Gmail, Outlook and so on) where the forwarded mail should arrive.</li>
          <li>Your Premium plan allows <b>up to 3 domains</b>.</li>
          <li>If the domain already receives email (Google Workspace, Zoho, Microsoft 365), use a <b>subdomain</b> such as <b>mail.mybrand.com</b>.</li>
        </ul>

        <ol className="tm-man-steps">
          <Step n="1" title="Add your domain in Nexora">
            <p>Open <b>Settings → Custom domains</b>. Type your domain in the box and press <b>Add domain</b>.</p>
            <Shot title="Settings · Custom domains" caption="Type only the domain. https://, www. and e-mail addresses are cleaned up for you.">
              <div className="tm-man-field"><span className="tm-man-input">mybrand.com</span><span className="tm-man-btn">Add domain <Arrow>1</Arrow></span></div>
            </Shot>
          </Step>

          <Step n="2" title="Copy the DNS record">
            <p>Nexora shows the one record you must add. It is an <b>MX record</b>, the type of record that says "mail for this domain goes here". Tap the <b>Name</b> or the <b>Value</b> to copy it.</p>
            <Shot title="mybrand.com · Waiting for DNS" caption="Tap a Name or Value to copy it. Your Value and Priority will be different from this example.">
              <div className="tm-man-dns">
                <div className="tm-man-drow tm-man-dh"><span>Type</span><span>Name</span><span>Value</span><span>Priority</span></div>
                <div className="tm-man-drow"><span><b>MX</b></span><span className="tm-man-hl">@ <Arrow>2</Arrow></span><span className="tm-man-hl">inbound-smtp.…amazonaws.com <Arrow>3</Arrow></span><span>10</span></div>
              </div>
              <div className="tm-man-btn is-solid">Check records</div>
            </Shot>
          </Step>

          <Step n="3" title="Add the record at your domain provider">
            <p>Log in where you bought the domain, open its DNS settings and create a new record with the same type, name, value and priority. Choose your provider:</p>
            <ProviderTabs />
          </Step>

          <Step n="4" title="Press “Check records”">
            <p>Go back to Nexora and press <b>Check records</b>. If the status is still <b>Waiting for DNS</b>, wait 10 to 15 minutes and try again. This is normal, DNS needs time to spread across the internet.</p>
            <Shot title="mybrand.com" caption="When the tag changes to Connected, Nexora can receive mail for your domain.">
              <div className="tm-man-state"><span className="tm-man-tag">Waiting for DNS</span><span className="tm-man-arrow">→</span><span className="tm-man-tag is-ok">Connected</span></div>
            </Shot>
          </Step>

          <Step n="5" title="Choose where the mail goes">
            <p>Type the real inbox that should receive your mail and press <b>Send code</b>. Nexora emails a short code to that inbox. Enter the code to prove the inbox is yours. Forwarding only starts after this check, so nobody can forward your mail to a stranger.</p>
            <Shot title="mybrand.com · Forwarding" caption="After the code is accepted the tag changes to Active.">
              <div className="tm-man-field"><span className="tm-man-input">you@gmail.com</span><span className="tm-man-btn">Send code <Arrow>4</Arrow></span></div>
              <div className="tm-man-field"><span className="tm-man-input">482917</span><span className="tm-man-btn is-solid">Verify <Arrow>5</Arrow></span></div>
            </Shot>
          </Step>

          <Step n="6" title="Test it">
            <p>From another address (for example your personal Gmail) send a message to <b>hello@mybrand.com</b>. Any name before the @ works: <b>sales@</b>, <b>support@</b>, <b>anything@</b>. The message arrives in your inbox within a minute, with the domain in square brackets at the start of the subject.</p>
            <Shot title="Your inbox" caption="Forwarded mail is a plain-text copy. Attachments are not forwarded.">
              <div className="tm-man-mail"><b>[mybrand.com] Question about pricing</b><span>Forwarded from hello@mybrand.com · From: customer@example.com</span></div>
            </Shot>
          </Step>
        </ol>

        <h3>Good to know</h3>
        <ul className="tm-man-list">
          <li><b>Replying:</b> forwarding is receive-only. Reply from your own inbox as usual.</li>
          <li><b>Stop forwarding:</b> open the domain and press <b>Stop forwarding</b>. The domain stays connected.</li>
          <li><b>Remove a domain:</b> press <b>Remove domain</b>, then <b>Yes, remove it</b>. You can delete the MX record at your provider afterwards.</li>
          <li><b>Privacy:</b> your real inbox is never shown to the sender.</li>
        </ul>

        <h3>Troubleshooting</h3>
        <div className="tm-man-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </div>
    </details>
  )
}
