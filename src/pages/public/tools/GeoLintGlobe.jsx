import { useEffect, useRef } from 'react'
import { MARKET_GEO, WORLD_DOTS } from '../../../lib/worldDots.js'

/**
 * A dotted globe of the real world, drawn on a canvas. It turns slowly on its own and, when the client picks
 * a market, rolls round to that country, lights its dots in orange and drops a pulsing pin on it.
 * The land comes from Natural Earth (src/lib/worldDots.js); nothing is fetched. With reduced motion it
 * draws one still frame, already turned to the chosen country.
 */

const RAD = Math.PI / 180
const GRATICULE = 'rgba(148,163,184,0.28)'

/** Orthographic projection: where a point lands on the disc, and how directly it faces us (c > 0 = near side). */
function project(lat, lon, lat0, lon0) {
  const la = lat * RAD
  const dl = (lon - lon0) * RAD
  const l0 = lat0 * RAD
  return [Math.cos(la) * Math.sin(dl), Math.cos(l0) * Math.sin(la) - Math.sin(l0) * Math.cos(la) * Math.cos(dl), Math.sin(l0) * Math.sin(la) + Math.cos(l0) * Math.cos(la) * Math.cos(dl)]
}

const shortest = (from, to) => ((((to - from) % 360) + 540) % 360) - 180

export default function Globe({ market, size = 360 }) {
  const canvas = useRef(null)
  const target = useRef(null)

  useEffect(() => { target.current = MARKET_GEO[market] || null }, [market])

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return undefined
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    el.width = size * dpr
    el.height = size * dpr
    ctx.scale(dpr, dpr)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const start = MARKET_GEO[market] || null
    target.current = start
    const view = { lon: reduced && start ? start.lon : (start ? start.lon : 70) - 100, lat: reduced && start ? Math.max(-35, Math.min(55, start.lat * 0.6)) : 14 }
    const R = size / 2 - 8
    const c = size / 2
    let raf = 0

    const line = (points, lat0, lon0) => {
      let pen = false
      ctx.beginPath()
      for (const [lat, lon] of points) {
        const [x, y, z] = project(lat, lon, lat0, lon0)
        if (z <= 0) { pen = false; continue }
        if (pen) ctx.lineTo(c + x * R, c - y * R)
        else { ctx.moveTo(c + x * R, c - y * R); pen = true }
      }
      ctx.stroke()
    }

    const draw = (t) => {
      const goal = target.current
      if (!reduced) {
        if (goal) {
          view.lon += shortest(view.lon, goal.lon + Math.sin(t / 2600) * 3) * 0.045
          view.lat += (Math.max(-35, Math.min(55, goal.lat * 0.6)) - view.lat) * 0.045
        } else {
          view.lon += 0.16
          view.lat += (14 - view.lat) * 0.03
        }
      }
      ctx.clearRect(0, 0, size, size)

      // soft halo, then the sphere
      const halo = ctx.createRadialGradient(c, c, R * 0.9, c, c, R * 1.12)
      halo.addColorStop(0, 'rgba(125,170,255,0.28)')
      halo.addColorStop(1, 'rgba(125,170,255,0)')
      ctx.fillStyle = halo
      ctx.beginPath(); ctx.arc(c, c, R * 1.12, 0, Math.PI * 2); ctx.fill()
      const body = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R)
      body.addColorStop(0, '#ffffff')
      body.addColorStop(1, '#e6edf6')
      ctx.fillStyle = body
      ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke()

      // faint graticule
      ctx.strokeStyle = GRATICULE; ctx.lineWidth = 0.8
      for (let lat = -60; lat <= 60; lat += 30) line(Array.from({ length: 61 }, (_, i) => [lat, -180 + i * 6]), view.lat, view.lon)
      for (let lon = -180; lon < 180; lon += 30) line(Array.from({ length: 31 }, (_, i) => [-90 + i * 6, lon]), view.lat, view.lon)

      // land, far side first so near dots sit on top; the chosen market is lit
      const lit = goal ? goal.id : -1
      for (let pass = 0; pass < 2; pass += 1) {
        for (let i = 0; i < WORLD_DOTS.length; i += 3) {
          const hot = WORLD_DOTS[i + 2] === lit
          if ((pass === 1) !== hot) continue
          const [x, y, z] = project(WORLD_DOTS[i] / 10, WORLD_DOTS[i + 1] / 10, view.lat, view.lon)
          if (z <= 0.02) continue
          const r = R * (hot ? 0.017 : 0.0125) * (0.55 + 0.45 * z)
          ctx.fillStyle = hot ? `rgba(249,115,22,${0.55 + 0.45 * z})` : `rgba(71,85,105,${0.18 + 0.7 * z})`
          ctx.beginPath(); ctx.arc(c + x * R, c - y * R, r, 0, Math.PI * 2); ctx.fill()
        }
      }

      // the pin
      if (goal) {
        const [x, y, z] = project(goal.lat, goal.lon, view.lat, view.lon)
        if (z > 0.05) {
          const px = c + x * R
          const py = c - y * R
          const phase = (t / 1500) % 1
          ctx.strokeStyle = `rgba(249,115,22,${0.55 * (1 - phase)})`; ctx.lineWidth = 2
          ctx.beginPath(); ctx.arc(px, py, 6 + 30 * phase, 0, Math.PI * 2); ctx.stroke()
          ctx.fillStyle = 'rgba(249,115,22,0.22)'
          ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5
          ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the market is read through a ref so a new pick turns the globe instead of rebuilding it
  }, [size])

  return <canvas ref={canvas} width={size} height={size} aria-hidden="true" style={{ width: size, height: size }} className="mx-auto block max-w-full" />
}
