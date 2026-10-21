/**
 * Shared building blocks for the dark "futuristic" module intro videos
 * (src/components/video/ModuleIntroStage.jsx). Everything here is a pure
 * function of time t (seconds), so a video is made by setting t and taking
 * screenshots (scripts/render-module-intros.mjs). The visual language follows
 * the GeoLint video: deep navy, a faint grid, glass cards, mono numbers and one
 * neon accent colour per module. All figures in the scenes are sample data.
 */
import { ACCENT, H, INK, MONO, MUTE, FONT, W, clamp, ease, easeIO, lerp, seg, win } from './fxMath.js'

/** The page: navy base, drifting grid, slow aurora and a vignette. */
export function Stage({ t, accent = 'blue', children }) {
  const [main, , glow] = ACCENT[accent]
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: '#050914', color: INK, fontFamily: FONT }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, #0d1736 0%, #050914 62%)' }} />
      <div style={{ position: 'absolute', width: 760, height: 760, left: -140 + Math.sin(t * 0.35) * 70, top: -300 + Math.cos(t * 0.3) * 40, borderRadius: '50%', background: `radial-gradient(circle, ${glow}, transparent 66%)`, filter: 'blur(30px)', opacity: 0.8 }} />
      <div style={{ position: 'absolute', width: 640, height: 640, right: -180 + Math.cos(t * 0.28) * 60, bottom: -300 + Math.sin(t * 0.33) * 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.32), transparent 66%)', filter: 'blur(34px)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,255,.07) 1px, transparent 1px)', backgroundSize: '48px 48px', backgroundPosition: `${(t * 5) % 48}px ${(t * 3) % 48}px`, maskImage: 'radial-gradient(ellipse at 50% 45%, #000 20%, transparent 78%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, #000 20%, transparent 78%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: ((t * 90) % (H + 200)) - 100, height: 2, background: `linear-gradient(90deg, transparent, ${main}, transparent)`, opacity: 0.1 }} />
      {children}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(2,4,12,.65) 100%)', pointerEvents: 'none' }} />
    </div>
  )
}

/** A scene: shown between a and b, with a soft blur-and-lift transition. Children get the local time. */
export function Scene({ t, a, b, children }) {
  if (t < a - 0.05 || t > b + 0.05) return null
  const v = win(t, a, b, 0.55)
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: v, transform: `translateY(${(1 - v) * 14}px) scale(${0.985 + v * 0.015})`, filter: v < 0.98 ? `blur(${(1 - v) * 7}px)` : 'none' }}>
      {children(t - a)}
    </div>
  )
}

/** Frosted glass panel. */
export function Glass({ x, y, w, h, r = 22, accent, hot = 0, style, children }) {
  const [main, , glow] = ACCENT[accent || 'blue']
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, background: 'linear-gradient(160deg, rgba(255,255,255,.085), rgba(255,255,255,.03))', border: `1px solid ${hot > 0 ? main : 'rgba(255,255,255,.14)'}`, boxShadow: `0 24px 60px -28px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.1)${hot > 0 ? `, 0 0 ${30 * hot}px ${glow}` : ''}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', ...style }}>
      {children}
    </div>
  )
}

export function Chip({ children, color = MUTE, bg = 'rgba(255,255,255,.06)', border = 'rgba(255,255,255,.14)', style }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px', borderRadius: 999, background: bg, color, border: `1px solid ${border}`, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', ...style }}>{children}</span>
}

export function Eyebrow({ children, accent = 'blue', style }) {
  return <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: 3.2, textTransform: 'uppercase', color: ACCENT[accent][0], ...style }}>{children}</div>
}

/** Heading that lifts in word by word. `parts` is [{ text, hot }], `a` the start time. */
export function Headline({ t, a, parts, size = 44, accent = 'blue', x = 0, y = 0, align = 'left', width }) {
  const [main, deep] = ACCENT[accent]
  const words = parts.flatMap((p) => p.text.split(' ').map((word) => ({ word, hot: p.hot })))
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, textAlign: align, fontSize: size, fontWeight: 800, letterSpacing: -size * 0.03, lineHeight: 1.08, color: '#f4f7ff' }}>
      {words.map(({ word, hot }, i) => {
        const k = ease(seg(t, a + i * 0.07, a + i * 0.07 + 0.55))
        const style = { display: 'inline-block', marginRight: size * 0.26, opacity: k, transform: `translateY(${(1 - k) * 22}px)`, filter: k < 1 ? `blur(${(1 - k) * 5}px)` : 'none' }
        if (hot) Object.assign(style, { background: `linear-gradient(90deg, ${main}, ${deep})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' })
        return <span key={`${word}-${i}`} style={style}>{word}</span>
      })}
    </div>
  )
}

/** Cursor path: keys are [time, x, y]. */
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

export function Pointer({ t, keys, clicks = [], accent = 'blue', show = 1 }) {
  const [x, y] = path(t, keys)
  const [main] = ACCENT[accent]
  const press = clicks.some((c) => t >= c && t < c + 0.16)
  const ripple = clicks.map((c) => seg(t, c, c + 0.6)).find((s) => s > 0 && s < 1) || 0
  return (
    <div style={{ opacity: show, position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
      {ripple > 0 ? <div style={{ position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 30, border: `2px solid ${main}`, boxShadow: `0 0 24px ${main}`, opacity: 1 - ripple, transform: `scale(${0.3 + ripple})` }} /> : null}
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ position: 'absolute', left: x - 4, top: y - 3, transform: `scale(${press ? 0.86 : 1})`, filter: `drop-shadow(0 0 8px ${main}) drop-shadow(0 4px 6px rgba(0,0,0,.6))` }}>
        <path d="M5 3l14 8-6.2 1.6L9.8 19z" fill="#fff" stroke="#0b1226" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** A glowing orb with a trail that travels from one point to another (data moving between cards). */
export function Packet({ t, a, b, from, to, accent = 'blue' }) {
  const k = seg(t, a, b)
  if (k <= 0 || k >= 1) return null
  const [main] = ACCENT[accent]
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((n) => {
        const kk = easeIO(clamp(k - n * 0.035))
        const x = lerp(from[0], to[0], kk)
        const y = lerp(from[1], to[1], kk) - Math.sin(kk * Math.PI) * 46
        return <div key={n} style={{ position: 'absolute', left: x - 7, top: y - 7, width: 14, height: 14, borderRadius: 7, background: main, opacity: (1 - n * 0.16) * 0.95, boxShadow: `0 0 ${22 - n * 3}px ${main}`, zIndex: 30 }} />
      })}
    </>
  )
}

/** A dashed connector between two points that draws itself. */
export function Link({ t, a, b, from, to, accent = 'blue', dim = 0.5 }) {
  const k = ease(seg(t, a, b))
  if (k <= 0) return null
  const [main] = ACCENT[accent]
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <line x1={from[0]} y1={from[1]} x2={from[0] + dx * k} y2={from[1] + dy * k} stroke={main} strokeWidth="2" strokeDasharray="6 8" opacity={dim} />
    </svg>
  )
}

/** Brand bar: logo mark, product name and the sample-data tag. */
export function Brand({ product, accent = 'blue' }) {
  const [main, deep] = ACCENT[accent]
  return (
    <>
      <div style={{ position: 'absolute', left: 44, top: 28, display: 'flex', alignItems: 'center', gap: 12, zIndex: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(140deg, ${main}, ${deep})`, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, color: '#06101f', boxShadow: `0 0 22px ${ACCENT[accent][2]}` }}>N</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Nexora <span style={{ color: MUTE, fontWeight: 500 }}>{product}</span></div>
      </div>
      <div style={{ position: 'absolute', right: 44, top: 30, zIndex: 20 }}><Chip>Sample data</Chip></div>
    </>
  )
}

/** Caption pill near the bottom. */
export function Caption({ t, a, b, children }) {
  const v = win(t, a, b, 0.45)
  if (v <= 0) return null
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 62, display: 'flex', justifyContent: 'center', opacity: v, transform: `translateY(${(1 - v) * 10}px)`, zIndex: 20 }}>
      <div style={{ padding: '10px 22px', borderRadius: 14, background: 'rgba(8,14,34,.72)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', fontSize: 19, fontWeight: 500, color: '#dbe5ff', maxWidth: 940, textAlign: 'center' }}>{children}</div>
    </div>
  )
}

/** Chapter bar at the very bottom: one segment per scene, filling as it plays. */
export function Progress({ t, scenes, accent = 'blue' }) {
  const [main, deep] = ACCENT[accent]
  return (
    <div style={{ position: 'absolute', left: 44, right: 44, bottom: 26, display: 'flex', gap: 8, zIndex: 20 }}>
      {scenes.map((s) => (
        <div key={s.id} style={{ flex: s.end - s.start, height: 4, borderRadius: 3, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
          <div style={{ width: `${seg(t, s.start, s.end) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${main}, ${deep})`, boxShadow: `0 0 10px ${main}` }} />
        </div>
      ))}
    </div>
  )
}
