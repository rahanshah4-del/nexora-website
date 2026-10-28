import { useEffect, useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import { getFixService } from '../../../lib/geolintClient.js'
import { DEFAULT_TARGET, formatMoney, planPrice, upsellInfo } from '../../../lib/geolintFix.js'
import { GEOLINT_FIX_PATH } from '../../../lib/geolintLaunch.js'

const key = (id) => `geolint-upsell-${id}`
const wasDismissed = (id) => { try { return sessionStorage.getItem(key(id)) === '1' } catch { return false } }

/**
 * Floating offer on a finished GEO fix: the full-website SEO job as a new order for the same site.
 * Tone follows the results (still work to do, or happy with them). Can be closed for the rest of the visit.
 */
export default function UpsellFloat({ order, target = DEFAULT_TARGET }) {
  const info = upsellInfo(order, target)
  const [dismissed, setDismissed] = useState(() => wasDismissed(order.id))
  const [price, setPrice] = useState(() => planPrice(null, 'seo'))
  useEffect(() => {
    let live = true
    getFixService().then((s) => { if (live) setPrice(planPrice(s, 'seo')) }).catch(() => {})
    return () => { live = false }
  }, [])
  if (!info || dismissed) return null
  const href = `${GEOLINT_FIX_PATH}?url=${encodeURIComponent(order.siteUrl || '')}&plan=seo`
  const improve = info.mode === 'improve'
  const close = () => { setDismissed(true); try { sessionStorage.setItem(key(order.id), '1') } catch { /* private mode: it just comes back next visit */ } }
  return (
    <div className="gu" role="complementary" aria-label="Full website SEO offer">
      <Link to={href} className="gu-main gx-focus">
        <span className="gu-badge" aria-hidden="true">SEO</span>
        <span className="gu-text">
          <strong>{improve ? (info.pagesToImprove > 0 ? `${info.pagesToImprove} pages still need work` : 'Your site can score higher') : 'Happy with the result?'}</strong>
          <span>{improve ? 'Get the full website SEO done for you' : 'Take your whole website further with full SEO'} <b>{formatMoney({ amount: price })}</b></span>
        </span>
        <span aria-hidden="true" className="gu-go">&rsaquo;</span>
      </Link>
      <button type="button" className="gu-x gx-focus" onClick={close} aria-label="Close this offer">&times;</button>
    </div>
  )
}
