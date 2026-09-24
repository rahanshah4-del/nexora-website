import PageSeo from '../../components/PageSeo.jsx'
import { termsOfService } from '../../lib/legalContent.js'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import LegalDocument from './LegalDocument.jsx'
import PublicPageShell from './PublicPageShell.jsx'

export default function TermsPage() {
  const seo = getSeoForPath('/terms')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20 lg:py-24 text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <LegalDocument doc={termsOfService} dark />
        </div>
      </section>
    </PublicPageShell>
  )
}
