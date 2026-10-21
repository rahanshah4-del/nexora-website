import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import ModuleIntroStage from '../../components/video/ModuleIntroStage.jsx'
import { MODULE_INTRO, getIntro } from '../../lib/moduleIntros.js'

/** Frame source for scripts/render-module-intros.mjs (?clip=<id>). noindex, not linked and not in the sitemap. */
export default function ModuleIntroCapture() {
  const id = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('clip') || ''
  const [t, setT] = useState(getIntro(id)?.posterT ?? 0)
  useEffect(() => {
    document.title = 'Module intro frame renderer'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    window.__setT = (v) => { flushSync(() => setT(v)) }
    window.__ready = true
    return () => { delete window.__setT; meta.remove() }
  }, [])
  return <div style={{ background: '#050914', width: MODULE_INTRO.stageWidth, height: MODULE_INTRO.stageHeight }}><ModuleIntroStage id={id} t={t} /></div>
}
