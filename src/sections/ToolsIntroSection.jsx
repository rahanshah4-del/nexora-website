import NexoraIntroPlayer from '../components/home/NexoraIntroPlayer.jsx'
import Link from '../components/AppLink.jsx'
import { TOOLS_INTRO, TOOLS_INTRO_SCENES, toolsIntroSchema } from '../lib/toolsIntroData.js'

const schema = JSON.stringify(toolsIntroSchema()).replace(/</g, '\\u003c')

/**
 * /tools/ intro: a 57 second tour of the free business tools. Muted, looping MP4
 * that plays only while on screen; the chapter list under it is plain text with
 * links to each tool, so the page is useful without the video.
 */
export default function ToolsIntroSection({ className = '' }) {
  return (
    <section id="tools-intro-video" aria-labelledby="tools-intro-heading" className={`bg-white px-4 py-12 sm:px-6 sm:py-14 ${className}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">57-second tour</p>
          <h2 id="tools-intro-heading" className="mt-3 font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">See every free tool in under a minute</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">Invoices, quotations, receipts and pay stubs, with no signup and no watermark. It plays on a loop, with no sound. Pause it, or jump straight to the tool you need.</p>
        </div>
        <div className="mt-8"><NexoraIntroPlayer intro={TOOLS_INTRO} scenes={TOOLS_INTRO_SCENES} /></div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Video chapters">
          {TOOLS_INTRO_SCENES.filter((scene) => scene.links).map((scene) => (
            <li key={scene.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[15px] font-bold text-slate-900">{scene.title}</p>
              <p className="mt-1 text-[13.5px] leading-6 text-slate-600">{scene.caption}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 text-[13px] font-semibold">
                {scene.links.map(([label, to]) => <Link key={to} to={to} className="text-blue-700 hover:underline">{label} →</Link>)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
