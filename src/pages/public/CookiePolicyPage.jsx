import PageSeo from '../../components/PageSeo.jsx'
import { cookiePolicy } from '../../lib/legalContent.js'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import LegalDocument from './LegalDocument.jsx'
import PublicPageShell from './PublicPageShell.jsx'

export default function CookiePolicyPage() {
  const seo = getSeoForPath('/cookie-policy')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <LegalDocument doc={cookiePolicy} />
        </div>
      </section>
    </PublicPageShell>
  )
}
