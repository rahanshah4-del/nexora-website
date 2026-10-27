import { useEffect, useRef, useState } from 'react'

/**
 * Head-office map for the contact page (Google Maps JavaScript API).
 *
 * The key is a browser key restricted in Google Cloud to nexorasolution.us and
 * www.nexorasolution.us and to the Maps JavaScript API only, so it is safe to ship.
 *
 * OFFICE_PIN: set { lat, lng } to the exact office location (copy it from the
 * Google Business Profile: Maps, right-click the office, first line). While it is
 * null the map shows Multan without a marker, so we never point at a wrong spot.
 * The directions button searches by business name and always works.
 */
const MAPS_KEY = 'AIzaSyD122dUPnEfrMnLjaUgtZ2zWX03WmOjEos'
const CITY_CENTER = { lat: 30.1575, lng: 71.5249 } // Multan
const OFFICE_PIN = null // e.g. { lat: 30.1978, lng: 71.4711 }
const DIRECTIONS_URL = 'https://www.google.com/maps/search/?api=1&query=Nexora+Solution+Multan'

let loader = null
function loadMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)
  if (window.google?.maps?.importLibrary) return window.google.maps.importLibrary('maps').then(() => window.google.maps)
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly&loading=async`
      script.async = true
      // loading=async: the Map class arrives through importLibrary, not at script load.
      script.onload = () => {
        const maps = window.google?.maps
        if (!maps?.importLibrary) return reject(new Error('Maps failed'))
        maps.importLibrary('maps').then(() => resolve(maps)).catch(reject)
      }
      script.onerror = () => { loader = null; reject(new Error('Maps failed')) }
      document.head.appendChild(script)
    })
  }
  return loader
}

export default function OfficeMap({ className = '' }) {
  const box = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const node = box.current
    if (!node) return undefined
    let cancelled = false
    const start = (attempt = 0) => {
      loadMaps().then((maps) => {
        if (cancelled) return
        const center = OFFICE_PIN || CITY_CENTER
        const map = new maps.Map(node, { center, zoom: OFFICE_PIN ? 16 : 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: true })
        if (OFFICE_PIN) new maps.Marker({ position: OFFICE_PIN, map, title: 'Nexora Solution head office' })
      }).catch((error) => {
        if (cancelled) return
        console.warn('[OfficeMap] Google Maps failed to load', error?.message || error)
        // The script may have been interrupted (slow network, ad blocker); try once more.
        if (attempt < 1) { loader = null; setTimeout(() => start(attempt + 1), 1500) } else setFailed(true)
      })
    }
    // Load the Maps script only when the map is about to scroll into view.
    if (typeof IntersectionObserver === 'undefined') { start(); return () => { cancelled = true } }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); start() }
    }, { rootMargin: '300px' })
    observer.observe(node)
    return () => { cancelled = true; observer.disconnect() }
  }, [])

  return (
    <div className={className}>
      <div className="relative h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-72">
        <div ref={box} className="absolute inset-0" role="region" aria-label="Map of the Nexora Solution head office" />
        {failed ? <p className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-slate-500">The map could not load. Use the directions button below.</p> : null}
      </div>
      <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:underline">Get directions on Google Maps &rarr;</a>
    </div>
  )
}
