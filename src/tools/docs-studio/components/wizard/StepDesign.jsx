import { useId } from 'react'
import { getDocumentType } from '../../engine/index.js'
import { useStudio } from '../../ui/StudioContext.js'
import { AccentPicker, PaperPicker } from '../sections/FinishSections.jsx'
import TemplateGallery from '../TemplateGallery.jsx'
import { WizardFooter } from './Wizard.jsx'

/** Step 3 — pick a look; the one primary action creates the document. */
export default function StepDesign({ headingRef }) {
  const { doc, commands, setWizardStep } = useStudio()
  const galleryLabel = useId()
  const label = getDocumentType(doc.type).label
  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none sm:text-[1.7rem]">Choose a design</h2>
      <p className="mt-1 text-sm text-slate-600 sm:text-base">Every design shows your own details. You can switch any time.</p>

      <div className="mt-6 space-y-7">
        <div>
          <p id={galleryLabel} className="mb-3 text-sm font-semibold text-slate-800">Template</p>
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
