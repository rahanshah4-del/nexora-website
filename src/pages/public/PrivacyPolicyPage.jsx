import PageSeo from '../../components/PageSeo.jsx'
import { privacyPolicy } from '../../lib/legalContent.js'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import LegalDocument from './LegalDocument.jsx'
import PublicPageShell from './PublicPageShell.jsx'

export default function PrivacyPolicyPage() {
  const seo = getSeoForPath('/privacy-policy')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <LegalDocument doc={privacyPolicy} />
        </div>
      </section>
    </PublicPageShell>
  )
}
