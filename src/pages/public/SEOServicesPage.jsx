import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineMagnifyingGlass } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const services = [
  { t: 'Technical SEO', d: 'Can Google reach, read and index your pages? We check crawling, indexing, page speed on phones, redirects, duplicate pages, sitemaps and structured data. For React sites we also make sure the page text is in the HTML Google receives, as this site does.' },
  { t: 'On-Page SEO', d: 'Titles, descriptions, headings, internal links and the wording of each page, matched to what people actually type. Each page targets its own topic, so your pages do not compete with each other.' },
  { t: 'Keyword Research', d: 'We start from your own Google Search Console data, then check Google’s suggestions and search-volume ranges for Pakistan. You get a keyword-to-page map, not a long list nobody uses.' },
  { t: 'Content Strategy', d: 'Which pages to write or rewrite, in what order. We prefer fewer, useful pages written by a person who knows the subject over many thin pages, and that is also what search engines and ad networks reward.' },
  { t: 'Link Building', d: 'Listings in real business directories, mentions in relevant places, and content worth linking to. We do not buy links or use private blog networks, because they put your site at risk.' },
  { t: 'Local SEO', d: 'For businesses serving a city such as Multan, Lahore or Karachi: Google Business Profile, consistent name, address and phone details, local landing pages and reviews from real customers.' },
  { t: 'International SEO', d: 'For sites selling outside Pakistan: country and language targeting, hreflang tags where they apply, and content written for each market instead of translated word for word.' },
  { t: 'SEO Audits', d: 'A one-off review with a prioritised list of fixes, useful if you already have a developer or want a second opinion before spending on a rebuild.' },
]

const auditChecks = [
  'Is every important page indexed, and are unimportant ones kept out?',
  'Do two pages target the same search, so they compete?',
  'Is there enough real content on each page to answer the search?',
  'Do titles and descriptions read well and fit the page?',
  'Are internal links pointing at the pages that earn money?',
  'Does the site load fast on a mid-range phone and a slow connection?',
  'Is structured data present, correct and matching what is on the page?',
  'Are there broken links, redirect chains or leftover test pages?',
]

const process = [
  { t: 'SEO Audit', d: 'We read Search Console, crawl the site and list what is blocking growth, in priority order.' },
  { t: 'Strategy', d: 'Keywords are mapped to pages, weak pages are marked to rewrite, and we agree what to do first.' },
  { t: 'Implementation', d: 'Fixes go live in small batches so we can tell which change moved the numbers.' },
  { t: 'Monitoring', d: 'Search Console is checked on a schedule. Clicks, impressions, average position and indexing are tracked against the starting point.' },
  { t: 'Optimization', d: 'Pages that are close to page one get more work. Pages that are not working are rewritten or merged.' },
]

const wontDo = [
  { t: 'Promise a number one ranking', d: 'Nobody outside Google controls rankings. Anyone who guarantees position one is guessing or planning something risky.' },
  { t: 'Buy links or use link networks', d: 'These can work briefly and then get a site penalised. Recovery is slow.' },
  { t: 'Publish piles of auto-written pages', d: 'Thin, repetitive pages are exactly what Google’s helpful-content systems and ad networks mark down.' },
  { t: 'Hide your numbers', d: 'You see the same Search Console figures we do.' },
]

const pakistan = [
  'Many Pakistani searches mix English, Urdu and Roman Urdu. We check what people really type for your product, not what a tool in another country suggests.',
  'Phones dominate. A page that is slow or awkward on a mid-range Android phone loses visitors before SEO can help it.',
  'Customers often prefer to message on WhatsApp rather than fill a form, so contact buttons need to be easy to find on every page.',
  '“Price in Pakistan” searches are common, and pages that answer them honestly tend to earn trust. Our own FAQs do this.',
  'City terms such as Multan, Lahore or Karachi matter for services you deliver in person, but add little for software sold online.',
]

const faqs = [
  { q: 'How long does SEO take to show results?', a: 'For a new site, expect several months before steady growth, and more for competitive searches. Technical fixes can show in a few weeks. Pages on a young domain usually start with low impressions, which grow as Google learns the site.' },
  { q: 'What industries do you provide SEO for?', a: 'Mostly small and medium businesses, especially software, retail, restaurants, schools, services and online stores. If you are in a very regulated field such as medicine or finance, tell us up front, because the content rules are stricter.' },
  { q: 'Do you guarantee #1 rankings on Google?', a: 'No. Nobody can honestly guarantee a ranking. What we can promise is clear work: an audit, a plan, fixes made, and honest reporting on what changed in your Search Console numbers.' },
  { q: 'What is included in your monthly SEO reports?', a: 'Clicks, impressions, average position and click-through rate from Google Search Console, which pages and searches grew, what we changed, and what we plan for next month. It is plain text, not a wall of charts.' },
  { q: 'Do you do SEO for existing websites or only new ones?', a: 'Both. Many sites need fixes rather than a rebuild: merging pages that compete, fixing indexing, rewriting thin content. If a rebuild is the better option, we will say so.' },
  { q: 'What is the difference between SEO and Google Ads?', a: 'Ads give visitors while you pay for each click and stop when the budget does. SEO takes longer to start but visitors keep arriving without paying for each one. Many businesses use ads for quick results while SEO builds.' },
  { q: 'How much does SEO cost in Pakistan?', a: 'It depends on the size of the site, how competitive your keywords are and whether you want a one-off audit or monthly work. A single audit costs far less than ongoing monthly SEO. Tell us your site and goals, and we will quote after a quick look. Be wary of very cheap packages promising page-one rankings.' },
  { q: 'Can you help recover from a Google penalty?', a: 'Sometimes. First we check Search Console for a manual action message, which is the only real “penalty” notice. Often a drop is caused by algorithm changes, thin content or technical problems, and those can be fixed. We will tell you honestly what we find.' },
  { q: 'Do you offer SEO services in Lahore, Karachi or Multan?', a: 'Yes. SEO is done online, so your city does not limit us. For local businesses we also set up Google Business Profile and city pages, which matter most for services customers visit in person.' },
]

export default function SEOServicesPage() {
  const seo = getSeoForPath('/seo-services')

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="SEO Services" badgeIcon={HiOutlineMagnifyingGlass}>
      <PageSeo {...seo} faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/software-development">Software Development</Link>
        <span> / </span>
        <span aria-current="page">SEO Services</span>
      </nav>

      <section className="bg-fuchsia-50 pb-14 pt-24 sm:pt-28 lg:pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <h1 className="text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-zinc-900 sm:text-[3.6rem]">SEO Services in Pakistan</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-700 sm:text-lg">
              Technical SEO, on-page work, keyword research and content, driven by your own Google
              Search Console data. We explain every change and never promise a ranking we cannot control.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-fuchsia-700 px-6 text-sm font-bold text-white hover:bg-fuchsia-600">Get an SEO Audit <HiOutlineArrowRight className="h-4 w-4" /></a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-zinc-400 px-6 text-sm font-semibold text-zinc-800 hover:bg-white"><FaWhatsapp className="text-base text-emerald-600" /> WhatsApp Us</a>
            </div>
          </div>

          <div aria-label="Example search result" className="rounded-md border border-zinc-300 bg-white p-5 shadow-[8px_8px_0_0_rgba(162,28,175,0.2)]">
            <p className="text-xs text-zinc-500">example.pk › products › steel-shelves</p>
            <p className="mt-1 text-[18px] leading-6 text-blue-800">Steel Shelves in Lahore | Prices and Sizes | Example Store</p>
            <p className="mt-1 text-[14px] leading-6 text-zinc-600">Four-tier shelves in three sizes, with prices in PKR and delivery times for Lahore, Karachi and Islamabad.</p>
            <p className="mt-4 border-t border-dashed border-zinc-300 pt-3 text-xs leading-5 text-zinc-500">A made-up result, shown for illustration. Good titles and descriptions say what the page has and who it is for.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Complete SEO Solutions</h2>
          <div className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
            {services.map((s) => (
              <article key={s.t} className="grid gap-2 py-6 md:grid-cols-[14rem_1fr] md:gap-10">
                <h3 className="text-[17px] font-bold text-fuchsia-800">{s.t}</h3>
                <p className="text-[15px] leading-7 text-zinc-700">{s.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-3xl">What we check in an audit</h2>
            <ul className="mt-6 space-y-3 text-[15px] leading-7 text-zinc-700">
              {auditChecks.map((c) => (
                <li key={c} className="flex gap-3"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-700" />{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-3xl">Our SEO Process</h2>
            <ol className="mt-6 space-y-5">
              {process.map((p, i) => (
                <li key={p.t} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-fuchsia-700 text-sm font-bold text-white">{i + 1}</span>
                  <div>
                    <h3 className="text-[16px] font-bold text-zinc-900">{p.t}</h3>
                    <p className="mt-1 text-[14px] leading-6 text-zinc-600">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">What we will not do</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {wontDo.map((w) => (
              <div key={w.t} className="border-l-4 border-fuchsia-700 pl-5">
                <h3 className="text-[16px] font-bold text-zinc-900">{w.t}</h3>
                <p className="mt-1.5 text-[15px] leading-7 text-zinc-600">{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-fuchsia-50 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-3xl">SEO in Pakistan: what is different</h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Advice written for the US or UK does not always fit. These are the things we adjust for.
            </p>
          </div>
          <ul className="space-y-4 text-[15px] leading-7 text-zinc-700">
            {pakistan.map((p) => (
              <li key={p} className="flex gap-3"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-700" />{p}</li>
            ))}
          </ul>
        </div>
        <div className="mx-auto mt-10 max-w-6xl px-5 text-[15px] leading-7 text-zinc-600 sm:px-6 lg:px-8">
          We apply the same method to this website, which is built with the search basics in the HTML
          from the start. If you are building a new site, <Link to="/ecommerce-development" className="font-semibold text-fuchsia-800 hover:underline">e-commerce development</Link> and our wider
          <Link to="/software-development" className="font-semibold text-fuchsia-800 hover:underline"> software development services</Link> include the technical SEO setup. Our <Link to="/blog" className="font-semibold text-fuchsia-800 hover:underline">blog</Link> and
          <Link to="/geo" className="font-semibold text-fuchsia-800 hover:underline"> GEO tools</Link> cover how search is changing with AI answers.
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">SEO FAQs</h2>
          <div className="mt-8 divide-y divide-zinc-300 border-y border-zinc-300">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-zinc-900 marker:hidden">
                  <span className="mr-2 text-fuchsia-700 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-fuchsia-700 group-open:inline">−</span>
                  <h3 className="inline">{f.q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-md bg-zinc-900 p-8 text-white sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">Ready to Rank Higher on Google?</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-zinc-300">Send us your website address. We will look at it and tell you what is holding it back, before you spend anything.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-fuchsia-500 px-6 text-sm font-bold text-white hover:bg-fuchsia-400">Get Free Consultation <HiOutlineArrowRight className="h-4 w-4" /></a>
            <Link to="/software-development" className="inline-flex min-h-[44px] items-center rounded-md border border-zinc-500 px-6 text-sm font-semibold hover:bg-white/10">All development services</Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
