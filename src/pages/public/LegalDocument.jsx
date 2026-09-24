// Renders a policy document from src/lib/legalContent.js. The same data is
// baked into the prerendered HTML by scripts/prerender.mjs (buildLegalContent).
export default function LegalDocument({ doc, dark = false }) {
  const headingClass = dark ? 'text-white' : 'text-slate-900'
  const bodyClass = dark ? 'text-slate-300' : 'text-slate-500'
  const linkClass = dark ? 'text-sky-300 underline underline-offset-2' : 'text-blue-600 underline underline-offset-2'

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className={`text-4xl font-medium tracking-[-0.02em] sm:text-5xl ${headingClass}`}>{doc.title}</h1>
      <p className={`mt-4 text-sm ${bodyClass}`}>Last updated: {doc.lastUpdated}</p>
      <p className={`mt-6 text-base leading-8 sm:text-lg ${bodyClass}`}>{doc.intro}</p>

      <div className={`mt-10 space-y-10 ${bodyClass}`}>
        {doc.sections.map((section) => (
          <section key={section.heading}>
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
    </div>
  )
}
