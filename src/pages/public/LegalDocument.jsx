import Link from '../../components/AppLink.jsx'
import { HiOutlineCheckCircle, HiOutlineChevronDown } from 'react-icons/hi2'
import { LEGAL_CONTACT, legalAnchor } from '../../lib/legalContent.js'
import { SITE_ADDRESS_TEXT } from '../../lib/seoStructuredData.js'

// Renders a policy document from src/lib/legalContent.js. The same data is
// baked into the prerendered HTML by scripts/prerender.mjs (buildLegalContent),
// including the contents list, so the two stay in step.
export default function LegalDocument({ doc, dark = false }) {
  const headingClass = dark ? 'text-white' : 'text-slate-900'
  const bodyClass = dark ? 'text-slate-300' : 'text-slate-500'
  const linkClass = dark ? 'text-sky-300 underline underline-offset-2' : 'text-blue-600 underline underline-offset-2'
  const cardClass = dark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/70'
  const showToc = doc.sections.length >= 4

  return (
    <div className={showToc ? 'mx-auto max-w-5xl lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12' : 'mx-auto max-w-3xl'}>
      {showToc ? (
        <nav aria-label="On this page" className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-24">
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${headingClass}`}>On this page</p>
            <ol className={`mt-3 space-y-1.5 border-l pl-4 text-[13px] leading-5 ${dark ? 'border-white/10' : 'border-slate-200'} ${bodyClass}`}>
              {doc.glance?.length ? <li><a href="#at-a-glance" className="hover:underline">{doc.glanceHeading}</a></li> : null}
              {doc.sections.map((section) => (
                <li key={section.heading}><a href={`#${legalAnchor(section.heading)}`} className="hover:underline">{section.heading}</a></li>
              ))}
              {doc.faqs?.length ? <li><a href="#questions" className="hover:underline">{doc.faqHeading}</a></li> : null}
            </ol>
          </div>
        </nav>
      ) : null}

      <div className="min-w-0 max-w-3xl">
        <h1 className={`text-4xl font-medium tracking-[-0.02em] sm:text-5xl ${headingClass}`}>{doc.title}</h1>
        <p className={`mt-4 text-sm ${bodyClass}`}>Last updated: {doc.lastUpdated}</p>
        <p className={`mt-6 text-base leading-8 sm:text-lg ${bodyClass}`}>{doc.intro}</p>

        {doc.glance?.length ? (
          <section id="at-a-glance" className="mt-10 scroll-mt-28">
            <h2 className={`text-xl font-medium tracking-[-0.01em] ${headingClass}`}>{doc.glanceHeading}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {doc.glance.map((item) => (
                <div key={item.title} className={`flex items-start gap-3 rounded-2xl border p-4 ${cardClass}`}>
                  <HiOutlineCheckCircle className={`mt-0.5 h-5 w-5 shrink-0 ${dark ? 'text-emerald-300' : 'text-emerald-600'}`} />
                  <div>
                    <h3 className={`text-[15px] font-medium ${headingClass}`}>{item.title}</h3>
                    <p className={`mt-1 text-[13.5px] leading-6 ${bodyClass}`}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {doc.glanceNote ? <p className={`mt-3 text-[13px] ${bodyClass}`}>{doc.glanceNote}</p> : null}
          </section>
        ) : null}

        <div className={`mt-10 space-y-10 ${bodyClass}`}>
          {doc.sections.map((section) => (
            <section key={section.heading} id={legalAnchor(section.heading)} className="scroll-mt-28">
              <h2 className={`text-xl font-medium tracking-[-0.01em] ${headingClass}`}>{section.heading}</h2>
              {(section.paragraphs || []).map((text) => (
                <p key={text} className="mt-3 leading-7">{text}</p>
              ))}
              {section.items?.length ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
              {section.links?.length ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
                  {section.links.map(({ label, href }) => (
                    <li key={href}>
                      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>{label}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {doc.faqs?.length ? (
          <section id="questions" className="mt-12 scroll-mt-28">
            <h2 className={`text-xl font-medium tracking-[-0.01em] ${headingClass}`}>{doc.faqHeading}</h2>
            <div className="mt-4 grid gap-3">
              {doc.faqs.map((faq) => (
                <details key={faq.q} className={`group rounded-2xl border p-4 ${cardClass}`}>
                  <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium ${headingClass}`}>
                    {faq.q}
                    <HiOutlineChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className={`mt-3 text-[14px] leading-7 ${bodyClass}`}>{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {doc.related?.length ? (
          <nav aria-label="Related pages" className="mt-12">
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${headingClass}`}>Related</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {doc.related.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className={`inline-flex rounded-full border px-4 py-1.5 text-[13px] font-medium ${dark ? 'border-white/15 text-sky-300' : 'border-slate-200 text-blue-600 hover:bg-slate-50'}`}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {doc.faqs?.length ? (
          <address className={`mt-10 rounded-2xl border p-5 text-[14px] not-italic leading-7 ${cardClass} ${bodyClass}`}>
            <p className={`font-medium ${headingClass}`}>{LEGAL_CONTACT.company}</p>
            <p>{SITE_ADDRESS_TEXT}</p>
            <p><a href={`mailto:${LEGAL_CONTACT.email}`} className={linkClass}>{LEGAL_CONTACT.email}</a> · <a href={LEGAL_CONTACT.whatsappUrl} className={linkClass}>WhatsApp {LEGAL_CONTACT.phone}</a></p>
          </address>
        ) : null}
      </div>
    </div>
  )
}
