import './geolintLoader.css'

/** Scanning-radar mark used by every GeoLint loading state. */
export function GlRadar() {
  return (
    <span className="glx-radar" aria-hidden="true">
      <span className="glx-ring" />
      <span className="glx-sweep" />
      <span className="glx-core" />
    </span>
  )
}

/** Centered loader with a title, optional hint and an indeterminate bar. */
export function GlLoader({ title = 'Loading', hint, full = false, bar = true }) {
  return (
    <div role="status" aria-live="polite" className={`glx-wrap${full ? ' glx-wrap-full' : ''}`}>
      <GlRadar />
      <p className="glx-title">{title}<span className="glx-dots" aria-hidden="true" /></p>
      {hint ? <p className="glx-sub">{hint}</p> : null}
      {bar ? <span className="glx-bar" aria-hidden="true"><i /></span> : null}
    </div>
  )
}

/** Shimmering placeholder cards while a list loads. */
export function GlSkeleton({ rows = 2, label = 'Loading' }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="glx-skel" style={{ height: i % 2 ? 112 : 96 }} />)}
    </div>
  )
}

/** Small inline spinner for buttons and one-line busy messages. */
export function GlMini() {
  return <span className="glx-mini" aria-hidden="true" />
}

/** Suspense fallback while a GeoLint page's code downloads. */
export function GlRouteLoader() {
  return <GlLoader full title="Opening GeoLint" hint="Getting your page ready." />
}
