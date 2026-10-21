import { TOOLS_INTRO, TOOLS_INTRO_SCENES } from '../../lib/toolsIntroData.js'

/**
 * One frame of the free tools intro video at time t (seconds), drawn in a fixed
 * 1280 x 720 space. Every frame is a pure function of t, so the MP4 is made by
 * setting t and taking screenshots (scripts/render-tools-video.mjs). All data
 * shown inside the mock documents is sample data.
 */
const W = TOOLS_INTRO.width
const H = TOOLS_INTRO.height
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x) => 1 - (1 - clamp(x)) ** 3
const easeIO = (x) => { const c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - ((-2 * c + 2) ** 3) / 2 }
const seg = (t, a, b) => clamp((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const fmtN = (n) => Math.round(n).toLocaleString('en-US')
const rise = (s, a, b = a + 0.6) => ({ opacity: ease(seg(s, a, b)), transform: `translateY(${(1 - ease(seg(s, a, b))) * 22}px)` })

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

/** A white paper document, the thing every tool produces. */
function Paper({ className = '', style, children }) {
  return <div className={`rounded-xl bg-white p-5 text-slate-800 shadow-[0_30px_70px_-30px_rgba(0,0,0,.8)] ${className}`} style={style}>{children}</div>
}
function Lines({ rows, s, at = 0.6, step = 0.35 }) {
  return (
    <div className="space-y-2">
      {rows.map(([a, b], i) => (
        <div key={a} className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-[19px]" style={rise(s, at + i * step, at + i * step + 0.4)}>
          <span className="text-slate-700">{a}</span><span className="font-mono font-semibold text-slate-900">{b}</span>
        </div>
      ))}
    </div>
  )
}

/* 1 ── hook ───────────────────────────── */
const MESS = [
  ['Invoice in Excel', 150, 250, -6], ['Hand-written receipt', 980, 230, 5], ['Quote lost in chat', 250, 450, 4], ['Tax maths on a calculator', 880, 440, -4],
  ['Copy-paste template', 530, 200, 3], ['Payslip by hand', 90, 530, 6], ['Chasing payments', 1000, 550, -5],
]
function Hook({ s }) {
  const pull = easeIO(seg(s, 2.8, 4.2))
  const logoIn = ease(seg(s, 4.0, 5.0))
  return (
    <div className="absolute inset-0">
      <p style={{ opacity: ease(seg(s, 0.2, 1.0)) * (1 - seg(s, 2.8, 3.6)), transform: `translateY(${(1 - ease(seg(s, 0.2, 1))) * 22}px)` }} className="absolute inset-x-0 top-[110px] text-center font-display text-[58px] font-bold leading-tight text-white">
        Paperwork <span className="text-rose-300">shouldn’t cost a subscription.</span>
      </p>
      {MESS.map(([label, x, y, rot], i) => {
        const a = ease(seg(s, 0.6 + i * 0.2, 1.2 + i * 0.2))
        const drift = Math.sin(s * 1.3 + i) * 6
        const cx = lerp(x, 640, pull); const cy = lerp(y + drift, 360, pull)
        return <div key={label} className="absolute whitespace-nowrap rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-display text-[22px] font-semibold text-slate-100" style={{ left: cx - 110, top: cy - 24, opacity: a * (1 - pull), transform: `rotate(${rot * (1 - pull)}deg) scale(${1 - pull * 0.6})` }}>{label}</div>
      })}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: logoIn, transform: `scale(${0.7 + 0.3 * logoIn})` }}>
        <img src="/nexora-brand-logo.png" alt="" width={140} height={140} className="rounded-3xl shadow-[0_0_80px_rgba(99,102,241,.6)]" />
        <p className="mt-6 font-display text-[62px] font-bold tracking-tight text-white">Nexora Free Tools</p>
        <p style={{ opacity: ease(seg(s, 4.8, 5.6)) }} className="mt-1 text-[26px] text-slate-300">Invoices, quotes, receipts and pay stubs. Free.</p>
      </div>
    </div>
  )
}

/* 2 ── invoice generator ───────────────────────────── */
function Invoice({ s }) {
  const step = s < 2.2 ? 0 : s < 4.2 ? 1 : 2
  const steps = ['Your details', 'Items and tax', 'Download']
  const items = [['Website design', 'USD 1,200'], ['Hosting (12 mo)', 'USD 240'], ['Support plan', 'USD 360']]
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Free Invoice Generator" title="Three steps to a finished invoice" tone="blue" tag="160+ currencies" />
      <div className="mt-6 grid grid-cols-[300px_1fr] gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="p-5">
          <div className="space-y-3">
            {steps.map((st, i) => {
              const on = i <= step
              return (
                <div key={st} className="flex items-center gap-3 rounded-xl px-4 py-3 text-[21px]" style={{ background: i === step ? TONES.blue[1] : 'rgba(255,255,255,.04)', border: `1.5px solid ${i === step ? '#3b82f6' : 'rgba(255,255,255,.1)'}`, color: on ? '#fff' : '#94a3b8' }}>
                  <span className="grid h-8 w-8 place-items-center rounded-full font-display text-[18px] font-bold" style={{ background: on ? '#3b82f6' : 'rgba(255,255,255,.1)' }}>{i < step ? '✓' : i + 1}</span>{st}
                </div>
              )
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-2" style={{ opacity: ease(seg(s, 4.6, 5.4)) }}><Chip tone="emerald">PDF</Chip><Chip tone="amber">Excel</Chip></div>
          <p style={{ opacity: ease(seg(s, 5.4, 6.2)) }} className="mt-3 text-[17px] text-slate-300">Taxes, discounts and partial payments built in.</p>
        </Card>
        <Paper>
          <div className="flex items-start justify-between">
            <div><p className="font-display text-[30px] font-bold text-slate-900">INVOICE</p><p className="text-[16px] text-slate-500">No. 0042 · Due in 14 days</p></div>
            <div className="text-right text-[16px] text-slate-500" style={rise(s, 0.4)}>Billed to<br /><span className="font-semibold text-slate-800">Orbit Studio</span></div>
          </div>
          <div className="mt-4"><Lines rows={items} s={s} at={2.4} step={0.5} /></div>
          <div className="mt-4 ml-auto w-[300px] space-y-1 text-[19px]" style={rise(s, 4.0)}>
            <div className="flex justify-between text-slate-600"><span>Tax 8%</span><span className="font-mono">USD 144</span></div>
            <div className="flex justify-between font-display text-[26px] font-bold text-slate-900"><span>Total</span><span>USD {fmtN(1944 * ease(seg(s, 4.0, 5.0)))}</span></div>
          </div>
        </Paper>
      </div>
    </div>
  )
}

/* 3 ── regional invoices ───────────────────────────── */
function Regional({ s }) {
  const cards = [
    { k: 'GST', tone: 'orange', t: 'GST Invoice', rows: [['GSTIN', '27AAAPL…1Z5'], ['CGST + SGST 18%', '₹ 1,80,000'], ['Amount', '₹ 11,80,000']], badge: 'UPI QR' },
    { k: 'UAE', tone: 'emerald', t: 'UAE VAT Invoice', rows: [['TRN', '1002…0003'], ['VAT 5%', 'AED 250'], ['Total', 'AED 5,250']], badge: 'IBAN' },
    { k: 'CIS', tone: 'violet', t: 'CIS Invoice', rows: [['Labour', '£ 2,400'], ['VAT 20%', '£ 480'], ['CIS deduction', '− £ 480']], badge: 'GBP' },
  ]
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Made for your tax rules" title="GST, UAE VAT and UK CIS invoices" tone="orange" />
      <div className="mt-6 grid grid-cols-3 gap-5" style={{ minHeight: 372 }}>
        {cards.map((c, i) => (
          <Card key={c.k} className="flex flex-col p-5" style={rise(s, 0.4 + i * 0.7, 1.2 + i * 0.7)}>
            <div className="flex items-center justify-between"><p className="font-display text-[26px] font-bold text-white">{c.t}</p><Chip tone={c.tone}>{c.badge}</Chip></div>
            <div className="mt-4 space-y-3">
              {c.rows.map(([a, b], j) => (
                <div key={a} className="flex items-center justify-between rounded-xl bg-white/[0.07] px-4 py-3 text-[19px]" style={rise(s, 1.6 + i * 0.7 + j * 0.4, 2.0 + i * 0.7 + j * 0.4)}>
                  <span className="text-slate-300">{a}</span><span className="font-mono font-semibold text-white">{b}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-2 pt-4 text-[17px]" style={{ color: TONES[c.tone][0], opacity: ease(seg(s, 4.4 + i * 0.4, 5.2 + i * 0.4)) }}><span>✓</span> Ready to send as PDF</div>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-center text-[20px] text-slate-300" style={{ opacity: ease(seg(s, 5.6, 6.4)) }}>Plus a contractor invoice for hours, materials and sales tax.</p>
    </div>
  )
}

/* 4 ── quotation ───────────────────────────── */
function Quote({ s }) {
  const conv = easeIO(seg(s, 3.6, 4.8))
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Quotation Generator" title="Quote today, invoice with one click" tone="violet" tag="Validity + deposit" />
      <div className="mt-6 grid grid-cols-[1fr_120px_1fr] items-center gap-4" style={{ minHeight: 372 }}>
        <Paper style={{ ...rise(s, 0.3), transform: `translateX(${-conv * 6}px)` }}>
          <p className="font-display text-[28px] font-bold text-violet-700">QUOTATION</p>
          <p className="text-[16px] text-slate-500">Valid until 30 Nov</p>
          <div className="mt-3"><Lines rows={[['Kitchen fit-out', '4,800'], ['Materials', '2,150']]} s={s} at={1.0} step={0.5} /></div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2 text-[18px] text-violet-800" style={rise(s, 2.2)}><span>Deposit 30%</span><span className="font-mono font-bold">2,085</span></div>
          <p className="mt-3 font-display text-[22px] font-bold" style={rise(s, 2.8)}>Accepted ✓</p>
        </Paper>
        <div className="flex flex-col items-center" style={{ opacity: ease(seg(s, 3.2, 3.8)) }}>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[34px] text-white" style={{ transform: `scale(${1 + 0.15 * Math.sin(conv * Math.PI)})` }}>→</div>
          <p className="mt-2 text-center text-[16px] font-semibold text-slate-200">Convert</p>
        </div>
        <Paper style={{ opacity: conv, transform: `translateX(${(1 - conv) * 40}px) scale(${0.96 + 0.04 * conv})` }}>
          <p className="font-display text-[28px] font-bold text-blue-700">INVOICE</p>
          <p className="text-[16px] text-slate-500">From quotation Q-0108</p>
          <div className="mt-3"><Lines rows={[['Kitchen fit-out', '4,800'], ['Materials', '2,150']]} s={s - 4.2} at={0.2} step={0.3} /></div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-2 font-display text-[24px] font-bold text-slate-900"><span>Balance due</span><span>4,865</span></div>
        </Paper>
      </div>
    </div>
  )
}

/* 5 ── receipts and letterhead ───────────────────────────── */
function Receipt({ s }) {
  const rows = [['Latte × 2', '9.00'], ['Croissant', '3.50'], ['Water', '1.20']]
  const roll = s < 3.6 ? '58 mm' : '80 mm'
  const w = lerp(190, 250, easeIO(seg(s, 3.3, 3.9)))
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Receipts and letterhead" title="Print at the till, or on your own paper" tone="cyan" />
      <div className="mt-6 grid grid-cols-[360px_1fr] gap-8" style={{ minHeight: 372 }}>
        <div className="flex flex-col items-center">
          <Chip tone="cyan" style={{ marginBottom: 10 }}>{roll} roll</Chip>
          <Paper style={{ width: w, padding: 16, ...rise(s, 0.3), clipPath: 'polygon(0 0,100% 0,100% 100%,95% 97%,90% 100%,85% 97%,80% 100%,75% 97%,70% 100%,65% 97%,60% 100%,55% 97%,50% 100%,45% 97%,40% 100%,35% 97%,30% 100%,25% 97%,20% 100%,15% 97%,10% 100%,5% 97%,0 100%)' }}>
            <p className="text-center font-mono text-[17px] font-bold">CORNER CAFE</p>
            <div className="mt-2 space-y-1 font-mono text-[15px]">
              {rows.map(([a, b], i) => <div key={a} className="flex justify-between" style={rise(s, 0.9 + i * 0.4, 1.3 + i * 0.4)}><span>{a}</span><span>{b}</span></div>)}
              <div className="flex justify-between border-t border-dashed border-slate-400 pt-1 font-bold" style={rise(s, 2.3)}><span>TOTAL</span><span>13.70</span></div>
            </div>
            <p className="mt-2 pb-3 text-center font-mono text-[13px] text-slate-500" style={rise(s, 2.8)}>Thank you!</p>
          </Paper>
        </div>
        <div className="relative">
          <Paper className="h-full" style={{ ...rise(s, 1.0, 1.8), padding: 0, overflow: 'hidden' }}>
            <div className="h-[70px] bg-gradient-to-r from-indigo-600 to-violet-500 px-6 py-4 font-display text-[26px] font-bold text-white">Your Letterhead</div>
            <div className="px-8 py-5">
              <p className="font-display text-[26px] font-bold text-slate-900">INVOICE</p>
              <div className="mt-3"><Lines rows={[['Consulting', '900'], ['Travel', '120']]} s={s - 1.0} at={1.0} step={0.5} /></div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-6 bg-slate-100" />
          </Paper>
          <div className="absolute right-4 top-4 flex gap-2" style={{ opacity: ease(seg(s, 3.2, 4.0)) }}><Chip tone="amber">PNG</Chip><Chip tone="rose">JPG</Chip><Chip tone="violet">PDF</Chip></div>
        </div>
      </div>
    </div>
  )
}

/* 6 ── pay stub ───────────────────────────── */
function PayStub({ s }) {
  const net = 3290 * ease(seg(s, 3.2, 4.4))
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Pay Stub Generator" title="Payslips your team can read" tone="emerald" tag="Any currency" />
      <div className="mt-6 grid grid-cols-[1fr_1fr] gap-6" style={{ minHeight: 372, gridTemplateRows: '1fr' }}>
        <Card className="p-5">
          <p className="font-display text-[26px] font-semibold text-emerald-300">Earnings</p>
          <div className="mt-3 space-y-3">
            {[['Regular · 160 h', '3,200'], ['Overtime · 12 h', '360'], ['Bonus', '200']].map(([a, b], i) => (
              <div key={a} className="flex items-center justify-between rounded-xl bg-white/[0.07] px-4 py-3 text-[21px]" style={rise(s, 0.5 + i * 0.4)}><span className="text-slate-200">{a}</span><span className="font-mono font-semibold text-white">{b}</span></div>
            ))}
          </div>
          <p className="mt-5 font-display text-[26px] font-semibold text-rose-300">Deductions</p>
          <div className="mt-3 space-y-3">
            {[['Tax', '− 420'], ['Insurance', '− 50']].map(([a, b], i) => (
              <div key={a} className="flex items-center justify-between rounded-xl bg-white/[0.07] px-4 py-3 text-[21px]" style={rise(s, 1.9 + i * 0.4)}><span className="text-slate-200">{a}</span><span className="font-mono font-semibold text-white">{b}</span></div>
            ))}
          </div>
        </Card>
        <Paper className="flex flex-col">
          <p className="font-display text-[26px] font-bold text-slate-900">PAY STUB</p>
          <p className="text-[16px] text-slate-500">Pay period: 1–31 October</p>
          <div className="mt-4 flex items-end justify-between border-b border-slate-200 pb-3" style={rise(s, 2.8)}>
            <span className="text-[18px] text-slate-600">Net pay</span>
            <span className="font-display text-[48px] font-bold leading-none text-emerald-600">{fmtN(net)}</span>
          </div>
          <p className="mt-3 text-[18px] italic text-slate-600" style={rise(s, 4.2)}>Three thousand two hundred ninety only</p>
          <div className="mt-auto rounded-lg bg-emerald-50 px-4 py-3 text-[18px] text-emerald-800" style={rise(s, 5.0)}>Year-to-date earnings: 32,900</div>
        </Paper>
      </div>
    </div>
  )
}

/* 7 ── private by design ───────────────────────────── */
function Private({ s }) {
  const pulse = 1 + Math.sin(s * 2.4) * 0.05
  const items = [['No signup', 'No account and no email asked.', 'blue'], ['No watermark', 'The PDF is yours, clean.', 'violet'], ['Stays on your device', 'Stored in your browser, not on our servers.', 'emerald']]
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <Head eyebrow="Private by design" title="Your documents never leave your device" tone="emerald" />
      <div className="mt-6 grid grid-cols-[1fr_1.1fr] gap-8" style={{ minHeight: 372 }}>
        <div className="flex items-center justify-center">
          <div className="relative" style={{ opacity: ease(seg(s, 0.3, 1.1)) }}>
            <div className="absolute inset-[-40px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,.35), transparent 70%)', transform: `scale(${pulse})` }} />
            <div className="relative w-[330px] rounded-2xl border-2 border-emerald-400/70 bg-white/[0.06] p-4">
              <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div>
              <div className="mt-3 grid h-[150px] place-items-center rounded-lg bg-slate-900/60"><svg viewBox="0 0 24 24" width="70" height="70" fill="none" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></div>
              <p className="mt-3 text-center font-display text-[22px] font-semibold text-emerald-200">Your browser</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4">
          {items.map(([a, b, tone], i) => (
            <Card key={a} className="flex items-center gap-4 p-5" style={rise(s, 0.8 + i * 0.7, 1.5 + i * 0.7)}>
              <span className="grid h-12 w-12 flex-none place-items-center rounded-full text-[26px]" style={{ background: TONES[tone][1], color: TONES[tone][0] }}>✓</span>
              <div><p className="font-display text-[28px] font-bold text-white">{a}</p><p className="text-[19px] text-slate-300">{b}</p></div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

/* 8 ── close ───────────────────────────── */
const GRID = ['Invoice', 'GST', 'UAE VAT', 'CIS', 'Contractor', 'Quotation', 'Receipt', 'Letterhead', 'Pay stub']
const GRID_TONES = ['blue', 'orange', 'emerald', 'violet', 'amber', 'violet', 'cyan', 'rose', 'emerald']
function Close({ s }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-20 text-center">
      <img src="/nexora-brand-logo.png" alt="" width={100} height={100} className="rounded-3xl shadow-[0_0_70px_rgba(99,102,241,.55)]" style={rise(s, 0.2)} />
      <h3 className="mt-5 font-display text-[60px] font-bold leading-[1.05] text-white" style={rise(s, 0.5)}>Nine free tools. <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Zero signup.</span></h3>
      <div className="mt-7 flex max-w-[900px] flex-wrap justify-center gap-3">{GRID.map((g, i) => <span key={g} style={rise(s, 1.0 + i * 0.18)}><Chip tone={GRID_TONES[i]} style={{ fontSize: 21, padding: '8px 20px' }}>{g}</Chip></span>)}</div>
      <div className="mt-8 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-12 py-5 font-display text-[30px] font-bold text-white shadow-[0_0_60px_rgba(99,102,241,.55)]" style={rise(s, 3.0)}>nexorasolution.us/tools</div>
      <p style={rise(s, 3.6)} className="mt-4 text-[22px] text-slate-300">No watermark. Your data stays on your device.</p>
    </div>
  )
}

const VIEWS = { hook: Hook, invoice: Invoice, regional: Regional, quote: Quote, receipt: Receipt, paystub: PayStub, private: Private, close: Close }

function sceneIndex(t) {
  const i = TOOLS_INTRO_SCENES.findIndex((sc) => t >= sc.start && t < sc.end)
  return i === -1 ? TOOLS_INTRO_SCENES.length - 1 : i
}

export default function ToolsIntroStage({ t }) {
  const idx = sceneIndex(t)
  const scene = TOOLS_INTRO_SCENES[idx]
  const View = VIEWS[scene.id]
  const last = idx === TOOLS_INTRO_SCENES.length - 1
  const fade = Math.min(seg(t, scene.start, scene.start + 0.45), last ? 1 : 1 - seg(t, scene.end - 0.4, scene.end))
  return (
    <div className="relative overflow-hidden text-white" style={{ width: W, height: H, background: 'radial-gradient(1100px 620px at 75% -10%, #27338f 0%, #0b1236 45%, #050816 100%)' }}>
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      {idx > 0 && !last ? <div className="absolute left-20 top-5 z-10 flex items-center gap-2.5 opacity-90"><img src="/nexora-brand-logo.png" alt="" width={30} height={30} className="rounded-lg" /><span className="font-display text-[19px] font-bold tracking-tight">Nexora Free Tools</span></div> : null}
      <div className="absolute inset-0" style={{ opacity: clamp(fade) }}><View s={t - scene.start} /></div>
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-1.5 px-20 pb-5">
        {TOOLS_INTRO_SCENES.map((sc, i) => <div key={sc.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400" style={{ width: `${(i < idx ? 1 : i === idx ? seg(t, sc.start, sc.end) : 0) * 100}%` }} /></div>)}
      </div>
    </div>
  )
}
