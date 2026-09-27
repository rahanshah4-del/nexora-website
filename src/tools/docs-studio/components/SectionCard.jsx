import { useStudio } from '../ui/StudioContext.js'
import Icon from './Icon.jsx'

/** Collapsible editor card. Content stays mounted (so issue links can find fields). */
export default function SectionCard({ id, title, icon, summary, badge, children }) {
  const { openSections, toggleSection } = useStudio()
  const open = openSections.has(id)
  return (
    <section id={`ds-section-${id}`} tabIndex={-1} aria-labelledby={`ds-section-${id}-title`} className="rounded-2xl border border-slate-200/80 bg-white shadow-card focus:outline-none">
      <h2 id={`ds-section-${id}-title`} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`ds-section-${id}-body`}
          onClick={() => toggleSection(id)}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:px-5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-semibold text-slate-900">{title}</span>
            {summary ? <span className="block truncate text-xs font-normal text-slate-500">{summary}</span> : null}
          </span>
          {badge}
          <Icon name="chevronDown" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={`ds-section-${id}-body`} className={`ds-collapse ${open ? 'ds-collapse-open' : ''}`} inert={open ? undefined : true}>
        <div className="ds-collapse-inner">
          <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">{children}</div>
        </div>
      </div>
    </section>
  )
}
