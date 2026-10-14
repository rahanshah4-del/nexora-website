import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import NexoraIntroStage from '../../components/home/NexoraIntroStage.jsx'
import { NEXORA_INTRO } from '../../lib/nexoraIntroData.js'

/** Frame source for scripts/render-nexora-video.mjs. noindex, not linked and not in the sitemap. */
export default function NexoraIntroCapture() {
  const [t, setT] = useState(NEXORA_INTRO.posterT)
  useEffect(() => {
    document.title = 'Nexora intro frame renderer'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    window.__setT = (v) => { flushSync(() => setT(v)) }
    window.__ready = true
    return () => { delete window.__setT; meta.remove() }
  }, [])
  return <div style={{ background: '#f8fbff', width: NEXORA_INTRO.width, height: NEXORA_INTRO.height }}><NexoraIntroStage t={t} /></div>
}
