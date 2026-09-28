import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../ui/hooks.js'
import { useStudio } from '../../ui/StudioContext.js'
import Icon from '../Icon.jsx'
import StepBusiness from './StepBusiness.jsx'
import StepClientItems from './StepClientItems.jsx'
import StepDesign from './StepDesign.jsx'

const STEPS = [
  { id: 1, label: 'Your business' },
  { id: 2, label: 'Client & items' },
  { id: 3, label: 'Design' },
]

function Progress({ step, onSelect }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((s, index) => {
          const done = s.id < step
          const current = s.id === step
          const content = (
            <>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${current ? 'bg-brand text-white shadow-sm' : done ? 'bg-blue-100 text-brand' : 'bg-slate-200 text-slate-500'}`}>
                {done ? <Icon name="check" className="h-4 w-4" /> : s.id}
              </span>
              <span className={`text-sm font-semibold ${current ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'} ${current ? '' : 'hidden sm:inline'}`}>{s.label}</span>
            </>
          )
          return (
            <li key={s.id} className="flex min-w-0 items-center gap-2 sm:gap-3" aria-current={current ? 'step' : undefined}>
              {done ? (
                <button type="button" onClick={() => onSelect(s.id)} className="-m-1 flex min-h-[44px] items-center gap-2 rounded-xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label={`Step ${s.id}: ${s.label} (done) — go back`}>
                  {content}
                </button>
              ) : (
                <span className="flex min-h-[44px] items-center gap-2" aria-label={`Step ${s.id}: ${s.label}${current ? ' (current)' : ''}`}>{content}</span>
              )}
              {index < STEPS.length - 1 ? <span className={`h-0.5 w-6 shrink-0 rounded-full sm:w-10 ${done ? 'bg-brand/40' : 'bg-slate-200'}`} aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Footer for a step: Back (secondary) and the step's one primary action.
 * Sticky at the bottom of the viewport on small screens.
 */
export function WizardFooter({ onBack, backLabel = 'Back', primaryLabel, onPrimary, primaryIcon = 'arrowRight', primaryTestId, note }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-slate-200/80 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {note ? <div className="mb-3">{note}</div> : null}
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="inline-flex h-[48px] items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <Icon name="arrowLeft" className="h-4 w-4" />{backLabel}
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={onPrimary}
          data-testid={primaryTestId}
          className="inline-flex h-[48px] min-w-[9rem] items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
        >
          {primaryLabel}
          {primaryIcon ? <Icon name={primaryIcon} className="h-5 w-5" /> : null}
        </button>
      </div>
    </div>
  )
}

/** The default experience: three short steps, then "Create". */
export default function Wizard() {
  const { wizardStep, setWizardStep } = useStudio()
  const rootRef = useRef(null)
  const headingRef = useRef(null)
  const reduced = usePrefersReducedMotion()
  const first = useRef(true)

  // On step change: move focus to the new step's heading and bring it into view.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    headingRef.current?.focus({ preventScroll: true })
    const top = rootRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0 || top > window.innerHeight * 0.4) {
      window.scrollTo({ top: window.scrollY + top - 72, behavior: reduced ? 'auto' : 'smooth' })
    }
  }, [wizardStep, reduced])

  const Step = wizardStep === 1 ? StepBusiness : wizardStep === 2 ? StepClientItems : StepDesign
  return (
    <div ref={rootRef} className={`mx-auto px-4 pb-10 pt-6 sm:pt-8 ${wizardStep === 3 ? 'max-w-5xl' : 'max-w-3xl'}`}>
      <Progress step={wizardStep} onSelect={setWizardStep} />
      <div key={wizardStep} className="ds-step-in mt-5 rounded-3xl border border-slate-200/80 bg-white px-4 pb-4 pt-6 shadow-card sm:mt-6 sm:px-8 sm:pb-8 sm:pt-8">
        <Step headingRef={headingRef} />
      </div>
    </div>
  )
}
