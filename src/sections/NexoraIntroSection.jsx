import NexoraIntroPlayer from '../components/home/NexoraIntroPlayer.jsx'
import Link from '../components/AppLink.jsx'
import { NEXORA_INTRO_SCENES, nexoraIntroSchema } from '../lib/nexoraIntroData.js'
import { TOOLS_LAUNCHED } from '../lib/toolsLaunch.js'

const schema = JSON.stringify(nexoraIntroSchema()).replace(/</g, '\\u003c')

/**
 * Homepage intro: a 72 second tour of every Nexora product. The video is a muted,
 * looping MP4 that plays only while on screen; the chapter list below it is
 * text with links to each product page, so the page is useful without the video.
 */
export default function NexoraIntroSection() {
  return (
    <section id="intro-video" aria-labelledby="intro-video-heading" className="bg-white py-14 sm:py-16 lg:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">72-second tour</p>
          <h2 id="intro-video-heading" className="website-section-heading mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">See everything Nexora does, in one minute</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">POS, ERP, CRM, AI and custom software on one platform. It plays on a loop, with no sound. Pause it, or jump to the product you need below.</p>
        </div>
        <div className="mt-9"><NexoraIntroPlayer /></div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Video chapters">
          {NEXORA_INTRO_SCENES.filter((scene) => scene.id !== 'hook' && scene.id !== 'close').map((scene) => (
            <li key={scene.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[15px] font-bold text-slate-900">{scene.title}</p>
              <p className="mt-1 text-[13.5px] leading-6 text-slate-600">{scene.caption}</p>
              {scene.links ? (
                <p className="mt-2 flex flex-wrap gap-x-4 text-[13px] font-semibold">
                  {scene.links.filter(([, to]) => TOOLS_LAUNCHED || !to.startsWith('/tools')).map(([label, to]) => <Link key={to} to={to} className="text-blue-700 hover:underline">{label} →</Link>)}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
