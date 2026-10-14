import { NEXORA_INTRO, NEXORA_INTRO_SCENES } from '../../lib/nexoraIntroData.js'

/**
 * One frame of the Nexora intro video at time t (seconds), drawn in a fixed
 * 1280 x 720 space. Every frame is a pure function of t, so the MP4 is made by
 * setting t and taking screenshots (scripts/render-nexora-video.mjs). All data
 * shown inside the mock screens is sample data.
 */
const W = NEXORA_INTRO.width
const H = NEXORA_INTRO.height
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x) => 1 - (1 - clamp(x)) ** 3
const easeIO = (x) => { const c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - ((-2 * c + 2) ** 3) / 2 }
const seg = (t, a, b) => clamp((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const fmtN = (n) => Math.round(n).toLocaleString('en-US')

const TONES = {
  blue: ['#3b82f6', 'rgba(59,130,246,.16)'], violet: ['#8b5cf6', 'rgba(139,92,246,.16)'], emerald: ['#10b981', 'rgba(16,185,129,.16)'],
  amber: ['#f59e0b', 'rgba(245,158,11,.16)'], rose: ['#f43f5e', 'rgba(244,63,94,.16)'], cyan: ['#06b6d4', 'rgba(6,182,212,.16)'],
  orange: ['#f97316', 'rgba(249,115,22,.16)'], sky: ['#0ea5e9', 'rgba(14,165,233,.16)'],
}

function Card({ className = '', style, children }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.05] ${className}`} style={style}>{children}</div>
}
function Chip({ tone = 'blue', children, style }) {
  const [fg, bg] = TONES[tone]
  return <span className="inline-flex items-center rounded-full px-3 py-1 text-[16px] font-semibold" style={{ color: fg, background: bg, border: `1px solid ${fg}55`, ...style }}>{children}</span>
}
function Head({ eyebrow, title, tone = 'blue', tag }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="font-mono text-[15px] uppercase tracking-[0.2em]" style={{ color: TONES[tone][0] }}>{eyebrow}</p>
        <h3 className="mt-1 font-display text-[46px] font-bold leading-tight text-white">{title}</h3>
      </div>
      {tag ? <Chip tone={tone}>{tag}</Chip> : null}
    </div>
  )
}
const rise = (s, a, b = a + 0.6) => ({ opacity: ease(seg(s, a, b)), transform: `translateY(${(1 - ease(seg(s, a, b))) * 22}px)` })

/* 1 ── the problem ───────────────────────────── */
const MESS = [
  ['Excel sheets', 150, 250, -6], ['Paper bills', 990, 230, 5], ['WhatsApp chats', 260, 440, 4], ['Notebooks', 880, 430, -4],
  ['Calculator', 520, 200, 3], ['Five different apps', 650, 500, -3], ['Missed follow-ups', 90, 520, 6], ['Stock guesswork', 1010, 540, -5],
]
function Hook({ s }) {
  const pull = easeIO(seg(s, 3.0, 4.4))
  const logoIn = ease(seg(s, 4.2, 5.2))
  return (
    <div className="absolute inset-0">
      <p style={{ ...rise(s, 0.2, 1.0), opacity: ease(seg(s, 0.2, 1.0)) * (1 - seg(s, 3.0, 3.8)) }} className="absolute inset-x-0 top-[110px] text-center font-display text-[58px] font-bold leading-tight text-white">
        Too many tools. <span className="text-rose-300">Too many tabs.</span>
      </p>
      {MESS.map(([label, x, y, rot], i) => {
        const a = ease(seg(s, 0.6 + i * 0.18, 1.2 + i * 0.18))
        const drift = Math.sin(s * 1.3 + i) * 6
        const cx = lerp(x, 640, pull); const cy = lerp(y + drift, 360, pull)
        return (
          <div key={label} className="absolute rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-display text-[22px] font-semibold text-slate-100" style={{ left: cx - 100, top: cy - 24, opacity: a * (1 - pull), transform: `rotate(${rot * (1 - pull)}deg) scale(${1 - pull * 0.6})` }}>{label}</div>
        )
      })}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: logoIn, transform: `scale(${0.7 + 0.3 * logoIn})` }}>
        <img src="/nexora-brand-logo.png" alt="" width={150} height={150} className="rounded-3xl shadow-[0_0_80px_rgba(99,102,241,.6)]" />
        <p className="mt-6 font-display text-[64px] font-bold tracking-tight text-white">Nexora Solution</p>
        <p style={{ opacity: ease(seg(s, 5.2, 6)) }} className="mt-1 text-[26px] text-slate-300">One cloud platform for your whole business.</p>
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
  const cx = 640; const cy = 415; const rx = 440; const ry = 215
  const sway = Math.sin(s * 0.6) * 0.08
  return (
    <div className="absolute inset-0">
      <div className="absolute left-20 top-[74px]" style={rise(s, 0.2)}>
        <h3 className="font-display text-[50px] font-bold leading-tight text-white">One platform. <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">One login.</span></h3>
        <p className="mt-1 text-[22px] text-slate-300">Pick the modules your business needs. Add more later.</p>
      </div>
      <svg className="absolute inset-0" width={W} height={H} aria-hidden="true">
        {MODULES.map(([, tone], i) => {
          const a = (i / MODULES.length) * Math.PI * 2 - Math.PI / 2 + sway
          const p = ease(seg(s, 0.8 + i * 0.35, 1.5 + i * 0.35))
          return <line key={i} x1={cx} y1={cy} x2={lerp(cx, cx + Math.cos(a) * rx, p)} y2={lerp(cy, cy + Math.sin(a) * ry, p)} stroke={TONES[tone][0]} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="6 6" />
        })}
      </svg>
      {MODULES.map(([name, tone], i) => {
        const a = (i / MODULES.length) * Math.PI * 2 - Math.PI / 2 + sway
        const p = ease(seg(s, 1.0 + i * 0.35, 1.6 + i * 0.35))
        const x = cx + Math.cos(a) * rx * p; const y = cy + Math.sin(a) * ry * p
        return (
          <div key={name} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-5 py-2.5 font-display text-[22px] font-semibold text-white" style={{ left: x, top: y, opacity: p, background: TONES[tone][1], border: `1.5px solid ${TONES[tone][0]}` }}>{name}</div>
        )
      })}
      <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: cx, top: cy, opacity: ease(seg(s, 0.3, 1.0)) }}>
        <div className="absolute h-44 w-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,.5), transparent 70%)', transform: `scale(${1 + Math.sin(s * 2.4) * 0.08})` }} />
        <img src="/nexora-brand-logo.png" alt="" width={104} height={104} className="relative rounded-2xl" />
        <p className="relative mt-2 font-display text-[22px] font-bold text-white">Nexora AI</p>
      </div>
    </div>
  )
}

/* 3 ── restaurant POS ───────────────────────────── */
function Restaurant({ s }) {
  const items = [['Burger Meal', 2, 2500, 2.6], ['Coffee Combo', 1, 680, 3.6], ['Fries', 1, 320, 4.6]]
  const sub = items.reduce((t, it) => t + it[2] * ease(seg(s, it[3], it[3] + 0.4)), 0)
  const tax = sub * 0.05
  const kds = s < 5.6 ? 0 : s < 6.8 ? 1 : 2
  const tables = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Restaurant POS" title="From table to kitchen, in seconds" tone="orange" tag="Works offline" />
      <div className="mt-6 grid grid-cols-[260px_1fr_300px] gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="p-5">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-slate-400">Tables</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {tables.map((t, i) => {
              const busy = (i === 3 && s > 1.4) || i === 1
              return <div key={t} className="rounded-xl py-4 text-center font-display text-[24px] font-bold" style={{ background: busy ? TONES.orange[1] : 'rgba(255,255,255,.06)', color: busy ? '#fdba74' : '#cbd5e1', border: `1.5px solid ${busy ? '#f97316' : 'rgba(255,255,255,.12)'}`, transform: i === 3 ? `scale(${1 + 0.06 * Math.sin(clamp(s - 1.4, 0, 1) * Math.PI)})` : 'none' }}>{t}</div>
            })}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-slate-400">Table 4 · Order</p>
          <div className="mt-3 space-y-2">
            {items.map(([n, q, price, at]) => (
              <div key={n} className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3 text-[22px]" style={rise(s, at)}>
                <span className="text-white">{n} <span className="text-slate-400">× {q}</span></span><span className="font-mono text-slate-200">PKR {fmtN(price)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t border-white/10 pt-3 font-mono text-[20px] text-slate-300">
            <div className="flex justify-between"><span>Subtotal</span><span>PKR {fmtN(sub)}</span></div>
            <div className="flex justify-between"><span>Service tax 5%</span><span>PKR {fmtN(tax)}</span></div>
            <div className="flex justify-between text-[26px] font-bold text-white"><span>Total</span><span>PKR {fmtN(sub + tax)}</span></div>
          </div>
        </Card>
        <Card className="p-5" style={{ opacity: ease(seg(s, 5.0, 5.8)), transform: `translateX(${(1 - ease(seg(s, 5.0, 5.8))) * 50}px)` }}>
          <p className="text-[15px] font-semibold uppercase tracking-wider text-slate-400">Kitchen display</p>
          <div className="mt-3 rounded-xl border border-orange-400/40 bg-orange-400/10 p-4">
            <p className="font-display text-[24px] font-bold text-orange-200">KOT #112 · Table 4</p>
            <p className="mt-2 text-[19px] leading-7 text-slate-200">2 × Burger Meal<br />1 × Coffee Combo<br />1 × Fries</p>
            <div className="mt-3"><Chip tone={kds === 2 ? 'emerald' : 'amber'}>{kds === 0 ? 'Sent to kitchen' : kds === 1 ? 'Preparing' : 'Ready to serve'}</Chip></div>
          </div>
          <p style={{ opacity: ease(seg(s, 6.8, 7.4)) }} className="mt-4 text-[17px] leading-6 text-slate-300">Split the bill, print the receipt, close the table.</p>
        </Card>
      </div>
    </div>
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
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Retail POS · Pharmacy POS" title="Scan, sell and never miss an expiry" tone="blue" />
      <div className="mt-6 grid grid-cols-2 gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="font-display text-[26px] font-semibold text-white">Retail counter</p><Chip tone="blue">Barcode ready</Chip></div>
          <div className="relative mt-4 h-[96px] overflow-hidden rounded-xl bg-white/90">
            <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-8">
              {Array.from({ length: 46 }, (_, i) => <span key={i} className="h-[60px] bg-slate-900" style={{ width: [2, 4, 3, 5, 2, 3][i % 6] }} />)}
            </div>
            <div className="absolute inset-y-0 w-[3px] bg-rose-500" style={{ left: `${scanX}%`, boxShadow: '0 0 18px 4px rgba(244,63,94,.7)' }} />
          </div>
          <div className="mt-4 space-y-2">
            {cart.map(([n, p, at]) => <div key={n} className="flex justify-between rounded-xl bg-white/[0.06] px-4 py-2.5 text-[21px]" style={rise(s, at)}><span className="text-white">{n}</span><span className="font-mono text-slate-200">PKR {fmtN(p)}</span></div>)}
          </div>
          <div className="mt-3 flex items-center justify-between"><span className="text-[18px] text-slate-400">Cotton Shirt stock: <span className="font-mono text-slate-100">{stock}</span> left</span><span className="font-display text-[30px] font-bold text-white">PKR {fmtN(total)}</span></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="font-display text-[26px] font-semibold text-white">Pharmacy shelf</p><Chip tone="rose">Batch + expiry</Chip></div>
          <div className="mt-4 space-y-3">
            {meds.map(([n, b, e, tone], i) => (
              <div key={n} className="rounded-xl border px-4 py-3" style={{ ...rise(s, 1.2 + i * 1.1), borderColor: `${TONES[tone][0]}66`, background: TONES[tone][1] }}>
                <p className="text-[22px] font-semibold text-white">{n}</p>
                <div className="mt-1 flex items-center justify-between"><span className="font-mono text-[17px] text-slate-300">{b}</span><span className="text-[18px] font-semibold" style={{ color: TONES[tone][0] }}>{e}</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* 5 ── school ERP ───────────────────────────── */
function School({ s }) {
  const pct = 78 * ease(seg(s, 0.8, 2.6))
  const r = 80; const c = 2 * Math.PI * r
  const names = ['Ayesha', 'Hamza', 'Zainab', 'Bilal', 'Hira']
  const marks = [[1, 1, 1, 0, 1], [1, 1, 1, 1, 1], [1, 0, 1, 1, 1], [1, 1, 0, 1, 1], [1, 1, 1, 1, 0]]
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="School ERP" title="Fees, attendance and exams, sorted" tone="emerald" tag="Sample data" />
      <div className="mt-6 grid grid-cols-[330px_1fr_300px] gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="flex flex-col items-center p-5">
          <p className="self-start text-[15px] font-semibold uppercase tracking-wider text-slate-400">This month's fees</p>
          <div className="relative mt-3 h-[210px] w-[210px]">
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90"><circle cx="100" cy="100" r={r} fill="none" stroke="rgba(148,163,184,.2)" strokeWidth="16" /><circle cx="100" cy="100" r={r} fill="none" stroke="#10b981" strokeWidth="16" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} /></svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-[52px] font-bold text-white">{Math.round(pct)}%</span><span className="text-[16px] text-slate-400">collected</span></div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-slate-400">Attendance · this week</p>
          <div className="mt-3 grid grid-cols-[130px_repeat(5,1fr)] gap-y-2 text-center text-[20px]">
            <span />{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => <span key={d} className="text-[16px] text-slate-400">{d}</span>)}
            {names.map((n, i) => (
              <div key={n} className="contents">
                <span className="text-left text-slate-200">{n}</span>
                {marks[i].map((m, j) => { const on = ease(seg(s, 1.4 + i * 0.35 + j * 0.08, 1.8 + i * 0.35 + j * 0.08)); return <span key={j} className="font-bold" style={{ opacity: on, color: m ? '#34d399' : '#fb7185' }}>{m ? '✓' : '✕'}</span> })}
              </div>
            ))}
          </div>
        </Card>
        <div className="flex flex-col gap-4">
          {[['Exam results', 'Marks to report cards', 4.0], ['Staff payroll', 'Salaries and slips', 4.8], ['Parent contact', 'Fee reminders', 5.6]].map(([t, d, at]) => (
            <Card key={t} className="px-5 py-4" style={rise(s, at)}><p className="font-display text-[24px] font-semibold text-white">{t}</p><p className="text-[17px] text-slate-400">{d}</p></Card>
          ))}
        </div>
      </div>
    </div>
  )
}

/* 6 ── CRM + WhatsApp ───────────────────────────── */
function Crm({ s }) {
  const cols = ['New', 'Follow-up', 'Won']
  const mv = easeIO(seg(s, 3.2, 4.2)); const mv2 = easeIO(seg(s, 5.2, 6.2))
  const col = mv2 > 0 ? 2 : mv > 0 ? 1 : 0
  const cardX = 20 + lerp(lerp(0, 1, mv), 2, mv2) * 188
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="CRM · WhatsApp CRM" title="Every chat becomes a lead" tone="violet" tag="Sample data" />
      <div className="mt-6 grid grid-cols-[1fr_1.35fr] gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="p-5">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-slate-400">WhatsApp inbox</p>
          <div className="mt-3 space-y-3 text-[21px]">
            <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 text-slate-100" style={rise(s, 0.6)}>Salam, 20 shirts ka rate kya hoga?</div>
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-emerald-500/25 px-4 py-3 text-emerald-100" style={rise(s, 1.6)}>Ji, quotation bhej raha hoon.</div>
          </div>
          <div className="mt-5 rounded-xl border border-violet-400/40 bg-violet-400/10 px-4 py-3" style={rise(s, 2.4)}>
            <p className="text-[15px] font-semibold uppercase tracking-wider text-violet-300">New lead created</p>
            <p className="text-[22px] font-semibold text-white">Ali Traders · via WhatsApp</p>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-slate-400">Sales pipeline</p>
          <div className="relative mt-3 grid grid-cols-3 gap-3">
            {cols.map((cn, i) => (
              <div key={cn} className="h-[250px] rounded-xl bg-white/[0.05] p-3"><p className="text-[17px] font-semibold text-slate-300">{cn}</p>
                {i === 0 ? <div className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-[17px] text-slate-200" style={{ opacity: col === 0 ? 0 : 1 }}>Noor Stores</div> : null}
              </div>
            ))}
            <div className="absolute top-[78px] w-[180px] rounded-lg border px-3 py-2 text-[18px] font-semibold text-white" style={{ left: cardX, opacity: ease(seg(s, 2.6, 3.2)), background: col === 2 ? 'rgba(16,185,129,.3)' : 'rgba(139,92,246,.3)', borderColor: col === 2 ? '#10b981' : '#8b5cf6' }}>Ali Traders<span className="block text-[14px] font-normal text-slate-200">PKR 78,000 quote</span></div>
          </div>
          <p style={{ opacity: ease(seg(s, 6.2, 7)) }} className="mt-3 text-[19px] text-emerald-300">Deal won. Invoice ready in one click.</p>
        </Card>
      </div>
    </div>
  )
}

/* 7 ── fleet + property ───────────────────────────── */
function Fleet({ s }) {
  const veh = [['Toyota Corolla', 0.0, 0.55, 'blue'], ['Honda Civic', 0.3, 0.9, 'cyan'], ['Suzuki Bolan', 0.1, 0.45, 'violet'], ['Hiace Van', 0.5, 1.0, 'emerald']]
  const rent = [['Shop 3 · Mall Rd', 'Paid', 'emerald', 2.8], ['Flat 12 · Block B', 'Paid', 'emerald', 3.5], ['Office 7 · Gulberg', 'Due', 'amber', 4.2]]
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Transport & Fleet · Property ERP" title="Vehicles and rent, under control" tone="cyan" tag="Sample data" />
      <div className="mt-6 grid grid-cols-2 gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="p-5">
          <p className="font-display text-[26px] font-semibold text-white">Rental bookings</p>
          <div className="mt-4 space-y-4">
            {veh.map(([n, a, b, tone], i) => {
              const p = ease(seg(s, 0.8 + i * 0.6, 1.8 + i * 0.6))
              return <div key={n}><p className="text-[19px] text-slate-200">{n}</p><div className="relative mt-1 h-6 rounded-full bg-white/[0.07]"><div className="absolute inset-y-0 rounded-full" style={{ left: `${a * 100}%`, width: `${(b - a) * 100 * p}%`, background: TONES[tone][0] }} /></div></div>
            })}
          </div>
          <p style={{ opacity: ease(seg(s, 4, 4.8)) }} className="mt-4 text-[18px] text-slate-300">Customer ledgers, payments and dues per booking.</p>
        </Card>
        <Card className="p-5">
          <p className="font-display text-[26px] font-semibold text-white">Rent collection</p>
          <div className="mt-4 space-y-3">
            {rent.map(([n, st, tone, at]) => <div key={n} className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3" style={rise(s, at - 1.6)}><span className="text-[21px] text-white">{n}</span><Chip tone={tone}>{st}</Chip></div>)}
          </div>
          <div className="mt-4 flex gap-2" style={{ opacity: ease(seg(s, 4.4, 5.2)) }}><Chip tone="amber">Leases</Chip><Chip tone="blue">Maintenance</Chip><Chip tone="violet">Owner reports</Chip></div>
        </Card>
      </div>
    </div>
  )
}

/* 8 ── Nexora AI ───────────────────────────── */
function Ai({ s }) {
  const q = 'Which items sold the most this week?'
  const typed = q.slice(0, Math.floor(seg(s, 0.6, 2.6) * q.length))
  const bars = [['Burger Meal', 64, '#8b5cf6'], ['Coffee Combo', 41, '#3b82f6'], ['Fries', 29, '#06b6d4']]
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Nexora AI" title="Ask your business anything" tone="violet" tag="Built into every module" />
      <div className="mt-6 grid grid-cols-[1.25fr_0.75fr] gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="p-6">
          <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-violet-500/30 px-5 py-3 text-[23px] text-white">{typed}<span style={{ opacity: s < 2.8 ? 1 : 0 }}>|</span></div>
          <div className="mt-4 rounded-2xl rounded-bl-sm bg-white/[0.08] p-5" style={rise(s, 3.0)}>
            <p className="text-[20px] text-slate-300">Top sellers, last 7 days (units):</p>
            <div className="mt-3 space-y-3">
              {bars.map(([n, v, color], i) => <div key={n} className="grid grid-cols-[150px_1fr_50px] items-center gap-3 text-[20px]"><span className="text-slate-200">{n}</span><div className="h-4 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(v / 64) * 100 * ease(seg(s, 3.4 + i * 0.3, 4.4 + i * 0.3))}%`, background: color }} /></div><span className="font-mono text-slate-300">{Math.round(v * ease(seg(s, 3.4 + i * 0.3, 4.4 + i * 0.3)))}</span></div>)}
            </div>
          </div>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="p-5" style={rise(s, 4.6)}><p className="font-display text-[24px] font-semibold text-white">Menu import</p><p className="mt-1 text-[18px] leading-7 text-slate-300">Snap a photo of your menu. Items and prices fill in for you.</p></Card>
          <Card className="p-5" style={rise(s, 5.4)}><p className="font-display text-[24px] font-semibold text-white">Sales insights</p><p className="mt-1 text-[18px] leading-7 text-slate-300">Plain-language answers from your own data.</p></Card>
        </div>
      </div>
    </div>
  )
}

/* 9 ── custom + tools ───────────────────────────── */
function Custom({ s }) {
  const code = ['const app = nexora.build({', '  for: "your business",', '  modules: ["billing", "stock"],', '  platform: ["web", "android", "ios"],', '})']
  const tools = ['Invoice generator', 'Quotation generator', 'Pay stub generator']
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Custom software · Free tools" title="Need something different? We build it." tone="sky" />
      <div className="mt-6 grid grid-cols-[1.1fr_0.9fr] gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="p-5">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-400/80" /><span className="h-3 w-3 rounded-full bg-amber-300/80" /><span className="h-3 w-3 rounded-full bg-emerald-400/80" /></div>
          <div className="mt-4 whitespace-pre font-mono text-[21px] leading-9 text-sky-200">
            {code.map((l, i) => <div key={i} style={{ opacity: ease(seg(s, 0.6 + i * 0.5, 1.0 + i * 0.5)) }}>{l}</div>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2" style={{ opacity: ease(seg(s, 3.2, 4)) }}><Chip tone="blue">Custom software</Chip><Chip tone="violet">ERP development</Chip><Chip tone="emerald">Mobile apps</Chip><Chip tone="amber">Online stores</Chip></div>
        </Card>
        <Card className="p-5">
          <p className="font-display text-[26px] font-semibold text-white">Free business tools</p>
          <div className="mt-3 space-y-3">{tools.map((t, i) => <div key={t} className="rounded-xl bg-white/[0.07] px-4 py-3 text-[22px] text-white" style={rise(s, 1.4 + i * 0.5)}>{t}</div>)}</div>
          <p style={{ opacity: ease(seg(s, 3.4, 4.2)) }} className="mt-4 text-[19px] text-emerald-300">No signup. No watermark.</p>
        </Card>
      </div>
    </div>
  )
}

/* 10 ── close ───────────────────────────── */
function Close({ s }) {
  const chips = ['Full access to every module', 'No credit card', 'PKR billing', 'Urdu + English support', 'Offline POS billing']
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-20 text-center">
      <img src="/nexora-brand-logo.png" alt="" width={110} height={110} className="rounded-3xl shadow-[0_0_70px_rgba(99,102,241,.55)]" style={rise(s, 0.2)} />
      <h3 className="mt-6 font-display text-[64px] font-bold leading-[1.05] text-white" style={rise(s, 0.6)}>Start your <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">free 1-month trial</span></h3>
      <div className="mt-7 flex flex-wrap justify-center gap-3">{chips.map((c, i) => <span key={c} style={rise(s, 1.4 + i * 0.3)}><Chip tone={['blue', 'emerald', 'amber', 'violet', 'orange'][i]}>{c}</Chip></span>)}</div>
      <div className="mt-9 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-12 py-5 font-display text-[30px] font-bold text-white shadow-[0_0_60px_rgba(99,102,241,.55)]" style={rise(s, 3.2)}>nexorasolution.online</div>
      <p style={rise(s, 3.8)} className="mt-4 text-[22px] text-slate-300">POS, ERP and CRM for growing businesses.</p>
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
    <div className="absolute inset-x-0 bottom-[60px] flex justify-center gap-3 px-20">
      {items.map((it, i) => <span key={it} style={rise(s, a + i * 0.45)}><Chip tone={STRIP_TONES[i]} style={{ fontSize: 21, padding: '9px 20px' }}>{it}</Chip></span>)}
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
    <div className="relative overflow-hidden text-white" style={{ width: W, height: H, background: 'radial-gradient(1100px 620px at 75% -10%, #27338f 0%, #0b1236 45%, #050816 100%)' }}>
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      {idx > 0 && !last ? <div className="absolute left-20 top-5 z-10 flex items-center gap-2.5 opacity-90"><img src="/nexora-brand-logo.png" alt="" width={30} height={30} className="rounded-lg" /><span className="font-display text-[19px] font-bold tracking-tight">Nexora Solution</span></div> : null}
      <div className="absolute inset-0" style={{ opacity: clamp(fade) }}><View s={t - scene.start} />{STRIPS[scene.id] ? <Strip s={t - scene.start} items={STRIPS[scene.id]} dur={scene.end - scene.start} /> : null}</div>
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-1.5 px-20 pb-5">
        {NEXORA_INTRO_SCENES.map((sc, i) => <div key={sc.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400" style={{ width: `${(i < idx ? 1 : i === idx ? seg(t, sc.start, sc.end) : 0) * 100}%` }} /></div>)}
      </div>
    </div>
  )
}
