import { useId } from 'react'
import { getDocumentType } from '../../engine/index.js'
import { PAPERS } from '../../templates/specs.js'
import { useStudio } from '../../ui/StudioContext.js'
import Icon from '../Icon.jsx'
import { AccentPicker, PaperPicker } from '../sections/FinishSections.jsx'
import TemplateGallery from '../TemplateGallery.jsx'
import { WizardFooter } from './Wizard.jsx'

/** Step 3 — pick a look; the one primary action creates the document. */
export default function StepDesign({ headingRef }) {
  const { doc, commands, setWizardStep } = useStudio()
  const galleryLabel = useId()
  const label = getDocumentType(doc.type).label
  const thermal = PAPERS[doc.appearance.paperSize]?.kind === 'receipt'
  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none sm:text-[1.7rem]">Choose a design</h2>
      <p className="mt-1 text-sm text-slate-600 sm:text-base">Every design shows your own details. You can switch any time.</p>

      <div className="mt-6 space-y-7">
        <div>
          <p id={galleryLabel} className="mb-3 text-sm font-semibold text-slate-800">Template</p>
          {thermal ? (
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
              Thermal paper uses the receipt layout. Pick A4 or Letter below to use these templates.
            </p>
          ) : null}
          <TemplateGallery labelId={galleryLabel} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <AccentPicker />
          <PaperPicker />
        </div>
      </div>

      <WizardFooter
        onBack={() => setWizardStep(2)}
        backLabel="Items"
        primaryLabel={`Create ${label}`}
        primaryIcon="check"
        onPrimary={commands.createFromWizard}
        primaryTestId="create-document"
      />
    </div>
  )
}
