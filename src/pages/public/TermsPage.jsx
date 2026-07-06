import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

export default function TermsPage() {
  const seo = getSeoForPath('/terms')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20 lg:py-24 text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Terms of Service</h1>
            <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
              These terms govern your use of Nexora’s website, products, and services. By accessing this site, you agree to these conditions.
            </p>

            <div className="mt-10 space-y-10 text-slate-300">
              <section>
                <h2 className="text-xl font-semibold text-white">Use of service</h2>
                <p className="mt-3 leading-7">Use the website responsibly and do not attempt to reverse-engineer or misuse any software or data provided by Nexora.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-white">Intellectual property</h2>
                <p className="mt-3 leading-7">All content, logos, and software on this website are owned or licensed by Nexora and protected by law.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-white">Limitation of liability</h2>
                <p className="mt-3 leading-7">Nexora is not responsible for indirect losses, and our liability is limited to the extent permitted by applicable law.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-white">Subscriptions and services</h2>
                <p className="mt-3 leading-7">Software access, business services, onboarding and custom work may have separate scope, pricing, activation and support terms agreed with the client.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-white">Contact</h2>
                <p className="mt-3 leading-7">For service, billing or account questions, contact Nexora Solution through WhatsApp at 03194329754 or the website contact page.</p>
              </section>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
