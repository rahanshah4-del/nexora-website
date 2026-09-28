import Link from '../components/AppLink.jsx'
import ToolIcon from '../pages/public/tools/ToolIcon.jsx'
import { TOOLS_HUB_PATH, toolsNavLinks } from '../lib/toolsLaunch.js'

/**
 * Homepage section for the free tools, after the pricing section. Renders
 * nothing until the tools launch (src/lib/toolsLaunch.js). Reads only the
 * small launch module, so the tools pages' content stays out of the
 * homepage bundle.
 */
export default function FreeToolsSection() {
  const tools = toolsNavLinks()
  if (!tools.length) return null
  return (
    <section data-reveal aria-labelledby="free-tools-heading" className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">Free · Private · No watermark</span>
          <h2 id="free-tools-heading" className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Free Business Tools — <span className="marker-highlight marker-highlight-blue">No Signup Needed</span></h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">Create invoices, quotations and receipts in your browser. What you type stays on your device.</p>
        </div>
        <ul className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <li key={tool.key} className="premium-card group relative flex h-full flex-col items-center p-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 ring-1 ring-blue-100"><ToolIcon name={tool.key} className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-extrabold text-slate-950">{tool.label}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{tool.blurb}</p>
              <Link to={tool.path} className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-extrabold text-blue-600 after:absolute after:inset-0 after:content-['']">
                Open tool<span className="sr-only">: {tool.label}</span> <ToolIcon name="arrow" className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center">
          <Link to={TOOLS_HUB_PATH} className="premium-button-secondary">See all tools <ToolIcon name="arrow" className="h-5 w-5" /></Link>
        </p>
      </div>
    </section>
  )
}
