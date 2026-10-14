import { PRODUCT_CLIP } from '../../lib/productVideos.js'

/**
 * One frame of a product loop clip at time t (seconds), drawn in a fixed
 * 1280 x 960 space. Every frame is a pure function of t, so each clip is made by
 * setting t and taking screenshots (scripts/render-product-clips.mjs). Everything
 * shown is sample data; the screens are simplified illustrations of the workflow.
 */
const W = PRODUCT_CLIP.width
const H = PRODUCT_CLIP.height
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x) => 1 - (1 - clamp(x)) ** 3
const easeIO = (x) => { const c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - ((-2 * c + 2) ** 3) / 2 }
const seg = (t, a, b) => clamp((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const fmt = (n) => Math.round(n).toLocaleString('en-US')
const pkr = (n) => `PKR ${fmt(n)}`
const rise = (t, a, b = a + 0.5) => ({ opacity: ease(seg(t, a, b)), transform: `translateY(${(1 - ease(seg(t, a, b))) * 18}px)` })

const C = { ink: '#0f172a', mute: '#64748b', line: '#e2e8f0', blue: '#2563eb', blueSoft: '#dbeafe', green: '#10b981', greenSoft: '#d1fae5', amber: '#f59e0b', amberSoft: '#fef3c7', violet: '#7c3aed', white: '#fff' }

/** Piecewise cursor path: keys are [time, x, y]. */
function path(t, keys) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]]
  for (let i = 1; i < keys.length; i += 1) {
    if (t <= keys[i][0]) {
      const k = easeIO(seg(t, keys[i - 1][0], keys[i][0]))
      return [lerp(keys[i - 1][1], keys[i][1], k), lerp(keys[i - 1][2], keys[i][2], k)]
    }
  }
  const last = keys.at(-1)
  return [last[1], last[2]]
}

function Cursor({ t, keys, clicks = [] }) {
  const [x, y] = path(t, keys)
  const press = clicks.some((c) => t >= c && t < c + 0.18)
  const ripple = clicks.map((c) => seg(t, c, c + 0.55)).find((s) => s > 0 && s < 1) || 0
  return (
    <>
      {ripple > 0 ? <div style={{ position: 'absolute', left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: 34, border: `4px solid ${C.blue}`, opacity: 1 - ripple, transform: `scale(${0.4 + ripple * 0.9})` }} /> : null}
      <svg width="44" height="44" viewBox="0 0 24 24" style={{ position: 'absolute', left: x - 6, top: y - 4, transform: `scale(${press ? 0.88 : 1})`, filter: 'drop-shadow(0 4px 6px rgba(15,23,42,.35))', zIndex: 50 }}>
        <path d="M5 3l14 8-6.2 1.6L9.8 19z" fill="#0f172a" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  )
}

function Chip({ children, bg = C.blueSoft, fg = C.blue, style }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: bg, color: fg, fontWeight: 700, fontSize: 22, ...style }}>{children}</span>
}

function Btn({ children, style }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: C.ink, color: '#fff', fontWeight: 700, fontSize: 28, ...style }}>{children}</div>
}

function Shell({ product, sidebar, active, title, right, children, fade }) {
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: 'linear-gradient(180deg,#f8fbff 0%,#e9f1ff 100%)', color: C.ink, fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif', opacity: fade }}>
      <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 72, background: '#fff', borderBottom: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10 }}>{['#fda4af', '#fcd34d', '#6ee7b7'].map((c) => <span key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />)}</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.mute }}>{product}</div>
        <Chip bg="#f1f5f9" fg={C.mute} style={{ fontSize: 20 }}>Sample data</Chip>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 72, bottom: 0, width: 200, background: '#fff', borderRight: `2px solid ${C.line}`, padding: '24px 14px' }}>
        {sidebar.map((s, i) => (
          <div key={s} style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 6, fontSize: 24, fontWeight: 600, background: i === active ? C.ink : 'transparent', color: i === active ? '#fff' : C.mute }}>{s}</div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 224, right: 48, top: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

/** Fade the loop's seam: in over the first 0.5 s, out over the last 0.6 s. */
const loopFade = (t) => 1 - Math.max(seg(t, PRODUCT_CLIP.duration - 0.6, PRODUCT_CLIP.duration), 1 - seg(t, 0, 0.5))

/* ── CRM: pipeline ─────────────────────────────────────────────── */
const COLS = ['New', 'Contacted', 'Proposal', 'Won']
const colX = (i) => 224 + i * 256
const PITCH = 140

function DealCard({ deal, x, y, lift = 0 }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 240, height: 124, borderRadius: 18, background: '#fff', border: `2px solid ${lift ? C.blue : C.line}`, padding: '16px 18px', boxShadow: lift ? '0 30px 50px -18px rgba(37,99,235,.55)' : '0 6px 14px -8px rgba(15,23,42,.18)', transform: `scale(${1 + lift * 0.05}) rotate(${lift * -2}deg)`, zIndex: lift ? 20 : 1 }}>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{deal.n}</div>
      <div style={{ marginTop: 6, fontSize: 24, color: C.mute }}>{pkr(deal.v)}</div>
      <div style={{ marginTop: 8 }}><Chip bg="#f1f5f9" fg={C.mute} style={{ fontSize: 18, padding: '2px 12px' }}>{deal.tag}</Chip></div>
    </div>
  )
}

function CrmPipeline({ t }) {
  const A = { n: 'Hassan Traders', v: 480000, tag: 'Retail' }
  const col = {
    0: [A, { n: 'Bright Dental', v: 150000, tag: 'Clinic' }, { n: 'Zafar Estates', v: 920000, tag: 'Property' }],
    1: [{ n: 'Noor Textiles', v: 310000, tag: 'Textile' }, { n: 'Apex Clinic', v: 220000, tag: 'Clinic' }],
    2: [{ n: 'Malik Builders', v: 1200000, tag: 'Construction' }],
    3: [{ n: 'Sara Boutique', v: 95000, tag: 'Retail' }],
  }
  const y0 = 290
  const out = seg(t, 3.2, 4.0)
  const into = seg(t, 5.2, 6.0)
  const drag = easeIO(seg(t, 3.0, 5.8))
  const dragging = t >= 3.0 && t < 6.1
  const settled = t >= 6.1
  const startX = colX(0)
  const endX = colX(2)
  const ax = lerp(startX, endX, drag)
  const ay = lerp(y0, y0 + 14, drag)
  const lift = dragging ? ease(seg(t, 3.0, 3.3)) * (1 - ease(seg(t, 5.8, 6.1))) : 0
  const newVal = lerp(1550000, 1070000, ease(out))
  const propVal = lerp(1200000, 1680000, ease(seg(t, 5.8, 6.4)))
  const newCount = t >= 3.4 ? 2 : 3
  const propCount = t >= 5.9 ? 2 : 1
  const hover = dragging && t > 4.6 ? 1 : 0
  const cursor = [[0, 760, 780], [2.4, colX(0) + 130, y0 + 60], [3.0, colX(0) + 130, y0 + 60], [5.8, colX(2) + 130, y0 + 74], [6.4, colX(2) + 130, y0 + 74], [8.2, 1020, 760]]
  const header = (i) => {
    const count = i === 0 ? newCount : i === 2 ? propCount : col[i].length
    const val = i === 0 ? newVal : i === 2 ? propVal : col[i].reduce((s, d) => s + d.v, 0)
    return (
      <div key={COLS[i]} style={{ position: 'absolute', left: colX(i), top: 180, width: 240 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 28, fontWeight: 800 }}>{COLS[i]}</span>
          <Chip bg="#e2e8f0" fg={C.ink} style={{ fontSize: 22, padding: '2px 14px' }}>{count}</Chip>
        </div>
        <div style={{ marginTop: 4, fontSize: 22, color: C.mute, fontWeight: 600 }}>{pkr(val)}</div>
      </div>
    )
  }
  return (
    <Shell product="Nexora CRM" sidebar={['Dashboard', 'Leads', 'Customers', 'Pipeline', 'Invoices', 'Tasks']} active={3} title="Sales pipeline" fade={loopFade(t)} right={<Chip bg={C.greenSoft} fg="#047857">Total value {pkr(3375000)}</Chip>}>
      {COLS.map((c, i) => <div key={c} style={{ position: 'absolute', left: colX(i) - 8, top: 170, width: 256, height: 740, borderRadius: 22, background: i === 2 && hover ? 'rgba(37,99,235,.10)' : 'rgba(255,255,255,.55)', border: `2px dashed ${i === 2 && hover ? C.blue : 'transparent'}` }} />)}
      {COLS.map((_, i) => header(i))}
      {col[0].slice(1).map((d, i) => <DealCard key={d.n} deal={d} x={colX(0)} y={y0 + (i + 1) * PITCH - out * PITCH} />)}
      {col[1].map((d, i) => <DealCard key={d.n} deal={d} x={colX(1)} y={y0 + i * PITCH} />)}
      {col[2].map((d, i) => <DealCard key={d.n} deal={d} x={colX(2)} y={y0 + i * PITCH + into * PITCH} />)}
      {col[3].map((d, i) => <DealCard key={d.n} deal={d} x={colX(3)} y={y0 + i * PITCH} />)}
      <DealCard deal={A} x={settled ? endX : ax} y={settled ? y0 + 14 - 14 * ease(seg(t, 6.1, 6.5)) : ay} lift={lift} />
      <Cursor t={t} keys={cursor} />
    </Shell>
  )
}

/* ── CRM: follow-ups ───────────────────────────────────────────── */
const FOLLOW = [
  ['10:30', 'Call Hassan Traders about the proposal', 'AK'],
  ['11:15', 'Send revised quote to Bright Dental', 'SM'],
  ['14:00', 'Check in with Noor Textiles', 'AK'],
  ['15:30', 'Book a site visit with Malik Builders', 'SM'],
  ['17:00', 'Send payment reminder to Apex Clinic', 'AK'],
]

function CrmFollowups({ t }) {
  const done = [seg(t, 2.2, 2.7), 0, seg(t, 5.4, 5.9), 0, 0]
  const ticks = (t >= 2.4 ? 1 : 0) + (t >= 5.6 ? 1 : 0)
  const added = t >= 8.4 ? 1 : 0
  const due = 5 - ticks + added
  const rowY = (i) => 236 + i * 112
  const cursor = [[0, 900, 800], [1.6, 262, rowY(0) + 48], [3.6, 262, rowY(0) + 48], [5.0, 262, rowY(2) + 48], [6.6, 262, rowY(2) + 48], [8.0, 1060, 148], [9.4, 1060, 148], [10.6, 900, 700]]
  return (
    <Shell product="Nexora CRM" sidebar={['Dashboard', 'Leads', 'Customers', 'Pipeline', 'Invoices', 'Tasks']} active={5} title="Follow-ups" fade={loopFade(t)} right={<div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><Chip bg={C.amberSoft} fg="#b45309" style={{ transform: `scale(${1 + 0.12 * (1 - ease(seg(t, 2.4, 2.9))) * (t >= 2.4 && t < 2.9 ? 1 : 0)})` }}>Due today: {due}</Chip><Btn style={{ padding: '10px 22px', fontSize: 24 }}>+ New follow-up</Btn></div>}>
      {FOLLOW.map(([time, label, who], i) => (
        <div key={label} style={{ position: 'absolute', left: 224, right: 48, top: rowY(i), height: 98, borderRadius: 20, background: '#fff', border: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 24, opacity: 1 - done[i] * 0.45 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, border: `3px solid ${done[i] > 0.4 ? C.green : '#cbd5e1'}`, background: done[i] > 0.4 ? C.green : '#fff', color: '#fff', fontSize: 30, display: 'grid', placeItems: 'center' }}>{done[i] > 0.4 ? '✓' : ''}</div>
          <div style={{ flex: 1, fontSize: 30, fontWeight: 600, textDecoration: done[i] > 0.4 ? 'line-through' : 'none', color: done[i] > 0.4 ? C.mute : C.ink }}>{label}</div>
          <div style={{ fontSize: 26, color: C.mute, fontWeight: 600 }}>{time}</div>
          <Chip bg="#ede9fe" fg={C.violet} style={{ fontSize: 22 }}>{who}</Chip>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 224, right: 48, top: rowY(5), height: 98, borderRadius: 20, background: '#fff', border: `2px solid ${C.blue}`, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 24, ...rise(t, 8.5, 9.1) }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, border: '3px solid #cbd5e1' }} />
        <div style={{ flex: 1, fontSize: 30, fontWeight: 600 }}>Call Zafar Estates about the site plan</div>
        <div style={{ fontSize: 26, color: C.mute, fontWeight: 600 }}>16:00</div>
        <Chip bg="#ede9fe" fg={C.violet} style={{ fontSize: 22 }}>AK</Chip>
      </div>
      <Cursor t={t} keys={cursor} clicks={[2.2, 5.4, 8.4]} />
    </Shell>
  )
}

/* ── CRM: invoice ──────────────────────────────────────────────── */
const INV_LINES = [['Website audit', 1, 45000], ['Monthly SEO retainer', 2, 60000]]

function CrmInvoice({ t }) {
  const sent = t >= 5.8
  const paid = t >= 8.6
  const total = INV_LINES.reduce((s, [, q, p]) => s + q * p, 0)
  const cursor = [[0, 900, 820], [4.4, 640, 800], [5.5, 440, 806], [6.4, 440, 806], [8.0, 940, 760]]
  const field = (label, value, top) => (
    <div style={{ position: 'absolute', left: 248, top, width: 480 }}>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, color: C.mute, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 6, padding: '12px 18px', borderRadius: 14, border: `2px solid ${C.line}`, background: '#fff', fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  )
  return (
    <Shell product="Nexora CRM" sidebar={['Dashboard', 'Leads', 'Customers', 'Pipeline', 'Invoices', 'Tasks']} active={4} title="New invoice" fade={loopFade(t)}>
      {field('Customer', 'Hassan Traders', 190)}
      {field('Invoice number', 'INV-2026-0042', 320)}
      <div style={{ position: 'absolute', left: 248, top: 450, width: 480 }}>
        <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, letterSpacing: 2, color: C.mute, textTransform: 'uppercase', paddingBottom: 8, borderBottom: `2px solid ${C.line}` }}><span style={{ flex: 1 }}>Item</span><span style={{ width: 70 }}>Qty</span><span style={{ width: 130, textAlign: 'right' }}>Amount</span></div>
        {INV_LINES.map(([n, q, p], i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', padding: '16px 0', borderBottom: `2px solid ${C.line}`, fontSize: 25, fontWeight: 600, ...rise(t, 1.4 + i * 1.5) }}><span style={{ flex: 1 }}>{n}</span><span style={{ width: 70, color: C.mute }}>{q}</span><span style={{ width: 130, textAlign: 'right' }}>{fmt(q * p)}</span></div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, fontSize: 32, fontWeight: 800, ...rise(t, 4.0) }}><span>Total</span><span>{pkr(total)}</span></div>
      </div>
      <Btn style={{ position: 'absolute', left: 248, top: 780, width: 360, height: 76, background: sent ? C.green : C.ink }}>{sent ? '✓ Invoice created' : 'Create invoice'}</Btn>
      <div style={{ position: 'absolute', left: 780, top: 190, width: 452, height: 680, borderRadius: 22, background: '#fff', border: `2px solid ${C.line}`, boxShadow: '0 30px 60px -30px rgba(15,23,42,.35)', padding: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 800 }}>INVOICE</div>
          <Chip bg={paid ? C.greenSoft : sent ? C.amberSoft : '#f1f5f9'} fg={paid ? '#047857' : sent ? '#b45309' : C.mute}>{paid ? 'Paid' : sent ? 'Sent' : 'Draft'}</Chip>
        </div>
        <div style={{ marginTop: 6, fontSize: 22, color: C.mute }}>INV-2026-0042 · Hassan Traders</div>
        <div style={{ marginTop: 30, borderTop: `2px solid ${C.line}` }}>
          {INV_LINES.map(([n, q, p], i) => <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: `2px solid ${C.line}`, fontSize: 23, fontWeight: 600, ...rise(t, 1.5 + i * 1.5) }}><span>{n} × {q}</span><span>{fmt(q * p)}</span></div>)}
        </div>
        <div style={{ marginTop: 26, display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 800, ...rise(t, 4.1) }}><span>Total</span><span>{pkr(total)}</span></div>
        {paid ? <div style={{ marginTop: 40, padding: '20px 22px', borderRadius: 18, background: C.greenSoft, color: '#047857', fontSize: 25, fontWeight: 700, ...rise(t, 8.6, 9.1) }}>✓ Payment received · {pkr(total)}</div> : null}
      </div>
      <Cursor t={t} keys={cursor} clicks={[5.6]} />
    </Shell>
  )
}

/* ── POS: billing ──────────────────────────────────────────────── */
const MENU = [['Zinger Burger', 650], ['Beef Burger', 790], ['Crispy Fries', 250], ['Cola', 120], ['Fajita Pizza', 1350], ['Brownie', 380]]
const itemX = (i) => 224 + (i % 2) * 280
const itemY = (i) => 215 + Math.floor(i / 2) * 215

function PosBilling({ t }) {
  const taps = [[2.0, 0], [3.4, 2], [4.6, 3], [6.0, 0]]
  const qty = (idx) => taps.filter(([at, i]) => t >= at + 0.15 && i === idx).length
  const lines = [0, 2, 3].filter((i) => qty(i) > 0)
  const total = MENU.reduce((s, [, p], i) => s + p * qty(i), 0)
  const shown = lerp(0, total, 1)
  const flash = (idx) => taps.some(([at, i]) => i === idx && t >= at && t < at + 0.35)
  const sentKot = t >= 8.5
  const centre = (i) => [itemX(i) + 130, itemY(i) + 80]
  const keys = [[0, 900, 820], [1.5, ...centre(0)], [3.0, ...centre(0)], [3.3, ...centre(2)], [4.3, ...centre(2)], [4.5, ...centre(3)], [5.6, ...centre(3)], [5.9, ...centre(0)], [7.0, ...centre(0)], [8.2, 1020, 836], [11.0, 1020, 836]]
  return (
    <Shell product="Nexora Restaurant POS" sidebar={['Billing', 'Tables', 'Orders / KOT', 'Kitchen', 'Inventory', 'Reports']} active={0} title="Billing" fade={loopFade(t)}>
      <div style={{ position: 'absolute', left: 224, top: 170, display: 'flex', gap: 12 }}>
        {['Burgers', 'Pizza', 'Drinks', 'Desserts'].map((c, i) => <Chip key={c} bg={i === 0 ? C.ink : '#fff'} fg={i === 0 ? '#fff' : C.mute} style={{ fontSize: 22, border: `2px solid ${i === 0 ? C.ink : C.line}` }}>{c}</Chip>)}
      </div>
      {MENU.map(([n, p], i) => (
        <div key={n} style={{ position: 'absolute', left: itemX(i), top: itemY(i) + 24, width: 262, height: 186, borderRadius: 22, background: flash(i) ? C.blueSoft : '#fff', border: `2px solid ${flash(i) ? C.blue : C.line}`, padding: 22, transform: `scale(${flash(i) ? 0.96 : 1})` }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: ['#fde68a', '#fecaca', '#fed7aa', '#bae6fd', '#fca5a5', '#d6bcfa'][i] }} />
          <div style={{ marginTop: 14, fontSize: 28, fontWeight: 700 }}>{n}</div>
          <div style={{ fontSize: 24, color: C.mute, fontWeight: 600 }}>{pkr(p)}</div>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 820, top: 170, width: 412, height: 730, borderRadius: 24, background: '#fff', border: `2px solid ${C.line}`, boxShadow: '0 30px 60px -30px rgba(15,23,42,.35)', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 32, fontWeight: 800 }}>Table 5</div><Chip>Dine-in</Chip></div>
        <div style={{ marginTop: 22, borderTop: `2px solid ${C.line}` }}>
          {lines.map((i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 0', borderBottom: `2px solid ${C.line}`, fontSize: 25, fontWeight: 600, ...rise(t, [2.0, 3.4, 4.6][lines.indexOf(i)] + 0.1, [2.0, 3.4, 4.6][lines.indexOf(i)] + 0.5) }}><span>{qty(i)} × {MENU[i][0]}</span><span>{fmt(MENU[i][1] * qty(i))}</span></div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 28, right: 28, bottom: 130, display: 'flex', justifyContent: 'space-between', fontSize: 34, fontWeight: 800 }}><span>Total</span><span>{pkr(shown)}</span></div>
        <Btn style={{ position: 'absolute', left: 28, right: 28, bottom: 30, height: 80, background: sentKot ? C.green : C.ink }}>{sentKot ? '✓ KOT sent' : 'Send KOT'}</Btn>
      </div>
      {t >= 8.6 && t < 11.4 ? <div style={{ position: 'absolute', left: 470, top: 92, width: 500, padding: '14px 26px', borderRadius: 20, background: C.ink, color: '#fff', fontSize: 28, fontWeight: 700, ...rise(t, 8.6, 9.0) }}>KOT #1042 sent to the kitchen</div> : null}
      <Cursor t={t} keys={keys} clicks={[2.0, 3.4, 4.6, 6.0, 8.4]} />
    </Shell>
  )
}

/* ── POS: tables ───────────────────────────────────────────────── */
const TABLE_STATE = ['occ', 'occ', 'bill', 'free', 'free', 'occ', 'free', 'bill', 'free', 'occ', 'free', 'free']
const TONE = { free: [C.greenSoft, '#047857', 'Free'], occ: [C.blueSoft, C.blue, 'Occupied'], bill: [C.amberSoft, '#b45309', 'Bill'] }
const tableX = (i) => 240 + (i % 4) * 175
const tableY = (i) => 340 + Math.floor(i / 4) * 190

function PosTables({ t }) {
  const opened = t >= 5.5
  const selected = t >= 3.0
  const states = TABLE_STATE.map((s, i) => (i === 6 && opened ? 'occ' : s))
  const count = (k) => states.filter((s) => s === k).length
  const cx = tableX(6) + 75
  const cy = tableY(6) + 70
  const keys = [[0, 900, 840], [2.4, cx, cy], [3.6, cx, cy], [4.7, 1096, 676], [6.6, 1096, 676], [8.4, 900, 800]]
  return (
    <Shell product="Nexora Restaurant POS" sidebar={['Billing', 'Tables', 'Orders / KOT', 'Kitchen', 'Inventory', 'Reports']} active={1} title="Tables" fade={loopFade(t)}>
      <div style={{ position: 'absolute', left: 240, top: 186, display: 'flex', gap: 14 }}>
        <Chip bg={C.greenSoft} fg="#047857">Free {count('free')}</Chip>
        <Chip bg={C.blueSoft} fg={C.blue}>Occupied {count('occ')}</Chip>
        <Chip bg={C.amberSoft} fg="#b45309">Waiting for bill {count('bill')}</Chip>
      </div>
      {states.map((s, i) => {
        const [bg, fg, label] = TONE[s]
        const sel = i === 6 && selected
        return (
          <div key={i} style={{ position: 'absolute', left: tableX(i), top: tableY(i), width: 150, height: 150, borderRadius: 26, background: bg, border: `4px solid ${sel ? C.ink : bg}`, display: 'grid', placeItems: 'center', textAlign: 'center', transform: `scale(${sel ? 1.06 : 1})` }}>
            <div><div style={{ fontSize: 40, fontWeight: 800, color: fg }}>T{i + 1}</div><div style={{ fontSize: 20, fontWeight: 700, color: fg }}>{label}</div></div>
          </div>
        )
      })}
      <div style={{ position: 'absolute', left: 960, top: 330, width: 272, height: 420, borderRadius: 24, background: '#fff', border: `2px solid ${C.line}`, boxShadow: '0 30px 60px -30px rgba(15,23,42,.35)', padding: 26, ...rise(t, 3.0, 3.5), opacity: ease(seg(t, 3.0, 3.5)) }}>
        <div style={{ fontSize: 34, fontWeight: 800 }}>Table 7</div>
        <div style={{ marginTop: 6, fontSize: 24, color: C.mute }}>4 seats</div>
        <div style={{ marginTop: 18 }}><Chip bg={opened ? C.blueSoft : C.greenSoft} fg={opened ? C.blue : '#047857'}>{opened ? 'Occupied' : 'Free'}</Chip></div>
        {opened ? <div style={{ marginTop: 26, fontSize: 25, fontWeight: 700, color: '#047857', ...rise(t, 5.6, 6.1) }}>✓ Order #1043 opened</div> : <Btn style={{ position: 'absolute', left: 26, right: 26, bottom: 30, height: 72, fontSize: 26 }}>Open order</Btn>}
      </div>
      <Cursor t={t} keys={keys} clicks={[3.0, 5.4]} />
    </Shell>
  )
}

/* ── POS: daily report ─────────────────────────────────────────── */
function Panel({ x, y, w, h, title, children, style }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 24, background: '#fff', border: `2px solid ${C.line}`, padding: 28, boxShadow: '0 20px 40px -26px rgba(15,23,42,.3)', ...style }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.mute }}>{title}</div>
      {children}
    </div>
  )
}

function Bar({ label, value, max, k, color }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 600 }}><span>{label}</span><span>{pkr(value * k)}</span></div>
      <div style={{ marginTop: 8, height: 26, borderRadius: 13, background: '#f1f5f9' }}><div style={{ width: `${(value / max) * 100 * k}%`, height: 26, borderRadius: 13, background: color }} /></div>
    </div>
  )
}

function PosReports({ t }) {
  const total = lerp(0, 184500, ease(seg(t, 0.4, 2.4)))
  const k1 = ease(seg(t, 3.2, 5.2))
  const k2 = ease(seg(t, 6.6, 8.4))
  return (
    <Shell product="Nexora Restaurant POS" sidebar={['Billing', 'Tables', 'Orders / KOT', 'Kitchen', 'Inventory', 'Reports']} active={5} title="Daily report" fade={loopFade(t)} right={<Chip bg="#f1f5f9" fg={C.mute}>End of day</Chip>}>
      <Panel x={224} y={190} w={1008} h={170} title="Total sales today" style={rise(t, 0.2, 0.6)}>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 28 }}><span style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>{pkr(total)}</span><span style={{ fontSize: 28, color: C.mute, fontWeight: 600 }}>105 orders</span></div>
      </Panel>
      <Panel x={224} y={390} w={496} h={350} title="By order type" style={rise(t, 3.0, 3.5)}>
        <Bar label="Dine-in" value={112000} max={112000} k={k1} color={C.blue} />
        <Bar label="Takeaway" value={46500} max={112000} k={k1} color={C.violet} />
        <Bar label="Delivery" value={26000} max={112000} k={k1} color={C.amber} />
      </Panel>
      <Panel x={736} y={390} w={496} h={350} title="Payments" style={rise(t, 6.4, 6.9)}>
        <Bar label="Cash" value={98000} max={98000} k={k2} color={C.green} />
        <Bar label="Card" value={61500} max={98000} k={k2} color={C.blue} />
        <Bar label="Other" value={25000} max={98000} k={k2} color="#94a3b8" />
      </Panel>
      <Panel x={224} y={756} w={1008} h={170} title="Cashiers" style={rise(t, 8.6, 9.1)}>
        {[['Ayesha', '61 orders', 104200], ['Bilal', '44 orders', 80300]].map(([n, o, v]) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 28, fontWeight: 600 }}><span>{n}</span><span style={{ color: C.mute }}>{o}</span><span>{pkr(v)}</span></div>
        ))}
      </Panel>
    </Shell>
  )
}

const SCENES = { 'crm-pipeline': CrmPipeline, 'crm-followups': CrmFollowups, 'crm-invoice': CrmInvoice, 'pos-billing': PosBilling, 'pos-tables': PosTables, 'pos-reports': PosReports }

export default function ProductClipStage({ clip, t }) {
  const Scene = SCENES[clip]
  return Scene ? <Scene t={t} /> : null
}
