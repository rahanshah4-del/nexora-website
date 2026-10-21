import { Brand, Caption, Chip, Eyebrow, Glass, Headline, Packet, Pointer, Progress, Scene } from '../fx.jsx'
import { ACCENT, BAD, GOOD, INK, MONO, MUTE, countAt, ease, fmt, hexA, seg, win } from '../fxMath.js'
import { MODULE_INTROS } from '../../../lib/moduleIntros.js'
import { INTRO_CONFIGS } from './introConfigs.js'

/**
 * Data-driven intro (28 s) used by every module except Restaurant POS, which has a
 * hand-built scene. Five scenes with the same timing: hook, list, flow, metrics, close.
 * Everything is a pure function of t and every figure is made-up sample data from
 * introConfigs.js.
 */
const tones = (main) => ({
  ok: { color: GOOD, bg: 'rgba(52,211,153,.12)', border: 'rgba(52,211,153,.4)' },
  warn: { color: '#fbbf24', bg: 'rgba(251,191,36,.12)', border: 'rgba(251,191,36,.4)' },
  bad: { color: BAD, bg: 'rgba(251,113,133,.12)', border: 'rgba(251,113,133,.4)' },
  hot: { color: main, bg: hexA(main, 0.12), border: hexA(main, 0.45) },
  mute: {},
})
const label = { fontFamily: MONO, fontSize: 13, letterSpacing: 2.4, color: MUTE, textTransform: 'uppercase' }

function Hook({ s, c, A }) {
  const [MAIN] = ACCENT[A]
  const spots = [[170, 170], [760, 150], [300, 470], [840, 480]]
  const pull = ease(seg(s, 2.5, 3.5))
  return (
    <>
      {c.hook.pains.map((text, i) => {
        const [x, y] = spots[i]
        const a = ease(seg(s, 0.2 + i * 0.18, 0.8 + i * 0.18)) * (1 - pull)
        return <div key={text} style={{ position: 'absolute', left: x + (550 - x) * pull, top: y + (330 - y) * pull + Math.sin(s * 3 + i) * 5, opacity: a, transform: `scale(${1 - pull * 0.5}) rotate(${(i % 2 ? 1 : -1) * 3 * (1 - pull)}deg)` }}><Chip {...tones(MAIN).bad} style={{ fontSize: 20, padding: '9px 20px' }}>{text}</Chip></div>
      })}
      <Headline t={s} a={0.3} parts={[{ text: c.hook.head[0] }, { text: c.hook.head[1], hot: true }]} size={c.hook.head.join(' ').length > 28 ? 72 : 88} accent={A} x={0} y={246} align="center" width={1280} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 390, textAlign: 'center', opacity: ease(seg(s, 3.0, 3.8)) }}><Eyebrow accent={A}>{c.hook.tag}</Eyebrow></div>
    </>
  )
}

function List({ s, c, A }) {
  const [MAIN, , GLOW] = ACCENT[A]
  const L = c.list
  const T = tones(MAIN)
  const clickAt = 3.5
  const opened = ease(seg(s, 3.9, 4.5))
  const rowY = (i) => 266 + i * 58
  return (
    <>
      <Eyebrow accent={A} style={{ position: 'absolute', left: 60, top: 104 }}>{L.eyebrow}</Eyebrow>
      <Headline t={s} a={0.1} parts={[{ text: L.head[0] }, { text: L.head[1], hot: true }]} size={40} accent={A} x={60} y={128} />
      <Glass x={60} y={200} w={620} h={370} accent={A}>
        <div style={{ position: 'absolute', left: 30, top: 20, ...label }}>{L.title}</div>
      </Glass>
      {L.rows.map(([name, sub, status, tone, after], i) => {
        const a = ease(seg(s, 0.6 + i * 0.35, 1.1 + i * 0.35))
        const picked = i === L.pick
        const swapped = picked && after && s >= clickAt
        const st = swapped ? (Array.isArray(after) ? after : [after, 'ok']) : [status, tone]
        const hover = picked ? win(s, 2.8, 3.7, 0.3) : 0
        return (
          <div key={name} style={{ position: 'absolute', left: 84, width: 572, top: rowY(i), height: 48, borderRadius: 14, background: picked && hover > 0.3 ? hexA(MAIN, 0.1) : 'rgba(255,255,255,.055)', border: `1px solid ${picked && hover > 0.3 ? MAIN : 'rgba(255,255,255,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', opacity: a, transform: `translateX(${(1 - a) * -28}px)` }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{name} <span style={{ color: MUTE, fontFamily: MONO, fontSize: 13, fontWeight: 500 }}>· {sub}</span></span>
            <Chip {...T[st[1]]}>{st[0]}</Chip>
          </div>
        )
      })}
      <Glass x={720} y={200} w={500} h={370} accent={A}>
        <div style={{ position: 'absolute', left: 28, top: 22, ...label, opacity: ease(seg(s, 0.6, 1.2)) }}>{L.tilesTitle}</div>
        <div style={{ position: 'absolute', left: 28, top: 58, display: 'flex', gap: 14 }}>
          {L.tiles.map(([text, value, tone], i) => {
            const k = ease(seg(s, 0.8 + i * 0.15, 1.4 + i * 0.15))
            const col = tone === 'warn' ? '#fbbf24' : tone === 'ok' ? GOOD : tone === 'mute' ? '#9fb0d4' : MAIN
            return (
              <div key={text} style={{ width: 138, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', opacity: k }}>
                <div style={{ fontFamily: MONO, fontSize: typeof value === 'number' ? 38 : 25, fontWeight: 700, color: col, lineHeight: typeof value === 'number' ? 1 : 1.5, whiteSpace: 'nowrap' }}>{typeof value === 'number' ? fmt(countAt(s, 0.9 + i * 0.15, 2.4 + i * 0.15, value)) : value}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: MUTE, fontWeight: 600 }}>{text}</div>
              </div>
            )
          })}
        </div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 190, padding: 22, borderRadius: 18, background: hexA(MAIN, 0.1), border: `1px solid ${MAIN}`, boxShadow: `0 0 ${26 * opened}px ${GLOW}`, opacity: opened, transform: `translateY(${(1 - opened) * 16}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{L.detail.title}</div>
            <Chip {...T.ok}>{L.detail.status}</Chip>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{L.detail.chips.map((x) => <Chip key={x}>{x}</Chip>)}</div>
        </div>
      </Glass>
      <Pointer t={s} keys={[[0, 980, 640], [2.2, 980, 640], [3.4, 400, rowY(L.pick) + 24], [5.6, 640, 430]]} clicks={[clickAt]} accent={A} show={win(s, 2.0, 6.0, 0.4)} />
    </>
  )
}

function Flow({ s, c, A }) {
  const [MAIN, DEEP, GLOW] = ACCENT[A]
  const T = tones(MAIN)
  const F = c.flow
  const pre = F.cur || ''
  const shown = F.items.map((_, i) => ease(seg(s, 0.6 + i * 0.6, 1.2 + i * 0.6)))
  const sub = F.items.reduce((n, it, i) => n + it[2] * shown[i], 0)
  const adj = F.adj ? sub * F.adj.rate : 0
  const total = sub + adj
  const sent = s >= 4.0
  const ticket = ease(seg(s, 5.0, 5.7))
  const ready = s >= 6.5
  const rowsEnd = 62 + F.items.length * 50
  return (
    <>
      <Eyebrow accent={A} style={{ position: 'absolute', left: 60, top: 104 }}>{F.eyebrow}</Eyebrow>
      <Headline t={s} a={0.1} parts={[{ text: F.head[0] }, { text: F.head[1], hot: true }]} size={40} accent={A} x={60} y={128} />
      <Glass x={60} y={190} w={560} h={400} accent={A}>
        <div style={{ position: 'absolute', left: 28, top: 20, fontSize: 20, fontWeight: 700 }}>{F.leftTitle} <span style={{ color: MUTE, fontWeight: 500 }}>· {F.leftSub}</span></div>
        <div style={{ position: 'absolute', right: 28, top: 18 }}><Chip>{F.tag}</Chip></div>
        {F.items.map((it, i) => (
          <div key={it[0]} style={{ position: 'absolute', left: 28, right: 28, top: 62 + i * 50, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.055)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: 18, fontWeight: 600, opacity: shown[i], transform: `translateX(${(1 - shown[i]) * -30}px)` }}>
            <span>{it[0]} <span style={{ color: MUTE, fontFamily: MONO, fontSize: 15 }}>{it[1]}</span></span>
            <span style={{ fontFamily: MONO, fontSize: 17, color: '#cfd9f5' }}>{pre}{fmt(it[2])}</span>
          </div>
        ))}
        <div style={{ position: 'absolute', left: 28, right: 28, top: 214, height: 1, background: 'rgba(255,255,255,.12)' }} />
        <div style={{ position: 'absolute', left: 28, right: 28, top: 224, display: 'flex', justifyContent: 'space-between', fontSize: 16, color: MUTE }}><span>{F.subLabel || 'Subtotal'}</span><span style={{ fontFamily: MONO }}>{pre}{fmt(sub)}</span></div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 250, display: 'flex', justifyContent: 'space-between', fontSize: 16, color: MUTE, opacity: F.adj ? 1 : 0 }}><span>{F.adj?.label}</span><span style={{ fontFamily: MONO }}>{adj < 0 ? '-' : ''}{pre}{fmt(Math.abs(adj))}</span></div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 278, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{F.totalLabel || 'Total'}</span>
          <span style={{ fontFamily: MONO, fontSize: 36, fontWeight: 700, color: MAIN, textShadow: `0 0 22px ${GLOW}` }}>{pre}{fmt(total)}</span>
        </div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 338, height: 46, borderRadius: 14, background: sent ? 'rgba(52,211,153,.18)' : `linear-gradient(90deg, ${MAIN}, ${DEEP})`, color: sent ? GOOD : '#050914', border: sent ? '1px solid rgba(52,211,153,.5)' : 'none', display: 'grid', placeItems: 'center', fontSize: 19, fontWeight: 800, boxShadow: sent ? 'none' : `0 0 26px ${GLOW}` }}>{sent ? `✓ ${F.sentLabel}` : F.button}</div>
      </Glass>
      <Glass x={700} y={190} w={520} h={400} accent={A} hot={ticket}>
        <div style={{ position: 'absolute', left: 28, top: 20, fontSize: 20, fontWeight: 700 }}>{F.rightTitle}</div>
        <div style={{ position: 'absolute', right: 28, top: 18 }}><Chip {...T.ok}>● Live</Chip></div>
        {ticket < 0.05 ? <div style={{ position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', color: '#5b6b8f', fontFamily: MONO, fontSize: 15, letterSpacing: 1.4 }}>{F.waiting}</div> : null}
        <div style={{ position: 'absolute', left: 30, right: 30, top: 80, height: 232, borderRadius: 18, border: `1.5px solid ${ready ? 'rgba(52,211,153,.6)' : MAIN}`, background: ready ? 'rgba(52,211,153,.08)' : hexA(MAIN, 0.1), padding: 22, opacity: ticket, transform: `translateY(${(1 - ticket) * 24}px) scale(${0.96 + ticket * 0.04})`, boxShadow: `0 0 ${24 * ticket}px ${ready ? 'rgba(52,211,153,.3)' : GLOW}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: ready ? GOOD : MAIN }}>{F.ticketTitle}</div>
            {ready ? <Chip {...T.ok}>✓ {F.doneChip}</Chip> : <Chip {...T.warn}>{F.pendingChip}</Chip>}
          </div>
          <div style={{ marginTop: 18, display: 'grid', gap: 10, fontSize: 21, fontWeight: 600 }}>
            {F.ticketLines.map((line, i) => <div key={line} style={{ opacity: ease(seg(s, 5.5 + i * 0.25, 6 + i * 0.25)) }}>{line}</div>)}
          </div>
        </div>
      </Glass>
      <Packet t={s} a={4.1} b={5.0} from={[560, rowsEnd + 260]} to={[900, 330]} accent={A} />
      <Pointer t={s} keys={[[0, 1000, 640], [1.8, 1000, 640], [3.8, 340, 551], [6.2, 660, 610]]} clicks={[4.0]} accent={A} show={win(s, 1.8, 6.2, 0.4)} />
    </>
  )
}

function Metrics({ s, c, A }) {
  const [MAIN, DEEP, GLOW] = ACCENT[A]
  const T = tones(MAIN)
  const M = c.metrics
  const pre = M.cur || ''
  const done = (at) => s >= at + 1.6
  const allDone = M.queue.every(([, , at]) => done(at))
  return (
    <>
      <Eyebrow accent={A} style={{ position: 'absolute', left: 60, top: 104 }}>{M.eyebrow}</Eyebrow>
      <Headline t={s} a={0.1} parts={[{ text: M.head[0] }, { text: M.head[1], hot: true }]} size={40} accent={A} x={60} y={128} />
      <Glass x={60} y={200} w={560} h={370} accent={A}>
        <div style={{ position: 'absolute', left: 30, top: 22, ...label }}>{M.leftTitle}</div>
        <div style={{ position: 'absolute', left: 30, top: 50, fontFamily: MONO, fontSize: 42, fontWeight: 700, color: INK, textShadow: `0 0 24px ${GLOW}` }}>{pre}{fmt(countAt(s, 0.4, 2.2, M.big))}</div>
        <div style={{ position: 'absolute', left: 32, top: 106, fontSize: 15, color: MUTE, fontWeight: 600 }}>{M.bigLabel}</div>
        {M.bars.map(([name, pct], i) => {
          const k = ease(seg(s, 1.0 + i * 0.3, 2.4 + i * 0.3))
          return (
            <div key={name} style={{ position: 'absolute', left: 30, right: 30, top: 160 + i * 66, opacity: ease(seg(s, 0.9 + i * 0.3, 1.5 + i * 0.3)) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600 }}><span>{name}</span><span style={{ fontFamily: MONO, color: MUTE }}>{Math.round(pct * k)}%</span></div>
              <div style={{ marginTop: 10, height: 10, borderRadius: 6, background: 'rgba(255,255,255,.08)' }}><div style={{ width: `${pct * k}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${DEEP}, ${MAIN})`, boxShadow: `0 0 14px ${GLOW}` }} /></div>
            </div>
          )
        })}
      </Glass>
      <Glass x={660} y={200} w={560} h={370} accent={A} hot={allDone ? 0.6 : 0}>
        <div style={{ position: 'absolute', left: 28, top: 22, fontSize: 20, fontWeight: 700 }}>{M.rightTitle}</div>
        <div style={{ position: 'absolute', right: 28, top: 20 }}><Chip {...(allDone ? T.ok : T.warn)}>● {allDone ? M.allDone : M.working}</Chip></div>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 78, display: 'grid', gap: 12 }}>
          {M.queue.map(([name, amount, at]) => {
            const a = ease(seg(s, at, at + 0.5))
            const d = done(at)
            const tone = d ? T.ok : T.warn
            return (
              <div key={name} style={{ height: 62, borderRadius: 14, background: 'rgba(255,255,255,.055)', border: `1px solid ${tone.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', opacity: a, transform: `translateX(${(1 - a) * 26}px)` }}>
                <span style={{ fontWeight: 700, fontSize: 17 }}>{name}<br /><span style={{ color: MUTE, fontFamily: MONO, fontSize: 13, fontWeight: 500 }}>{amount}</span></span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: tone.color }}>{d ? `✓ ${M.doneLabel}` : M.pendingLabel}</span>
              </div>
            )
          })}
        </div>
      </Glass>
    </>
  )
}

function Close({ s, c, A }) {
  const [MAIN, DEEP, GLOW] = ACCENT[A]
  const C = c.close
  const pre = C.cur || ''
  const draw = ease(seg(s, 0.5, 2.2))
  const pts = C.series.map((v, i) => [30 + i * (500 / (C.series.length - 1)), 250 - v * 2.4])
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const cta = ease(seg(s, 1.6, 2.4))
  const pulse = 1 + Math.sin(s * 4) * 0.015
  const gid = `g-${c.id}`
  return (
    <>
      <Glass x={60} y={170} w={560} h={340} accent={A}>
        <div style={{ position: 'absolute', left: 30, top: 24, ...label }}>{C.label}</div>
        <div style={{ position: 'absolute', left: 30, top: 50, fontFamily: MONO, fontSize: 44, fontWeight: 700, color: INK, textShadow: `0 0 26px ${GLOW}` }}>{pre}{fmt(countAt(s, 0.4, 2.0, C.big))}</div>
        <svg width="560" height="340" style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={MAIN} stopOpacity=".34" /><stop offset="100%" stopColor={MAIN} stopOpacity="0" /></linearGradient></defs>
          <g style={{ clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)` }}>
            <polygon points={`30,310 ${line} 530,310`} fill={`url(#${gid})`} />
            <polyline points={line} fill="none" stroke={MAIN} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${MAIN})` }} />
          </g>
        </svg>
        <div style={{ position: 'absolute', left: 30, bottom: 18, display: 'flex', gap: 10, opacity: ease(seg(s, 1.8, 2.4)) }}>{C.chips.map((x) => <Chip key={x}>{x}</Chip>)}</div>
      </Glass>
      <Headline t={s} a={0.4} parts={[{ text: C.head[0] }, { text: C.head[1], hot: true }]} size={52} accent={A} x={680} y={196} width={540} />
      <div style={{ position: 'absolute', left: 680, top: 400, opacity: cta, transform: `translateY(${(1 - cta) * 16}px) scale(${pulse})`, transformOrigin: 'left center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '18px 34px', borderRadius: 999, background: `linear-gradient(90deg, ${MAIN}, ${DEEP})`, color: '#050914', fontWeight: 800, fontSize: 24, boxShadow: `0 0 ${34 + Math.sin(s * 4) * 8}px ${GLOW}` }}>Start free · 1-month trial</div>
        <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 15, color: MUTE, letterSpacing: 0.4 }}>No credit card · nexorasolution.online{C.path}</div>
      </div>
    </>
  )
}

export default function GenericIntro({ id, t }) {
  const intro = MODULE_INTROS[id]
  const c = { ...INTRO_CONFIGS[id], id }
  const A = intro.accent
  const [hook, list, flow, metrics, close] = intro.scenes
  return (
    <>
      <Brand product={c.brand} />
      <Scene t={t} a={hook.start} b={hook.end}>{(s) => <Hook s={s} c={c} A={A} />}</Scene>
      <Scene t={t} a={list.start} b={list.end}>{(s) => <List s={s} c={c} A={A} />}</Scene>
      <Scene t={t} a={flow.start} b={flow.end}>{(s) => <Flow s={s} c={c} A={A} />}</Scene>
      <Scene t={t} a={metrics.start} b={metrics.end}>{(s) => <Metrics s={s} c={c} A={A} />}</Scene>
      <Scene t={t} a={close.start} b={close.end}>{(s) => <Close s={s} c={{ ...c, close: { ...c.close, path: intro.path } }} A={A} />}</Scene>
      {intro.scenes.map((sc) => <Caption key={sc.id} t={t} a={sc.start + 0.7} b={sc.end - 0.1}>{sc.caption}</Caption>)}
      <Progress t={t} scenes={intro.scenes} accent={A} />
    </>
  )
}
