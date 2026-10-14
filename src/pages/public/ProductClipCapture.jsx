import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import ProductClipStage from '../../components/product/ProductClipStage.jsx'
import { PRODUCT_CLIP } from '../../lib/productVideos.js'

/** Frame source for scripts/render-product-clips.mjs (?clip=<id>). noindex, not linked and not in the sitemap. */
export default function ProductClipCapture() {
  const clip = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('clip') || ''
  const [t, setT] = useState(PRODUCT_CLIP.posterT)
  useEffect(() => {
    document.title = 'Product clip frame renderer'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    window.__setT = (v) => { flushSync(() => setT(v)) }
    window.__ready = true
    return () => { delete window.__setT; meta.remove() }
  }, [])
  return <div style={{ background: '#e9f1ff', width: PRODUCT_CLIP.width, height: PRODUCT_CLIP.height }}><ProductClipStage clip={clip} t={t} /></div>
}
