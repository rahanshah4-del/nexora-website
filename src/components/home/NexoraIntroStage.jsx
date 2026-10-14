import { NEXORA_INTRO, NEXORA_INTRO_SCENES } from '../../lib/nexoraIntroData.js'

/**
 * One frame of the Nexora intro video at time t (seconds), drawn in a fixed
 * 1280 x 720 space and captured at 1.5x for a crisp 1920 x 1080 file. Every frame
 * is a pure function of t, so the MP4 is made by setting t and taking screenshots
 * (scripts/render-nexora-video.mjs). All data in the mock screens is sample data.
 */
const W = NEXORA_INTRO.width
const H = NEXORA_INTRO.height
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x) => 1 - (1 - clamp(x)) ** 3
const easeIO = (x) => { const c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - ((-2 * c + 2) ** 3) / 2 }
const seg = (t, a, b) => clamp((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const fmtN = (n) => Math.round(n).toLocaleString('en-US')
const rise = (s, a, b = a + 0.55) => ({ opacity: ease(seg(s, a, b)), transform: `translateY(${(1 - ease(seg(s, a, b))) * 18}px)` })

const C = { ink: '#0f172a', mute: '#64748b', line: '#e2e8f0', soft: '#f1f5f9' }
const TONES = {
  blue: ['#2563eb', '#dbeafe'], violet: ['#7c3aed', '#ede9fe'], emerald: ['#059669', '#d1fae5'], amber: ['#d97706', '#fef3c7'],
  rose: ['#e11d48', '#ffe4e6'], cyan: ['#0891b2', '#cffafe'], orange: ['#ea580c', '#ffedd5'], sky: ['#0284c7', '#e0f2fe'],
}
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

function Card({ children, style }) {
  return <div style={{ background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 20, boxShadow: '0 14px 30px -18px rgba(15,23,42,.28)', padding: 22, ...style }}>{children}</div>
}
function Chip({ tone = 'blue', children, style }) {
  const [fg, bg] = TONES[tone]
  return <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '5px 14px', fontSize: 16, fontWeight: 700, color: fg, background: bg, whiteSpace: 'nowrap', ...style }}>{children}</span>
}
function Label({ children }) {
  return <p style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: C.mute }}>{children}</p>
}
function Row({ style, children }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.soft, borderRadius: 14, padding: '12px 16px', fontSize: 21, ...style }}>{children}</div>
}
function Head({ eyebrow, title, tone = 'blue', tag }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2.4, textTransform: 'uppercase', color: TONES[tone][0] }}>{eyebrow}</p>
        <h3 style={{ margin: '4px 0 0', fontSize: 44, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.1, color: C.ink }}>{title}</h3>
      </div>
      {tag ? <Chip tone={tone}>{tag}</Chip> : null}
    </div>
  )
}
const Page = ({ children }) => <div style={{ position: 'absolute', inset: 0, padding: '86px 72px 0' }}>{children}</div>
const grid = (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: 22, marginTop: 24, height: 380 })

/* 1 ── the problem ───────────────────────────── */
const MESS = [
  ['Excel sheets', 150, 250, -6], ['Paper bills', 990, 230, 5], ['WhatsApp chats', 260, 440, 4], ['Notebooks', 880, 430, -4],
  ['Calculator', 520, 200, 3], ['Five different apps', 650, 500, -3], ['Missed follow-ups', 90, 520, 6], ['Stock guesswork', 1010, 540, -5],
]
function Hook({ s }) {
  const pull = easeIO(seg(s, 3.0, 4.4))
  const logoIn = ease(seg(s, 4.2, 5.2))
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <p style={{ ...rise(s, 0.2, 1.0), opacity: ease(seg(s, 0.2, 1.0)) * (1 - seg(s, 3.0, 3.8)), position: 'absolute', left: 0, right: 0, top: 100, margin: 0, textAlign: 'center', fontSize: 60, fontWeight: 800, letterSpacing: -1.6, color: C.ink }}>
        Too many tools. <span style={{ color: '#e11d48' }}>Too many tabs.</span>
      </p>
      {MESS.map(([label, x, y, rot], i) => {
        const a = ease(seg(s, 0.6 + i * 0.18, 1.2 + i * 0.18))
        const cx = lerp(x, 640, pull); const cy = lerp(y + Math.sin(s * 1.3 + i) * 6, 360, pull)
        return <div key={label} style={{ position: 'absolute', left: cx - 100, top: cy - 26, padding: '12px 22px', borderRadius: 14, background: '#fff', border: `1.5px solid ${C.line}`, boxShadow: '0 12px 24px -14px rgba(15,23,42,.35)', fontSize: 23, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', opacity: a * (1 - pull), transform: `rotate(${rot * (1 - pull)}deg) scale(${1 - pull * 0.6})` }}>{label}</div>
      })}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: logoIn, transform: `scale(${0.8 + 0.2 * logoIn})` }}>
        <img src="/nexora-brand-logo.png" alt="" width={140} height={140} style={{ borderRadius: 32, boxShadow: '0 30px 60px -20px rgba(79,70,229,.5)' }} />
        <p style={{ margin: '24px 0 0', fontSize: 66, fontWeight: 800, letterSpacing: -2, color: C.ink }}>Nexora Solution</p>
        <p style={{ margin: '6px 0 0', fontSize: 28, color: C.mute, opacity: ease(seg(s, 5.2, 6)) }}>One cloud platform for your whole business.</p>
      </div>
    </div>
  )
}

/* 2 ── one platform ───────────────────────────── */
const MODULES = [
  ['Restaurant POS', 'orange'], ['Retail POS', 'blue'], ['Pharmacy POS', 'rose'], ['School ERP', 'emerald'],
  ['CRM', 'violet'], ['WhatsApp CRM', 'emerald'], ['Transport & Fleet', 'cyan'], ['Property ERP', 'amber'],
]
function Platform({ s }) {
  const cx = 640; const cy = 455; const rx = 440; const ry = 185
  const sway = Math.sin(s * 0.6) * 0.08
  const ang = (i) => (i / MODULES.length) * Math.PI * 2 - Math.PI / 2 + sway
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: 72, top: 80, ...rise(s, 0.2) }}>
        <h3 style={{ margin: 0, fontSize: 50, fontWeight: 800, letterSpacing: -1.4, color: C.ink }}>One platform. <span style={{ color: '#4f46e5' }}>One login.</span></h3>
        <p style={{ margin: '4px 0 0', fontSize: 23, color: C.mute }}>Pick the modules your business needs. Add more later.</p>
      </div>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        {MODULES.map(([, tone], i) => {
          const p = ease(seg(s, 0.8 + i * 0.35, 1.5 + i * 0.35))
          return <line key={i} x1={cx} y1={cy} x2={lerp(cx, cx + Math.cos(ang(i)) * rx, p)} y2={lerp(cy, cy + Math.sin(ang(i)) * ry, p)} stroke={TONES[tone][0]} strokeOpacity="0.5" strokeWidth="2" strokeDasharray="6 6" />
        })}
      </svg>
      {MODULES.map(([name, tone], i) => {
        const p = ease(seg(s, 1.0 + i * 0.35, 1.6 + i * 0.35))
        return <div key={name} style={{ position: 'absolute', left: cx + Math.cos(ang(i)) * rx * p, top: cy + Math.sin(ang(i)) * ry * p, transform: 'translate(-50%,-50%)', opacity: p, whiteSpace: 'nowrap', padding: '10px 22px', borderRadius: 999, background: '#fff', border: `2px solid ${TONES[tone][0]}`, color: TONES[tone][0], fontSize: 23, fontWeight: 800, boxShadow: '0 12px 24px -14px rgba(15,23,42,.35)' }}>{name}</div>
      })}
      <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: ease(seg(s, 0.3, 1.0)) }}>
        <div style={{ position: 'absolute', width: 190, height: 190, top: -45, borderRadius: 95, background: 'radial-gradient(circle, rgba(99,102,241,.28), transparent 70%)', transform: `scale(${1 + Math.sin(s * 2.4) * 0.08})` }} />
        <img src="/nexora-brand-logo.png" alt="" width={100} height={100} style={{ position: 'relative', borderRadius: 24, boxShadow: '0 20px 40px -16px rgba(79,70,229,.5)' }} />
        <p style={{ position: 'relative', margin: '8px 0 0', fontSize: 22, fontWeight: 800, color: C.ink }}>Nexora AI</p>
      </div>
    </div>
  )
}

/* 3 ── restaurant POS ───────────────────────────── */
function Restaurant({ s }) {
  const items = [['Burger Meal', 2, 2500, 2.6], ['Coffee Combo', 1, 680, 3.6], ['Fries', 1, 320, 4.6]]
  const sub = items.reduce((t, it) => t + it[2] * ease(seg(s, it[3], it[3] + 0.4)), 0)
  const kds = s < 5.6 ? 0 : s < 6.8 ? 1 : 2
  return (
    <Page>
      <Head eyebrow="Restaurant POS" title="From table to kitchen, in seconds" tone="orange" tag="Works offline" />
      <div style={grid('250px 1fr 300px')}>
        <Card>
          <Label>Tables</Label>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].map((t, i) => {
              const busy = (i === 3 && s > 1.4) || i === 1
              return <div key={t} style={{ textAlign: 'center', padding: '16px 0', borderRadius: 14, fontSize: 25, fontWeight: 800, background: busy ? TONES.orange[1] : C.soft, color: busy ? TONES.orange[0] : C.mute, border: `2px solid ${busy ? '#fb923c' : 'transparent'}`, transform: i === 3 ? `scale(${1 + 0.06 * Math.sin(clamp(s - 1.4, 0, 1) * Math.PI)})` : 'none' }}>{t}</div>
            })}
          </div>
        </Card>
        <Card>
          <Label>Table 4 · Order</Label>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {items.map(([n, q, price, at]) => <Row key={n} style={rise(s, at)}><span style={{ fontWeight: 700 }}>{n} <span style={{ color: C.mute, fontWeight: 500 }}>× {q}</span></span><span style={{ fontWeight: 600 }}>PKR {fmtN(price)}</span></Row>)}
          </div>
          <div style={{ marginTop: 14, borderTop: `1.5px solid ${C.line}`, paddingTop: 12, fontSize: 20, color: C.mute }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>PKR {fmtN(sub)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Service tax 5%</span><span>PKR {fmtN(sub * 0.05)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 800, color: C.ink, marginTop: 4 }}><span>Total</span><span>PKR {fmtN(sub * 1.05)}</span></div>
          </div>
        </Card>
        <Card style={{ opacity: ease(seg(s, 5.0, 5.8)), transform: `translateX(${(1 - ease(seg(s, 5.0, 5.8))) * 40}px)` }}>
          <Label>Kitchen display</Label>
          <div style={{ marginTop: 12, borderRadius: 14, background: TONES.orange[1], padding: 16 }}>
            <p style={{ margin: 0, fontSize: 23, fontWeight: 800, color: TONES.orange[0] }}>KOT #112 · Table 4</p>
            <p style={{ margin: '8px 0 0', fontSize: 19, lineHeight: '30px', color: '#431407' }}>2 × Burger Meal<br />1 × Coffee Combo<br />1 × Fries</p>
            <div style={{ marginTop: 10 }}><Chip tone={kds === 2 ? 'emerald' : 'amber'}>{kds === 0 ? 'Sent to kitchen' : kds === 1 ? 'Preparing' : 'Ready to serve'}</Chip></div>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: '24px', color: C.mute, opacity: ease(seg(s, 6.8, 7.4)) }}>Split the bill, print the receipt, close the table.</p>
        </Card>
      </div>
    </Page>
  )
}

/* 4 ── retail + pharmacy ───────────────────────────── */
function Retail({ s }) {
  const scanX = ((s * 0.9) % 1) * 100
  const cart = [['Cotton Shirt', 3950, 1.8], ['Cap', 900, 3.0]]
  const total = cart.reduce((t, c) => t + c[1] * ease(seg(s, c[2], c[2] + 0.4)), 0)
  const stock = 42 - Math.round(ease(seg(s, 3.2, 3.8)) * 2)
  const meds = [['Paracetamol 500 mg', 'Batch B-2207', 'Expires in 28 days', 'amber'], ['Amoxicillin 250 mg', 'Batch A-1190', 'Expires in 14 months', 'emerald'], ['Cough syrup 100 ml', 'Batch C-3341', 'Expired', 'rose']]
  return (
    <Page>
      <Head eyebrow="Retail POS · Pharmacy POS" title="Scan, sell and never miss an expiry" tone="blue" />
      <div style={grid('1fr 1fr')}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ margin: 0, fontSize: 25, fontWeight: 800 }}>Retail counter</p><Chip tone="blue">Barcode ready</Chip></div>
          <div style={{ position: 'relative', marginTop: 14, height: 90, borderRadius: 14, background: C.soft, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            {Array.from({ length: 46 }, (_, i) => <span key={i} style={{ height: 56, background: C.ink, width: [2, 4, 3, 5, 2, 3][i % 6] }} />)}
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: 3, left: `${scanX}%`, background: '#f43f5e', boxShadow: '0 0 16px 3px rgba(244,63,94,.55)' }} />
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {cart.map(([n, p, at]) => <Row key={n} style={{ ...rise(s, at), padding: '9px 16px' }}><span style={{ fontWeight: 700 }}>{n}</span><span style={{ fontWeight: 600 }}>PKR {fmtN(p)}</span></Row>)}
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 18, color: C.mute }}>Cotton Shirt stock: <b style={{ color: C.ink }}>{stock}</b> left</span><span style={{ fontSize: 31, fontWeight: 800 }}>PKR {fmtN(total)}</span></div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ margin: 0, fontSize: 25, fontWeight: 800 }}>Pharmacy shelf</p><Chip tone="rose">Batch + expiry</Chip></div>
          <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            {meds.map(([n, b, e, tone], i) => (
              <div key={n} style={{ ...rise(s, 1.2 + i * 1.1), borderRadius: 14, background: TONES[tone][1], padding: '12px 16px' }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.ink }}>{n}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ fontSize: 17, color: C.mute }}>{b}</span><span style={{ fontSize: 18, fontWeight: 800, color: TONES[tone][0] }}>{e}</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  )
}

/* 5 ── school ERP ───────────────────────────── */
function School({ s }) {
  const pct = 78 * ease(seg(s, 0.8, 2.6))
  const r = 80; const c = 2 * Math.PI * r
  const names = ['Ayesha', 'Hamza', 'Zainab', 'Bilal', 'Hira']
  const marks = [[1, 1, 1, 0, 1], [1, 1, 1, 1, 1], [1, 0, 1, 1, 1], [1, 1, 0, 1, 1], [1, 1, 1, 1, 0]]
  return (
    <Page>
      <Head eyebrow="School ERP" title="Fees, attendance and exams, sorted" tone="emerald" tag="Sample data" />
      <div style={grid('320px 1fr 290px')}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ alignSelf: 'flex-start' }}><Label>This month's fees</Label></div>
          <div style={{ position: 'relative', marginTop: 14, width: 210, height: 210 }}>
            <svg viewBox="0 0 200 200" width="210" height="210" style={{ transform: 'rotate(-90deg)' }}><circle cx="100" cy="100" r={r} fill="none" stroke={C.soft} strokeWidth="18" /><circle cx="100" cy="100" r={r} fill="none" stroke="#10b981" strokeWidth="18" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} /></svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 54, fontWeight: 800, letterSpacing: -1.5 }}>{Math.round(pct)}%</span><span style={{ fontSize: 17, color: C.mute }}>collected</span></div>
          </div>
        </Card>
        <Card>
          <Label>Attendance · this week</Label>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', rowGap: 10, textAlign: 'center', fontSize: 21 }}>
            <span />{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => <span key={d} style={{ fontSize: 16, color: C.mute, fontWeight: 600 }}>{d}</span>)}
            {names.map((n, i) => (
              <div key={n} style={{ display: 'contents' }}>
                <span style={{ textAlign: 'left', fontWeight: 600 }}>{n}</span>
                {marks[i].map((m, j) => <span key={j} style={{ fontWeight: 800, opacity: ease(seg(s, 1.4 + i * 0.35 + j * 0.08, 1.8 + i * 0.35 + j * 0.08)), color: m ? '#059669' : '#e11d48' }}>{m ? '✓' : '✕'}</span>)}
              </div>
            ))}
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 14, gridAutoRows: '1fr' }}>
          {[['Exam results', 'Marks to report cards', 4.0], ['Staff payroll', 'Salaries and slips', 4.8], ['Parent contact', 'Fee reminders', 5.6]].map(([t, d, at]) => (
            <Card key={t} style={{ ...rise(s, at), padding: '16px 20px' }}><p style={{ margin: 0, fontSize: 23, fontWeight: 800 }}>{t}</p><p style={{ margin: '2px 0 0', fontSize: 17, color: C.mute }}>{d}</p></Card>
          ))}
        </div>
      </div>
    </Page>
  )
}

/* 6 ── CRM + WhatsApp ───────────────────────────── */
function Crm({ s }) {
  const mv = easeIO(seg(s, 3.2, 4.2)); const mv2 = easeIO(seg(s, 5.2, 6.2))
  const col = mv2 > 0 ? 2 : mv > 0 ? 1 : 0
  const cardX = 14 + (mv + mv2) * 190
  return (
    <Page>
      <Head eyebrow="CRM · WhatsApp CRM" title="Every chat becomes a lead" tone="violet" tag="Sample data" />
      <div style={grid('1fr 1.35fr')}>
        <Card>
          <Label>WhatsApp inbox</Label>
          <div style={{ marginTop: 12, display: 'grid', gap: 10, fontSize: 21 }}>
            <div style={{ ...rise(s, 0.6), maxWidth: '88%', borderRadius: '18px 18px 18px 4px', background: C.soft, padding: '10px 16px' }}>Salam, 20 shirts ka rate kya hoga?</div>
            <div style={{ ...rise(s, 1.6), maxWidth: '88%', marginLeft: 'auto', borderRadius: '18px 18px 4px 18px', background: '#d1fae5', padding: '10px 16px', color: '#065f46' }}>Ji, quotation bhej raha hoon.</div>
          </div>
          <div style={{ ...rise(s, 2.4), marginTop: 18, borderRadius: 14, background: TONES.violet[1], padding: '12px 16px' }}>
            <Label>New lead created</Label>
            <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: '#4c1d95' }}>Ali Traders · via WhatsApp</p>
          </div>
        </Card>
        <Card>
          <Label>Sales pipeline</Label>
          <div style={{ position: 'relative', marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {['New', 'Follow-up', 'Won'].map((cn, i) => (
              <div key={cn} style={{ height: 250, borderRadius: 14, background: C.soft, padding: 12 }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.mute }}>{cn}</p>
                {i === 0 ? <div style={{ marginTop: 12, borderRadius: 10, background: '#fff', padding: '8px 12px', fontSize: 17, fontWeight: 600 }}>Noor Stores</div> : null}
              </div>
            ))}
            <div style={{ position: 'absolute', top: 76, left: cardX, width: 170, borderRadius: 10, padding: '8px 12px', fontSize: 18, fontWeight: 800, opacity: ease(seg(s, 2.6, 3.2)), background: col === 2 ? '#d1fae5' : '#ede9fe', border: `2px solid ${col === 2 ? '#10b981' : '#8b5cf6'}`, boxShadow: '0 10px 20px -10px rgba(15,23,42,.35)' }}>Ali Traders<span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: C.mute }}>PKR 78,000 quote</span></div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 19, fontWeight: 700, color: '#059669', opacity: ease(seg(s, 6.2, 7)) }}>Deal won. Invoice ready in one click.</p>
        </Card>
      </div>
    </Page>
  )
}

/* 7 ── fleet + property ───────────────────────────── */
function Fleet({ s }) {
  const veh = [['Toyota Corolla', 0.0, 0.55, 'blue'], ['Honda Civic', 0.3, 0.9, 'cyan'], ['Suzuki Bolan', 0.1, 0.45, 'violet'], ['Hiace Van', 0.5, 1.0, 'emerald']]
  const rent = [['Shop 3 · Mall Rd', 'Paid', 'emerald', 2.8], ['Flat 12 · Block B', 'Paid', 'emerald', 3.5], ['Office 7 · Gulberg', 'Due', 'amber', 4.2]]
  return (
    <Page>
      <Head eyebrow="Transport & Fleet · Property ERP" title="Vehicles and rent, under control" tone="cyan" tag="Sample data" />
      <div style={grid('1fr 1fr')}>
        <Card>
          <p style={{ margin: 0, fontSize: 25, fontWeight: 800 }}>Rental bookings</p>
          <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
            {veh.map(([n, a, b, tone], i) => {
              const p = ease(seg(s, 0.8 + i * 0.6, 1.8 + i * 0.6))
              return <div key={n}><p style={{ margin: 0, fontSize: 19, fontWeight: 600, color: '#334155' }}>{n}</p><div style={{ position: 'relative', marginTop: 4, height: 22, borderRadius: 11, background: C.soft }}><div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 11, left: `${a * 100}%`, width: `${(b - a) * 100 * p}%`, background: TONES[tone][0] }} /></div></div>
            })}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 18, color: C.mute, opacity: ease(seg(s, 4, 4.8)) }}>Customer ledgers, payments and dues per booking.</p>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: 25, fontWeight: 800 }}>Rent collection</p>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {rent.map(([n, st, tone, at]) => <Row key={n} style={{ ...rise(s, at - 1.6), padding: '13px 16px' }}><span style={{ fontWeight: 700 }}>{n}</span><Chip tone={tone}>{st}</Chip></Row>)}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, opacity: ease(seg(s, 4.4, 5.2)) }}><Chip tone="amber">Leases</Chip><Chip tone="blue">Maintenance</Chip><Chip tone="violet">Owner reports</Chip></div>
        </Card>
      </div>
    </Page>
  )
}

/* 8 ── Nexora AI ───────────────────────────── */
function Ai({ s }) {
  const q = 'Which items sold the most this week?'
  const typed = q.slice(0, Math.floor(seg(s, 0.6, 2.6) * q.length))
  const bars = [['Burger Meal', 64, '#8b5cf6'], ['Coffee Combo', 41, '#3b82f6'], ['Fries', 29, '#06b6d4']]
  return (
    <Page>
      <Head eyebrow="Nexora AI" title="Ask your business anything" tone="violet" tag="Built into every module" />
      <div style={grid('1.25fr 0.75fr')}>
        <Card style={{ padding: 24 }}>
          <div style={{ marginLeft: 'auto', width: 'fit-content', maxWidth: '92%', borderRadius: '18px 18px 4px 18px', background: '#7c3aed', color: '#fff', padding: '12px 20px', fontSize: 23, fontWeight: 500, minHeight: 28 }}>{typed}<span style={{ opacity: s < 2.8 ? 1 : 0 }}>|</span></div>
          <div style={{ ...rise(s, 3.0), marginTop: 16, borderRadius: '18px 18px 18px 4px', background: C.soft, padding: 20 }}>
            <p style={{ margin: 0, fontSize: 20, color: C.mute }}>Top sellers, last 7 days (units):</p>
            <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              {bars.map(([n, v, color], i) => {
                const k = ease(seg(s, 3.4 + i * 0.3, 4.4 + i * 0.3))
                return <div key={n} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 44px', alignItems: 'center', gap: 12, fontSize: 20 }}><span style={{ fontWeight: 600 }}>{n}</span><div style={{ height: 16, borderRadius: 8, background: '#e2e8f0' }}><div style={{ height: '100%', borderRadius: 8, width: `${(v / 64) * 100 * k}%`, background: color }} /></div><span style={{ fontWeight: 700, color: C.mute }}>{Math.round(v * k)}</span></div>
              })}
            </div>
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 18, gridAutoRows: '1fr' }}>
          <Card style={rise(s, 4.6)}><p style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Menu import</p><p style={{ margin: '6px 0 0', fontSize: 18, lineHeight: '27px', color: C.mute }}>Snap a photo of your menu. Items and prices fill in for you.</p></Card>
          <Card style={rise(s, 5.4)}><p style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Sales insights</p><p style={{ margin: '6px 0 0', fontSize: 18, lineHeight: '27px', color: C.mute }}>Plain-language answers from your own data.</p></Card>
        </div>
      </div>
    </Page>
  )
}

/* 9 ── custom + tools ───────────────────────────── */
function Custom({ s }) {
  const code = ['const app = nexora.build({', '  for: "your business",', '  modules: ["billing", "stock"],', '  platform: ["web", "android", "ios"],', '})']
  return (
    <Page>
      <Head eyebrow="Custom software · Free tools" title="Need something different? We build it." tone="sky" />
      <div style={grid('1.1fr 0.9fr')}>
        <div style={{ borderRadius: 20, background: '#0f172a', padding: 22, boxShadow: '0 14px 30px -18px rgba(15,23,42,.5)' }}>
          <div style={{ display: 'flex', gap: 8 }}>{['#fb7185', '#fcd34d', '#34d399'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}</div>
          <div style={{ marginTop: 16, whiteSpace: 'pre', fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 21, lineHeight: '36px', color: '#bae6fd' }}>
            {code.map((l, i) => <div key={i} style={{ opacity: ease(seg(s, 0.6 + i * 0.5, 1.0 + i * 0.5)) }}>{l}</div>)}
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8, opacity: ease(seg(s, 3.2, 4)) }}><Chip tone="blue">Custom software</Chip><Chip tone="violet">ERP development</Chip><Chip tone="emerald">Mobile apps</Chip><Chip tone="amber">Online stores</Chip></div>
        </div>
        <Card>
          <p style={{ margin: 0, fontSize: 25, fontWeight: 800 }}>Free business tools</p>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>{['Invoice generator', 'Quotation generator', 'Pay stub generator'].map((t, i) => <Row key={t} style={{ ...rise(s, 1.4 + i * 0.5), fontWeight: 700 }}>{t}</Row>)}</div>
          <p style={{ margin: '16px 0 0', fontSize: 19, fontWeight: 700, color: '#059669', opacity: ease(seg(s, 3.4, 4.2)) }}>No signup. No watermark.</p>
        </Card>
      </div>
    </Page>
  )
}

/* 10 ── close ───────────────────────────── */
function Close({ s }) {
  const chips = ['Full access to every module', 'No credit card', 'PKR billing', 'Urdu + English support', 'Offline POS billing']
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 72px', textAlign: 'center' }}>
      <img src="/nexora-brand-logo.png" alt="" width={104} height={104} style={{ ...rise(s, 0.2), borderRadius: 26, boxShadow: '0 24px 50px -18px rgba(79,70,229,.5)' }} />
      <h3 style={{ ...rise(s, 0.6), margin: '24px 0 0', fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, color: C.ink }}>Start your <span style={{ color: '#4f46e5' }}>free 1-month trial</span></h3>
      <div style={{ marginTop: 26, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>{chips.map((c, i) => <span key={c} style={rise(s, 1.4 + i * 0.3)}><Chip tone={['blue', 'emerald', 'amber', 'violet', 'orange'][i]} style={{ fontSize: 19, padding: '7px 18px' }}>{c}</Chip></span>)}</div>
      <div style={{ ...rise(s, 3.2), marginTop: 34, borderRadius: 999, background: C.ink, color: '#fff', padding: '18px 46px', fontSize: 30, fontWeight: 800, boxShadow: '0 24px 40px -18px rgba(15,23,42,.6)' }}>nexorasolution.online</div>
      <p style={{ ...rise(s, 3.8), margin: '16px 0 0', fontSize: 23, color: C.mute }}>POS, ERP and CRM for growing businesses.</p>
    </div>
  )
}

const STRIPS = {
  restaurant: ['KOT and kitchen display', 'Split bills', 'Offline-ready billing'],
  retail: ['Barcode billing', 'Multi-counter checkout', 'Batch and expiry tracking'],
  school: ['Fees and receipts', 'Attendance', 'Exams and payroll'],
  crm: ['Leads and follow-ups', 'Invoices and tasks', 'WhatsApp broadcasts'],
  fleet: ['Rental bookings', 'Customer ledgers', 'Leases and owner reports'],
  ai: ['Menu import', 'Sales insights', 'Built into every module'],
}
const STRIP_TONES = ['blue', 'violet', 'emerald']

function Strip({ s, items, dur }) {
  const a = dur - 4.2
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 36, display: 'flex', justifyContent: 'center', gap: 12, padding: '0 72px' }}>
      {items.map((it, i) => <span key={it} style={rise(s, a + i * 0.45)}><Chip tone={STRIP_TONES[i]} style={{ fontSize: 21, padding: '9px 22px' }}>{it}</Chip></span>)}
    </div>
  )
}

const VIEWS = { hook: Hook, platform: Platform, restaurant: Restaurant, retail: Retail, school: School, crm: Crm, fleet: Fleet, ai: Ai, custom: Custom, close: Close }

function sceneIndex(t) {
  const i = NEXORA_INTRO_SCENES.findIndex((sc) => t >= sc.start && t < sc.end)
  return i === -1 ? NEXORA_INTRO_SCENES.length - 1 : i
}

export default function NexoraIntroStage({ t }) {
  const idx = sceneIndex(t)
  const scene = NEXORA_INTRO_SCENES[idx]
  const View = VIEWS[scene.id]
  const last = idx === NEXORA_INTRO_SCENES.length - 1
  const fade = Math.min(seg(t, scene.start, scene.start + 0.45), last ? 1 : 1 - seg(t, scene.end - 0.4, scene.end))
  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: W, height: H, color: C.ink, fontFamily: FONT, background: 'linear-gradient(180deg,#f8fbff 0%,#e9f1ff 100%)', WebkitFontSmoothing: 'antialiased', textRendering: 'geometricPrecision' }}>
      {idx > 0 && !last ? <div style={{ position: 'absolute', left: 72, top: 22, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}><img src="/nexora-brand-logo.png" alt="" width={30} height={30} style={{ borderRadius: 8 }} /><span style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>Nexora Solution</span></div> : null}
      <div style={{ position: 'absolute', inset: 0, opacity: clamp(fade) }}><View s={t - scene.start} />{STRIPS[scene.id] ? <Strip s={t - scene.start} items={STRIPS[scene.id]} dur={scene.end - scene.start} /> : null}</div>
    </div>
  )
}
