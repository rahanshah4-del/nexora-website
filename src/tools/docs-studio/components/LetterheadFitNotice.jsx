import { PAPERS, resolveLayout } from '../templates/specs.js'
import { useStudio } from '../ui/StudioContext.js'
import Icon from './Icon.jsx'

/**
 * One line when the letterhead's shape does not match the paper (more than
 * 3 % off): it is fitted rather than stretched; suggest the matching size.
 */
export default function LetterheadFitNotice() {
  const { previewDocument, actions } = useStudio()
  const layout = resolveLayout(previewDocument)
  const fit = layout.kind === 'page' ? layout.spec.letterheadFit : null
  if (!fit || fit.mode !== 'fit') return null
  const suggested = fit.suggestedPaper ? PAPERS[fit.suggestedPaper] : null
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-800" role="status" data-testid="letterhead-fit-notice">
      <Icon name="info" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        {suggested
          ? `Your letterhead is ${suggested.label} size, so it is fitted to ${layout.paper.label} without stretching.`
          : `Your letterhead is not A4 or Letter shaped, so it is fitted to ${layout.paper.label} without stretching.`}
      </span>
      {suggested ? (
        <button type="button" onClick={() => actions.setAppearance({ paperSize: suggested.id })} className="min-h-[44px] rounded-lg px-2 font-semibold text-amber-900 underline underline-offset-2 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
          Use {suggested.label}
        </button>
      ) : null}
    </p>
  )
}
