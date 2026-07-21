import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

export default function PrivacyPolicyPage() {
  const seo = getSeoForPath('/privacy-policy')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">Privacy Policy</h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              This Privacy Policy explains how Nexora collects, uses, discloses, and protects personal information when you use our website and services.
            </p>

            <div className="mt-10 space-y-10 text-slate-500">
              <section>
                <h2 className="text-xl font-medium tracking-[-0.01em] text-slate-900">Information we collect</h2>
                <p className="mt-3 leading-7">We may collect contact information, usage statistics, and technical data needed to deliver the website experience and support requests.</p>
              </section>
              <section>
                <h2 className="text-xl font-medium tracking-[-0.01em] text-slate-900">How we use information</h2>
                <p className="mt-3 leading-7">Your data is used to respond to inquiries, improve the website, and maintain security. We do not sell personal information.</p>
              </section>
              <section>
                <h2 className="text-xl font-medium tracking-[-0.01em] text-slate-900">Cookies and tracking</h2>
                <p className="mt-3 leading-7">We may use cookies and analytics tools to understand site usage and offer better service. You can control cookies through your browser settings.</p>
              </section>
              <section>
                <h2 className="text-xl font-medium tracking-[-0.01em] text-slate-900">Business service requests</h2>
                <p className="mt-3 leading-7">When you request a demo, quote, onboarding help or business service, we use the information you provide to contact you, review your need and prepare relevant support.</p>
              </section>
              <section>
                <h2 className="text-xl font-medium tracking-[-0.01em] text-slate-900">Contact and data questions</h2>
                <p className="mt-3 leading-7">For privacy questions, contact Nexora Solution through WhatsApp at 03194329754 or through the contact page on nexorasolution.online.</p>
              </section>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
