import { AppearanceSection, NotesSection } from './sections/FinishSections.jsx'
import { PaymentsSection, TaxesSection } from './sections/AdjustmentSections.jsx'
import DetailsSection from './sections/DetailsSection.jsx'
import ItemsSection from './sections/ItemsSection.jsx'
import { BusinessSection, ClientSection } from './sections/PartySections.jsx'

/** The eight editor cards, in order. */
export default function EditorSections() {
  return (
    <div className="space-y-3">
      <BusinessSection />
      <ClientSection />
      <DetailsSection />
      <ItemsSection />
      <TaxesSection />
      <PaymentsSection />
      <NotesSection />
      <AppearanceSection />
    </div>
  )
}
