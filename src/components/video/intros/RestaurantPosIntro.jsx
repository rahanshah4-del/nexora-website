import { Brand, Caption, Chip, Eyebrow, Glass, Headline, Packet, Pointer, Progress, Scene } from '../fx.jsx'
import { ACCENT, BAD, GOOD, INK, MONO, MUTE, countAt, ease, fmt, seg, win } from '../fxMath.js'
import { MODULE_INTROS } from '../../../lib/moduleIntros.js'

/**
 * Restaurant POS intro, 28 s. Pure function of t. Sample data only: the order
 * (Burger Meal x2, Coffee Combo, Fries, 5% service tax = PKR 3,675) matches the
 * Restaurant POS clips on the product page.
 */
const INTRO = MODULE_INTROS['restaurant-pos']
const A = 'orange'
const [MAIN, DEEP, GLOW] = ACCENT[A]
const pkr = (n) => `PKR ${fmt(n)}`
const green = { color: GOOD, bg: 'rgba(52,211,153,.12)', border: 'rgba(52,211,153,.4)' }
const amber = { color: '#fbbf24', bg: 'rgba(251,191,36,.12)', border: 'rgba(251,191,36,.4)' }
const red = { color: BAD, bg: 'rgba(251,113,133,.12)', border: 'rgba(251,113,133,.4)' }

/* ---------- 1. hook ---------- */
function Hook({ s }) {
  const warn = [['Paper orders', 170, 170], ['Shouting to the kitchen', 760, 150], ['Wrong bills', 300, 470], ['Lost tickets', 840, 480]]
  const pull = ease(seg(s, 2.5, 3.5))
  return (
    <>
      {warn.map(([label, x, y], i) => {
        const a = ease(seg(s, 0.2 + i * 0.18, 0.8 + i * 0.18)) * (1 - pull)
        const dx = (640 - 90 - x) * pull
        const dy = (330 - y) * pull
        return <div key={label} style={{ position: 'absolute', left: x + dx, top: y + dy + Math.sin(s * 3 + i) * 5, opacity: a, transform: `scale(${1 - pull * 0.5}) rotate(${(i % 2 ? 1 : -1) * 3 * (1 - pull)}deg)` }}><Chip {...red} style={{ fontSize: 20, padding: '9px 20px' }}>{label}</Chip></div>
      })}
      <Headline t={s} a={0.3} parts={[{ text: 'Rush hour.' }, { text: 'Zero chaos.', hot: true }]} size={88} accent={A} x={0} y={246} align="center" width={1280} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 390, textAlign: 'center', opacity: ease(seg(s, 3.0, 3.8)) }}>
        <Eyebrow accent={A}>Tables · KOT · Kitchen display · Split bills · Offline billing</Eyebrow>
      </div>
    </>
  )
}

/* ---------- 2. tables ---------- */
const BASE = ['occ', 'free', 'free', 'free', 'bill', 'free', 'occ', 'free']
function tableState(i, s) {
  if (i === 2 && s >= 1.6) return 'occ'
  if (i === 3 && s >= 3.6) return 'occ'
  return BASE[i]
}
function TableBox({ i, s }) {
  const st = tableState(i, s)
  const col = i % 4
  const row = Math.floor(i / 4)
  const x = 90 + col * 145
  const y = 252 + row * 130
  const tone = st === 'occ' ? [MAIN, 'rgba(249,115,22,.16)'] : st === 'bill' ? ['#a78bfa', 'rgba(139,92,246,.16)'] : ['rgba(255,255,255,.2)', 'rgba(255,255,255,.04)']
  const pulse = (i === 2 && s >= 1.6 && s < 2.4) || (i === 3 && s >= 3.6 && s < 4.6) ? 1 - seg(s, i === 2 ? 1.6 : 3.6, i === 2 ? 2.4 : 4.6) : 0
  const hover = i === 3 ? win(s, 3.0, 3.7, 0.3) : 0
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 125, height: 112, borderRadius: 18, border: `1.5px solid ${hover > 0.3 && st === 'free' ? MAIN : tone[0]}`, background: tone[1], boxShadow: pulse > 0 ? `0 0 ${34 * pulse}px ${GLOW}` : st === 'occ' ? `0 0 18px ${GLOW}` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, transform: `scale(${1 + pulse * 0.05})` }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: st === 'free' ? '#9fb0d4' : st === 'bill' ? '#c4b5fd' : MAIN }}>T{i + 1}</div>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTE }}>{st === 'occ' ? 'Occupied' : st === 'bill' ? 'Bill due' : 'Free'}</div>
    </div>
  )
}
function Tables({ s }) {
  const states = BASE.map((_, i) => tableState(i, s))
  const count = (k) => states.filter((v) => v === k).length
  const tiles = [['Free', count('free'), '#9fb0d4'], ['Occupied', count('occ'), MAIN], ['Waiting for bill', count('bill'), '#c4b5fd']]
  const opened = ease(seg(s, 3.9, 4.5))
  return (
    <>
      <Eyebrow accent={A} style={{ position: 'absolute', left: 60, top: 104 }}>01 · Tables</Eyebrow>
      <Headline t={s} a={0.1} parts={[{ text: 'See every table.' }, { text: 'Live.', hot: true }]} size={40} accent={A} x={60} y={128} />
      <Glass x={60} y={200} w={620} h={370} accent={A}>
        <div style={{ position: 'absolute', left: 30, top: 20, fontFamily: MONO, fontSize: 13, letterSpacing: 2.4, color: MUTE, textTransform: 'uppercase' }}>Dining room · 8 tables</div>
      </Glass>
      {BASE.map((_, i) => <TableBox key={i} i={i} s={s} />)}
      <div style={{ position: 'absolute', left: 90, top: 520, display: 'flex', gap: 10 }}>
        <Chip>Free</Chip><Chip color={MAIN} bg="rgba(249,115,22,.12)" border="rgba(249,115,22,.4)">Occupied</Chip><Chip color="#c4b5fd" bg="rgba(139,92,246,.12)" border="rgba(139,92,246,.4)">Waiting for bill</Chip>
      </div>
      <Glass x={720} y={200} w={500} h={370} accent={A}>
        <div style={{ position: 'absolute', left: 28, top: 22, fontFamily: MONO, fontSize: 13, letterSpacing: 2.4, color: MUTE, textTransform: 'uppercase', opacity: ease(seg(s, 0.6, 1.2)) }}>Floor status</div>
        <div style={{ position: 'absolute', left: 28, top: 58, display: 'flex', gap: 14 }}>
          {tiles.map(([label, n, c], i) => (
            <div key={label} style={{ width: 138, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', opacity: ease(seg(s, 0.8 + i * 0.15, 1.4 + i * 0.15)) }}>
              <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, color: c, lineHeight: 1 }}>{n}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: MUTE, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 190, padding: 22, borderRadius: 18, background: 'rgba(249,115,22,.1)', border: `1px solid ${MAIN}`, boxShadow: `0 0 ${26 * opened}px ${GLOW}`, opacity: opened, transform: `translateY(${(1 - opened) * 16}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Table 4</div>
            <Chip {...green}>✓ Order opened</Chip>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}><Chip>Dine-in</Chip><Chip>2 guests</Chip><Chip>4 seats</Chip></div>
        </div>
      </Glass>
      <Pointer t={s} keys={[[0, 980, 600], [2.3, 980, 600], [3.4, 587, 308], [5.6, 640, 420]]} clicks={[3.5]} accent={A} show={win(s, 2.0, 6.0, 0.4)} />
    </>
  )
}

/* ---------- 3. order to kitchen ---------- */
const ITEMS = [['Burger Meal', '× 2', 2500], ['Coffee Combo', '× 1', 680], ['Fries', '× 1', 320]]
function Order({ s }) {
  const shown = ITEMS.map((_, i) => ease(seg(s, 0.6 + i * 0.6, 1.2 + i * 0.6)))
  const sub = ITEMS.reduce((n, it, i) => n + it[2] * shown[i], 0)
  const tax = sub * 0.05
  const total = sub + tax
  const sent = s >= 4.0
  const ticket = ease(seg(s, 5.0, 5.7))
  const ready = s >= 6.5
  return (
    <>
      <Eyebrow accent={A} style={{ position: 'absolute', left: 60, top: 104 }}>02 · Order to kitchen</Eyebrow>
      <Headline t={s} a={0.1} parts={[{ text: 'From table to kitchen,' }, { text: 'in seconds.', hot: true }]} size={40} accent={A} x={60} y={128} />
      <Glass x={60} y={190} w={560} h={400} accent={A}>
        <div style={{ position: 'absolute', left: 28, top: 20, fontSize: 20, fontWeight: 700 }}>Table 4 <span style={{ color: MUTE, fontWeight: 500 }}>· Order #112</span></div>
        <div style={{ position: 'absolute', right: 28, top: 18 }}><Chip>Dine-in</Chip></div>
        {ITEMS.map((it, i) => (
          <div key={it[0]} style={{ position: 'absolute', left: 28, right: 28, top: 62 + i * 50, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.055)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: 18, fontWeight: 600, opacity: shown[i], transform: `translateX(${(1 - shown[i]) * -30}px)` }}>
            <span>{it[0]} <span style={{ color: MUTE, fontFamily: MONO, fontSize: 15 }}>{it[1]}</span></span>
            <span style={{ fontFamily: MONO, fontSize: 17, color: '#cfd9f5' }}>{pkr(it[2])}</span>
          </div>
        ))}
        <div style={{ position: 'absolute', left: 28, right: 28, top: 214, height: 1, background: 'rgba(255,255,255,.12)' }} />
        <div style={{ position: 'absolute', left: 28, right: 28, top: 224, display: 'flex', justifyContent: 'space-between', fontSize: 16, color: MUTE }}><span>Subtotal</span><span style={{ fontFamily: MONO }}>{pkr(sub)}</span></div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 250, display: 'flex', justifyContent: 'space-between', fontSize: 16, color: MUTE }}><span>Service tax 5%</span><span style={{ fontFamily: MONO }}>{pkr(tax)}</span></div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 278, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Total</span>
          <span style={{ fontFamily: MONO, fontSize: 36, fontWeight: 700, color: MAIN, textShadow: `0 0 22px ${GLOW}` }}>{pkr(total)}</span>
        </div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 338, height: 46, borderRadius: 14, background: sent ? 'rgba(52,211,153,.18)' : `linear-gradient(90deg, ${MAIN}, ${DEEP})`, color: sent ? GOOD : '#1a0a00', border: sent ? '1px solid rgba(52,211,153,.5)' : 'none', display: 'grid', placeItems: 'center', fontSize: 19, fontWeight: 800, boxShadow: sent ? 'none' : `0 0 26px ${GLOW}` }}>{sent ? '✓ KOT sent' : 'Send KOT'}</div>
      </Glass>
      <Glass x={700} y={190} w={520} h={400} accent={A} hot={ticket}>
        <div style={{ position: 'absolute', left: 28, top: 20, fontSize: 20, fontWeight: 700 }}>Kitchen display</div>
        <div style={{ position: 'absolute', right: 28, top: 18 }}><Chip {...green}>● Live</Chip></div>
        {ticket < 0.05 ? <div style={{ position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', color: '#5b6b8f', fontFamily: MONO, fontSize: 15, letterSpacing: 1.4 }}>Waiting for orders…</div> : null}
        <div style={{ position: 'absolute', left: 30, right: 30, top: 80, height: 232, borderRadius: 18, border: `1.5px solid ${ready ? 'rgba(52,211,153,.6)' : MAIN}`, background: ready ? 'rgba(52,211,153,.08)' : 'rgba(249,115,22,.1)', padding: 22, opacity: ticket, transform: `translateY(${(1 - ticket) * 24}px) scale(${0.96 + ticket * 0.04})`, boxShadow: `0 0 ${24 * ticket}px ${ready ? 'rgba(52,211,153,.3)' : GLOW}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: ready ? GOOD : MAIN }}>KOT #112 · Table 4</div>
            {ready ? <Chip {...green}>✓ Ready</Chip> : <Chip {...amber}>Preparing</Chip>}
          </div>
          <div style={{ marginTop: 18, display: 'grid', gap: 10, fontSize: 21, fontWeight: 600 }}>
            {['2 × Burger Meal', '1 × Coffee Combo', '1 × Fries'].map((line, i) => <div key={line} style={{ opacity: ease(seg(s, 5.5 + i * 0.25, 6 + i * 0.25)) }}>{line}</div>)}
          </div>
        </div>
      </Glass>
      <Packet t={s} a={4.1} b={5.0} from={[560, 560]} to={[900, 330]} accent={A} />
      <Pointer t={s} keys={[[0, 1000, 640], [1.8, 1000, 640], [3.8, 340, 551], [6.2, 660, 610]]} clicks={[4.0]} accent={A} show={win(s, 1.8, 6.2, 0.4)} />
    </>
  )
}

/* ---------- 4. split bills and offline ---------- */
function Wifi({ color, off }) {
  return (
    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 14px ${color})` }}>
      <path d="M2.5 9a14 14 0 0 1 19 0" /><path d="M5.6 12.6a9.6 9.6 0 0 1 12.8 0" /><path d="M8.8 16a5 5 0 0 1 6.4 0" /><circle cx="12" cy="19.2" r="1" fill={color} />
      {off ? <path d="M3 3l18 18" stroke={BAD} strokeWidth="2" /> : null}
    </svg>
  )
}
function Split({ s }) {
  const pill = ease(seg(s, 0.7, 1.3))
  const opts = ['Whole', '2 ways', '3 ways']
  const offline = s >= 1.9 && s < 3.7
  const back = s >= 3.7
  const status = offline ? ['Internet down', BAD] : back ? ['Back online · synced', GOOD] : ['Online · synced', GOOD]
  const queue = [['Bill #113', 1840, 2.3], ['Bill #114', 920, 2.8]]
  return (
    <>
      <Eyebrow accent={A} style={{ position: 'absolute', left: 60, top: 104 }}>03 · Split and offline</Eyebrow>
      <Headline t={s} a={0.1} parts={[{ text: 'Split any bill.' }, { text: 'Keep billing offline.', hot: true }]} size={40} accent={A} x={60} y={128} />
      <Glass x={60} y={200} w={560} h={370} accent={A}>
        <div style={{ position: 'absolute', left: 28, top: 22, fontSize: 20, fontWeight: 700 }}>Split bill <span style={{ color: MUTE, fontWeight: 500 }}>· Table 4</span></div>
        <div style={{ position: 'absolute', right: 28, top: 20, fontFamily: MONO, fontSize: 20, color: MAIN }}>{pkr(3675)}</div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 70, height: 46, borderRadius: 14, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ position: 'absolute', top: 4, bottom: 4, width: 164, left: 4 + pill * 2 * 168, borderRadius: 11, background: `linear-gradient(90deg, ${MAIN}, ${DEEP})`, boxShadow: `0 0 18px ${GLOW}` }} />
          {opts.map((o, i) => <div key={o} style={{ position: 'absolute', left: 4 + i * 168, width: 164, top: 0, height: 46, display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 700, color: Math.round(pill * 2) === i ? '#1a0a00' : MUTE }}>{o}</div>)}
        </div>
        {[0, 1, 2].map((i) => {
          const a = ease(seg(s, 1.4 + i * 0.25, 2.0 + i * 0.25))
          return (
            <div key={i} style={{ position: 'absolute', left: 28 + i * 172, top: 148, width: 160, height: 132, borderRadius: 18, background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.12)', padding: 18, opacity: a, transform: `translateY(${(1 - a) * 22}px)` }}>
              <div style={{ fontSize: 15, color: MUTE, fontWeight: 600 }}>Guest {i + 1}</div>
              <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 26, fontWeight: 700, color: INK }}>{fmt(countAt(s, 1.6 + i * 0.25, 2.4 + i * 0.25, 1225))}</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: MUTE, marginTop: 4 }}>PKR</div>
            </div>
          )
        })}
        <div style={{ position: 'absolute', left: 28, right: 28, bottom: 24, fontFamily: MONO, fontSize: 15, color: MUTE, opacity: ease(seg(s, 2.6, 3.2)) }}>3 × PKR 1,225 = PKR 3,675</div>
      </Glass>
      <Glass x={660} y={200} w={560} h={370} accent={A} hot={offline ? 1 : 0} style={offline ? { borderColor: BAD, boxShadow: '0 24px 60px -28px rgba(0,0,0,.8), 0 0 32px rgba(251,113,133,.28)' } : undefined}>
        <div style={{ position: 'absolute', left: 28, top: 22, fontSize: 20, fontWeight: 700 }}>Connection</div>
        <div style={{ position: 'absolute', right: 28, top: 20 }}><Chip color={status[1]} bg={offline ? 'rgba(251,113,133,.12)' : 'rgba(52,211,153,.12)'} border={offline ? 'rgba(251,113,133,.4)' : 'rgba(52,211,153,.4)'}>● {status[0]}</Chip></div>
        <div style={{ position: 'absolute', left: 36, top: 80, opacity: 1 }}><Wifi color={offline ? BAD : GOOD} off={offline} /></div>
        <div style={{ position: 'absolute', left: 180, top: 92, right: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{offline ? 'Billing continues offline' : back ? 'Everything is back in the cloud' : 'Cloud sync is on'}</div>
          <div style={{ marginTop: 10, fontSize: 15, color: MUTE, lineHeight: 1.5 }}>{offline ? 'Bills are saved on this device.' : back ? 'Saved bills synced automatically.' : 'Orders and bills sync as you work.'}</div>
        </div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 214, display: 'grid', gap: 10 }}>
          {queue.map(([label, amount, at]) => {
            const a = ease(seg(s, at, at + 0.5))
            return (
              <div key={label} style={{ height: 44, borderRadius: 12, background: 'rgba(255,255,255,.055)', border: `1px solid ${back ? 'rgba(52,211,153,.4)' : 'rgba(251,113,133,.35)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', opacity: a, transform: `translateX(${(1 - a) * 26}px)` }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{label} <span style={{ color: MUTE, fontFamily: MONO, fontSize: 14 }}>· {pkr(amount)}</span></span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: back ? GOOD : BAD }}>{back ? '✓ synced' : 'saved here'}</span>
              </div>
            )
          })}
        </div>
      </Glass>
    </>
  )
}

/* ---------- 5. close ---------- */
const SALES = [18, 26, 24, 38, 44, 41, 58, 66, 62, 80]
function Close({ s }) {
  const draw = ease(seg(s, 0.5, 2.2))
  const pts = SALES.map((v, i) => [30 + i * (500 / (SALES.length - 1)), 250 - v * 2.4])
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const cta = ease(seg(s, 1.6, 2.4))
  const pulse = 1 + Math.sin(s * 4) * 0.015
  return (
    <>
      <Glass x={60} y={170} w={560} h={340} accent={A}>
        <div style={{ position: 'absolute', left: 30, top: 24, fontFamily: MONO, fontSize: 13, letterSpacing: 2.4, color: MUTE, textTransform: 'uppercase' }}>Today's sales</div>
        <div style={{ position: 'absolute', left: 30, top: 50, fontFamily: MONO, fontSize: 44, fontWeight: 700, color: INK, textShadow: `0 0 26px ${GLOW}` }}>{pkr(countAt(s, 0.4, 2.0, 184250))}</div>
        <svg width="560" height="340" style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs><linearGradient id="rp-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={MAIN} stopOpacity=".34" /><stop offset="100%" stopColor={MAIN} stopOpacity="0" /></linearGradient></defs>
          <g style={{ clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)` }}>
            <polygon points={`30,310 ${line} 530,310`} fill="url(#rp-area)" />
            <polyline points={line} fill="none" stroke={MAIN} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${MAIN})` }} />
          </g>
        </svg>
        <div style={{ position: 'absolute', left: 30, bottom: 18, display: 'flex', gap: 10, opacity: ease(seg(s, 1.8, 2.4)) }}><Chip>Dine-in</Chip><Chip>Takeaway</Chip><Chip>Delivery</Chip></div>
      </Glass>
      <Headline t={s} a={0.4} parts={[{ text: 'Run the whole floor from' }, { text: 'one screen.', hot: true }]} size={52} accent={A} x={680} y={196} width={540} />
      <div style={{ position: 'absolute', left: 680, top: 400, opacity: cta, transform: `translateY(${(1 - cta) * 16}px) scale(${pulse})`, transformOrigin: 'left center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '18px 34px', borderRadius: 999, background: `linear-gradient(90deg, ${MAIN}, ${DEEP})`, color: '#1a0a00', fontWeight: 800, fontSize: 24, boxShadow: `0 0 ${34 + Math.sin(s * 4) * 8}px ${GLOW}` }}>Start free · 1-month trial</div>
        <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 15, color: MUTE, letterSpacing: 0.4 }}>No credit card · nexorasolution.online/restaurant-pos</div>
      </div>
    </>
  )
}

export default function RestaurantPosIntro({ t }) {
  const [hook, tables, order, split, close] = INTRO.scenes
  return (
    <>
      <Brand product="Restaurant POS" accent={A} />
      <Scene t={t} a={hook.start} b={hook.end}>{(s) => <Hook s={s} />}</Scene>
      <Scene t={t} a={tables.start} b={tables.end}>{(s) => <Tables s={s} />}</Scene>
      <Scene t={t} a={order.start} b={order.end}>{(s) => <Order s={s} />}</Scene>
      <Scene t={t} a={split.start} b={split.end}>{(s) => <Split s={s} />}</Scene>
      <Scene t={t} a={close.start} b={close.end}>{(s) => <Close s={s} />}</Scene>
      {INTRO.scenes.map((sc) => <Caption key={sc.id} t={t} a={sc.start + 0.7} b={sc.end - 0.1}>{sc.caption}</Caption>)}
      <Progress t={t} scenes={INTRO.scenes} accent={A} />
    </>
  )
}
