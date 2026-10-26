import { Scene } from '../fx.jsx'
import { FONT, clamp, countAt, ease, easeBack, fmt, hexA, seg, win } from '../fxMath.js'
import { MODULE_INTROS } from '../../../lib/moduleIntros.js'

/**
 * Nexora AI intro, "keynote" style: a bright, quiet stage with big type, soft depth and
 * a few large product cards, instead of the dark HUD look of the module intros.
 * Every frame is a pure function of t (seconds). All names and figures are made-up
 * sample data, and the video says so in a small footer note.
 */
const INK = '#0b0b1f'
const SUB = '#5b5b78'
const FAINT = '#9a9ab4'
const V = '#7c3aed'
const V2 = '#c026d3'
const GRAD = `linear-gradient(100deg, ${V} 0%, ${V2} 100%)`
const CARD = { background: '#fff', borderRadius: 28, boxShadow: '0 50px 90px -40px rgba(76,29,149,.28), 0 12px 30px -18px rgba(15,15,45,.18), 0 0 0 1px rgba(15,15,45,.05)' }

const rise = (k, y = 26) => ({ opacity: k, transform: `translateY(${(1 - k) * y}px)`, filter: k < 0.99 ? `blur(${(1 - k) * 8}px)` : 'none' })
const gradText = { background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
const abs = (x, y, extra = {}) => ({ position: 'absolute', left: x, top: y, ...extra })

function Eyebrow({ s, a = 0, children }) {
  return <div style={abs(80, 64, { ...rise(ease(seg(s, a, a + 0.6)), 10), fontSize: 14, letterSpacing: 3.2, fontWeight: 700, color: V, textTransform: 'uppercase' })}>{children}</div>
}

function Headline({ s, a = 0.1, lines, size = 60, x = 80, y = 92, width = 900, align = 'left' }) {
  return (
    <div style={abs(x, y, { width, textAlign: align, fontSize: size, lineHeight: 1.04, fontWeight: 800, letterSpacing: '-0.04em', color: INK })}>
      {lines.map((line, i) => {
        const k = ease(seg(s, a + i * 0.16, a + 0.8 + i * 0.16))
        return <div key={i} style={rise(k, 22)}>{line.map((p, j) => <span key={j} style={p.hot ? gradText : undefined}>{p.t}</span>)}</div>
      })}
    </div>
  )
}

function Backdrop({ t }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #fdfcff 0%, #f3efff 100%)' }}>
      <div style={{ position: 'absolute', width: 820, height: 820, left: -240 + Math.sin(t * 0.32) * 60, top: -380 + Math.cos(t * 0.27) * 40, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,.55) 0%, rgba(167,139,250,0) 66%)' }} />
      <div style={{ position: 'absolute', width: 760, height: 760, right: -260 + Math.cos(t * 0.3) * 70, top: 120 + Math.sin(t * 0.25) * 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,114,182,.38) 0%, rgba(244,114,182,0) 66%)' }} />
      <div style={{ position: 'absolute', width: 700, height: 700, left: 260 + Math.sin(t * 0.22) * 80, bottom: -420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(125,211,252,.4) 0%, rgba(125,211,252,0) 66%)' }} />
    </div>
  )
}

/* 1 · hook */
function Hook({ s }) {
  const spark = ease(seg(s, 0, 0.8))
  return (
    <>
      <div style={abs(0, 190, { width: 1280, textAlign: 'center', ...rise(spark, 8) })}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,.75)', boxShadow: '0 0 0 1px rgba(124,58,237,.18)', fontSize: 15, fontWeight: 700, letterSpacing: 2.4, color: V, textTransform: 'uppercase' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={V}><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" /></svg>
          Nexora AI
        </span>
      </div>
      <Headline s={s} a={0.35} size={92} x={0} y={250} width={1280} align="center" lines={[[{ t: 'The ' }, { t: 'AI', hot: true }, { t: ' inside' }], [{ t: 'your business software.' }]]} />
    </>
  )
}

/* 2 · menu photo to POS items */
const MENU = [['Chicken Karahi', 'Mains', 1800], ['Beef Biryani', 'Rice', 650], ['Seekh Kebab', 'Grill', 480], ['Garlic Naan', 'Bread', 60], ['Mint Lemonade', 'Drinks', 220]]

function MenuScene({ s }) {
  const beam = seg(s, 0.9, 2.9)
  const beamY = 70 + beam * 330
  const card = ease(seg(s, 0.1, 0.9))
  return (
    <>
      <Eyebrow s={s}>01 · AI menu import</Eyebrow>
      <Headline s={s} lines={[[{ t: 'Photo in. ' }, { t: 'Menu out.', hot: true }]]} size={58} />
      <div style={abs(80, 210, { width: 430, height: 430, ...rise(card, 30), transform: `translateY(${(1 - card) * 30}px) rotate(-3deg)`, background: '#fffaf0', borderRadius: 18, boxShadow: '0 40px 70px -34px rgba(120,53,15,.4), 0 0 0 1px rgba(120,53,15,.1)', overflow: 'hidden' })}>
        <div style={{ padding: '28px 34px', fontFamily: 'Georgia, "Times New Roman", serif', color: '#44301c' }}>
          <div style={{ textAlign: 'center', fontSize: 14, letterSpacing: 6, fontWeight: 700 }}>KARACHI GRILL</div>
          <div style={{ margin: '8px auto 20px', width: 60, height: 1, background: '#b9a07a' }} />
          {MENU.map(([name, , price], i) => {
            const read = beamY > 70 + i * 62 + 30 + 20
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 8, height: 62, fontSize: 21, background: read && beam < 1 ? 'rgba(124,58,237,.08)' : 'transparent', margin: '0 -12px', padding: '0 12px', borderRadius: 8 }}>
                <span style={{ fontWeight: 700 }}>{name}</span>
                <span style={{ flex: 1, borderBottom: '2px dotted #c9b48f', transform: 'translateY(-5px)' }} />
                <span>{fmt(price)}</span>
              </div>
            )
          })}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: beamY, height: 3, background: GRAD, boxShadow: '0 0 24px 6px rgba(168,85,247,.55)', opacity: beam > 0 && beam < 1 ? 1 : 0 }} />
      </div>
      <div style={abs(610, 190, { width: 590, height: 440, ...CARD, ...rise(ease(seg(s, 1.6, 2.4)), 24) })}>
        <div style={{ position: 'absolute', left: 32, top: 26, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Menu</div>
        <div style={{ position: 'absolute', right: 30, top: 24, padding: '6px 14px', borderRadius: 999, background: 'rgba(16,185,129,.12)', color: '#059669', fontSize: 14, fontWeight: 700, opacity: ease(seg(s, 5.0, 5.5)) }}>✓ Added to POS</div>
        {MENU.map(([name, cat, price], i) => {
          const k = easeBack(seg(s, 2.4 + i * 0.42, 3.0 + i * 0.42))
          return (
            <div key={name} style={{ position: 'absolute', left: 24, right: 24, top: 78 + i * 62, height: 52, borderRadius: 16, background: '#f7f5ff', display: 'flex', alignItems: 'center', padding: '0 18px', opacity: clamp(k), transform: `translateX(${(1 - clamp(k)) * -46}px)` }}>
              <span style={{ width: 24, height: 24, borderRadius: 12, background: GRAD, color: '#fff', fontSize: 14, display: 'grid', placeItems: 'center', fontWeight: 800 }}>✓</span>
              <span style={{ marginLeft: 14, fontSize: 19, fontWeight: 700 }}>{name}</span>
              <span style={{ marginLeft: 10, fontSize: 14, color: FAINT, fontWeight: 600 }}>{cat}</span>
              <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: SUB }}>PKR {fmt(price)}</span>
            </div>
          )
        })}
        <div style={abs(32, 396, { fontSize: 15, color: SUB, fontWeight: 600, ...rise(ease(seg(s, 4.6, 5.2)), 8) })}>Read from the photo: <b style={{ color: INK }}>42 items</b> · <b style={{ color: INK }}>6 categories</b> · about a minute</div>
      </div>
    </>
  )
}

/* 3 · ask in English or Urdu */
function AskScene({ s }) {
  const q = 'Is hafte kya sab se zyada bika?'
  const typed = q.slice(0, Math.floor(clamp((s - 0.6) / 1.7) * q.length))
  const think = win(s, 2.5, 3.3, 0.25)
  const ans = ease(seg(s, 3.3, 4.0))
  const bars = [['Chicken Karahi', 74], ['Beef Biryani', 58], ['Mint Lemonade', 39]]
  return (
    <>
      <Eyebrow s={s}>02 · AI business assistant</Eyebrow>
      <Headline s={s} y={210} width={500} size={64} lines={[[{ t: 'Ask ' }, { t: 'anything.', hot: true }], [{ t: 'In English' }], [{ t: 'or Urdu.' }]]} />
      <div style={abs(620, 110, { width: 580, height: 500, ...CARD, ...rise(ease(seg(s, 0.1, 0.8)), 30) })}>
        <div style={abs(34, 30, { fontSize: 15, fontWeight: 700, color: FAINT, letterSpacing: 2 })}>NEXORA AI</div>
        <div style={abs(120, 72, { right: 34, left: 'auto', minHeight: 52, padding: '14px 22px', borderRadius: '22px 22px 6px 22px', background: GRAD, color: '#fff', fontSize: 19, fontWeight: 600, opacity: typed ? 1 : 0 })}>{typed}<span style={{ opacity: s < 2.4 && Math.floor(s * 2.2) % 2 === 0 ? 1 : 0 }}>|</span></div>
        <div style={abs(34, 168, { display: 'flex', gap: 7, opacity: think })}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 6, background: V, opacity: 0.35 + 0.65 * Math.abs(Math.sin(s * 6 + i * 0.9)) }} />)}</div>
        <div style={abs(34, 160, { width: 512, padding: '22px 24px 24px', borderRadius: '6px 22px 22px 22px', background: '#f7f5ff', ...rise(ans, 18) })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={V}><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" /></svg>
            Chicken Karahi led the week.
          </div>
          <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
            {bars.map(([name, v], i) => {
              const k = ease(seg(s, 3.8 + i * 0.25, 5.0 + i * 0.25))
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, color: SUB }}><span>{name}</span><span style={{ color: INK, fontWeight: 700 }}>{Math.round(v * k)} orders</span></div>
                  <div style={{ marginTop: 7, height: 10, borderRadius: 6, background: '#e9e4fb' }}><div style={{ width: `${v * k}%`, height: '100%', borderRadius: 6, background: GRAD }} /></div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 18, fontSize: 15, color: SUB, fontWeight: 600 }}>Sales this week <b style={{ color: INK, fontSize: 19 }}>PKR {fmt(countAt(s, 4.0, 5.2, 148000))}</b></div>
        </div>
      </div>
    </>
  )
}

/* 4 · GeoLint */
function GeoScene({ s }) {
  const score = countAt(s, 1.0, 3.2, 80)
  const R = 128
  const C = 2 * Math.PI * R
  const rows = [['Bot access', 23, 30], ['JavaScript test', 19, 25], ['Content and facts', 38, 45]]
  const fixes = [['Let AI bots in robots.txt', '+6'], ['Show text without JavaScript', '+5'], ['Answer first under each heading', '+4']]
  return (
    <>
      <Eyebrow s={s}>03 · GeoLint GEO audit</Eyebrow>
      <Headline s={s} size={52} width={900} lines={[[{ t: 'Can AI search ' }, { t: 'read your site?', hot: true }]]} />
      <div style={abs(80, 172, { display: 'flex', gap: 10, ...rise(ease(seg(s, 0.5, 1.2)), 10) })}>
        {['ChatGPT', 'Gemini', 'Perplexity', 'Claude'].map((n) => <span key={n} style={{ padding: '7px 16px', borderRadius: 999, background: '#fff', boxShadow: '0 0 0 1px rgba(15,15,45,.08)', fontSize: 14, fontWeight: 700, color: SUB }}>{n}</span>)}
      </div>
      <div style={abs(80, 230, { width: 440, height: 420, ...CARD, ...rise(ease(seg(s, 0.3, 1.0)), 24) })}>
        <svg width="440" height="420" style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs><linearGradient id="gl-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={V} /><stop offset="100%" stopColor={V2} /></linearGradient></defs>
          <circle cx="220" cy="196" r={R} fill="none" stroke="#ece8fb" strokeWidth="22" />
          <circle cx="220" cy="196" r={R} fill="none" stroke="url(#gl-ring)" strokeWidth="22" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} transform="rotate(-90 220 196)" />
        </svg>
        <div style={abs(0, 138, { width: 440, textAlign: 'center', fontSize: 88, fontWeight: 800, letterSpacing: '-0.05em', color: INK, lineHeight: 1 })}>{Math.round(score)}</div>
        <div style={abs(0, 232, { width: 440, textAlign: 'center', fontSize: 16, fontWeight: 600, color: FAINT })}>GEO score out of 100</div>
        <div style={abs(0, 366, { width: 440, textAlign: 'center', fontSize: 14, fontWeight: 700, color: V, letterSpacing: 2 })}>FREE AUDIT</div>
      </div>
      <div style={abs(570, 230, { width: 630, height: 190, ...CARD, ...rise(ease(seg(s, 0.8, 1.5)), 24) })}>
        {rows.map(([name, v, max], i) => {
          const k = ease(seg(s, 1.4 + i * 0.3, 2.8 + i * 0.3))
          return (
            <div key={name} style={abs(32, 26 + i * 52, { width: 566 })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}><span>{name}</span><span style={{ color: SUB }}>{Math.round(v * k)} / {max}</span></div>
              <div style={{ marginTop: 7, height: 9, borderRadius: 5, background: '#ece8fb' }}><div style={{ width: `${(v / max) * 100 * k}%`, height: '100%', borderRadius: 5, background: GRAD }} /></div>
            </div>
          )
        })}
      </div>
      <div style={abs(570, 440, { width: 630, height: 210, ...CARD, ...rise(ease(seg(s, 3.2, 3.9)), 24) })}>
        <div style={abs(32, 24, { fontSize: 14, letterSpacing: 2.4, fontWeight: 700, color: FAINT })}>RANKED FIXES</div>
        {fixes.map(([text, pts], i) => (
          <div key={text} style={abs(32, 58 + i * 50, { width: 566, display: 'flex', alignItems: 'center', ...rise(ease(seg(s, 3.6 + i * 0.3, 4.2 + i * 0.3)), 12) })}>
            <span style={{ width: 26, height: 26, borderRadius: 13, background: '#f1ecff', color: V, fontSize: 14, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{i + 1}</span>
            <span style={{ marginLeft: 14, fontSize: 18, fontWeight: 700 }}>{text}</span>
            <span style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 999, background: 'rgba(16,185,129,.12)', color: '#059669', fontSize: 14, fontWeight: 800 }}>{pts} pts</span>
          </div>
        ))}
      </div>
    </>
  )
}

/* 5 · free tools */
const DOCS = [
  { title: 'Invoice', no: '#1042', lines: ['Design work', 'Hosting', 'Support'], total: 'PKR 84,000', rot: -8, x: 170 },
  { title: 'Quotation', no: 'Q-218', lines: ['Shop fit-out', 'Signage', 'Delivery'], total: 'PKR 215,000', rot: 0, x: 490 },
  { title: 'Pay stub', no: 'May', lines: ['Basic pay', 'Overtime', 'Tax'], total: 'Net PKR 71,400', rot: 8, x: 810 },
]
function ToolsScene({ s }) {
  return (
    <>
      <Headline s={s} size={52} y={64} x={0} width={1280} align="center" lines={[[{ t: 'Invoices, quotes, pay stubs. ' }, { t: 'Free.', hot: true }]]} />
      <div style={abs(0, 140, { width: 1280, textAlign: 'center', fontSize: 20, fontWeight: 600, color: SUB, ...rise(ease(seg(s, 0.5, 1.2)), 10) })}>Made in your browser. PDF and Excel downloads. No sign-up.</div>
      {DOCS.map((d, i) => {
        const k = easeBack(seg(s, 0.5 + i * 0.25, 1.3 + i * 0.25))
        const c = clamp(k)
        return (
          <div key={d.title} style={abs(d.x, 210, { width: 300, height: 400, ...CARD, borderRadius: 22, opacity: c, transform: `translateY(${(1 - c) * 70}px) rotate(${d.rot * c}deg) scale(${0.92 + 0.08 * c})`, zIndex: i === 1 ? 2 : 1 })}>
            <div style={abs(28, 26, { fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' })}>{d.title}</div>
            <div style={abs(0, 32, { right: 28, left: 'auto', fontSize: 14, fontWeight: 700, color: FAINT })}>{d.no}</div>
            <div style={abs(28, 82, { width: 244, height: 1, background: '#ece8fb' })} />
            {d.lines.map((l, j) => (
              <div key={l} style={abs(28, 104 + j * 50, { width: 244, display: 'flex', alignItems: 'center', gap: 10 })}>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: SUB }}>{l}</span>
                <span style={{ width: 56, height: 8, borderRadius: 4, background: '#ece8fb' }} />
              </div>
            ))}
            <div style={abs(28, 300, { width: 244, height: 1, background: '#ece8fb' })} />
            <div style={abs(28, 318, { fontSize: 20, fontWeight: 800, ...gradText })}>{d.total}</div>
            <div style={abs(28, 356, { fontSize: 13, fontWeight: 700, color: FAINT, letterSpacing: 1.6 })}>PDF · EXCEL</div>
          </div>
        )
      })}
    </>
  )
}

/* 6 · close */
function Close({ s }) {
  const logo = easeBack(seg(s, 0, 0.9))
  return (
    <>
      <div style={abs(0, 120, { width: 1280, textAlign: 'center', transform: `scale(${0.7 + 0.3 * clamp(logo)})`, opacity: clamp(logo) })}>
        <img src="/nexora-brand-logo.png" alt="" width="132" height="132" style={{ display: 'block', margin: '0 auto', borderRadius: 30, boxShadow: '0 30px 60px -24px rgba(76,29,149,.45)' }} />
      </div>
      <Headline s={s} a={0.4} size={96} y={290} x={0} width={1280} align="center" lines={[[{ t: 'Nexora ' }, { t: 'AI', hot: true }]]} />
      <div style={abs(0, 408, { width: 1280, textAlign: 'center', fontSize: 24, fontWeight: 600, color: SUB, ...rise(ease(seg(s, 0.9, 1.6)), 10) })}>AI built into your POS, CRM and inventory.</div>
      <div style={abs(0, 478, { width: 1280, textAlign: 'center', ...rise(ease(seg(s, 1.3, 2.0)), 14) })}>
        <span style={{ display: 'inline-block', padding: '20px 42px', borderRadius: 999, background: GRAD, color: '#fff', fontSize: 24, fontWeight: 800, boxShadow: `0 24px 50px -18px ${hexA('#7c3aed', 0.7)}`, transform: `scale(${1 + Math.sin(s * 3.6) * 0.012})` }}>Start free · nexorasolution.us/ai</span>
      </div>
      <div style={abs(0, 560, { width: 1280, textAlign: 'center', fontSize: 15, fontWeight: 600, color: FAINT, ...rise(ease(seg(s, 1.6, 2.2)), 8) })}>1-month free trial · no credit card</div>
    </>
  )
}

export default function PremiumAiIntro({ t }) {
  const intro = MODULE_INTROS['nexora-ai']
  const [hook, menu, ask, geo, tools, close] = intro.scenes
  return (
    <div style={{ position: 'relative', width: 1280, height: 720, overflow: 'hidden', fontFamily: FONT, color: INK }}>
      <Backdrop t={t} />
      <Scene t={t} a={hook.start} b={hook.end}>{(s) => <Hook s={s} />}</Scene>
      <Scene t={t} a={menu.start} b={menu.end}>{(s) => <MenuScene s={s} />}</Scene>
      <Scene t={t} a={ask.start} b={ask.end}>{(s) => <AskScene s={s} />}</Scene>
      <Scene t={t} a={geo.start} b={geo.end}>{(s) => <GeoScene s={s} />}</Scene>
      <Scene t={t} a={tools.start} b={tools.end}>{(s) => <ToolsScene s={s} />}</Scene>
      <Scene t={t} a={close.start} b={close.end}>{(s) => <Close s={s} />}</Scene>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, textAlign: 'center', fontSize: 12, fontWeight: 600, color: FAINT, letterSpacing: 0.4 }}>Illustration with sample data</div>
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${clamp(t / intro.duration) * 100}%`, background: GRAD, opacity: 0.7 }} />
    </div>
  )
}
