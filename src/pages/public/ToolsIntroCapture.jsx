import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import ToolsIntroStage from '../../components/tools/ToolsIntroStage.jsx'
import { TOOLS_INTRO } from '../../lib/toolsIntroData.js'

/** Frame source for scripts/render-tools-video.mjs. noindex, not linked and not in the sitemap. */
export default function ToolsIntroCapture() {
  const [t, setT] = useState(TOOLS_INTRO.posterT)
  useEffect(() => {
    document.title = 'Tools intro frame renderer'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    window.__setT = (v) => { flushSync(() => setT(v)) }
    window.__ready = true
    return () => { delete window.__setT; meta.remove() }
  }, [])
  return <div style={{ background: '#050816', width: TOOLS_INTRO.width, height: TOOLS_INTRO.height }}><ToolsIntroStage t={t} /></div>
}
