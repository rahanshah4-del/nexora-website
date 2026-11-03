import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineCodeBracket } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

// One line per service. Each one with its own page links there; the three
// without a page are explained further down this one.
const directory = [
  { name: 'Business Websites', to: '#service-business-websites', line: 'Company sites, landing pages and portals.' },
  { name: 'E-commerce Development', to: '/ecommerce-development', line: 'Online stores with payments, stock and orders.' },
  { name: 'Custom CRM Development', to: '/crm-development', line: 'Lead, pipeline and customer tools shaped to your sales process.' },
  { name: 'ERP Solutions', to: '/erp-development', line: 'Finance, stock, people and purchasing in one system.' },
  { name: 'Restaurant POS', to: '/restaurant-pos', line: 'Our own product: KOT, tables, billing and kitchen screen.' },
  { name: 'School Management System', to: '/school-erp', line: 'Our own product: students, fees, attendance and payroll.' },
  { name: 'Mobile App Development', to: '/mobile-app-development', line: 'Apps for phones, connected to your backend.' },
  { name: 'Web Applications', to: '#service-web-applications', line: 'Dashboards, portals and SaaS-style tools in the browser.' },
  { name: 'AI Solutions', to: '/ai', line: 'Assistants and automation inside business software.' },
  { name: 'API Integration', to: '/api-integration', line: 'Connect your software to payments, messaging and other systems.' },
  { name: 'Cloud Solutions', to: '/cloud-solutions', line: 'Hosting, deployment, backups and monitoring.' },
  { name: 'Software Maintenance & Support', to: '#service-software-maintenance', line: 'Fixes, updates and help after launch.' },
  { name: 'SEO Services', to: '/seo-services', line: 'Technical and content SEO for sites we build or inherit.' },
]

const inDepth = [
  {
    id: 'service-business-websites',
    title: 'Business Websites',
    tag: 'React',
    paras: [
      'A business website has one job: when someone searches for what you do, it should load fast, say clearly what you offer, and make it easy to contact you. We build these in React, so pages stay quick, and we set up the search basics (titles, descriptions, headings, a sitemap, structured data) while building rather than as an afterthought.',
      'This very site is the working example. It is a React app that is pre-rendered at build time, so the full text of every page is in the HTML that Google reads, and it is served from Cloudflare. We use the same approach for client sites.',
      'Content is the part many agencies skip. We will tell you plainly if a page has nothing useful on it yet, because thin pages hurt both visitors and search rankings.',
    ],
    includes: ['Responsive layouts for phone and desktop', 'On-page SEO set up during the build', 'Contact forms, maps and WhatsApp links', 'Analytics and conversion tracking', 'Hosting on Cloudflare with SSL'],
    stack: 'React, Vite, Tailwind CSS, Cloudflare',
  },
  {
    id: 'service-web-applications',
    title: 'Web Applications',
    tag: 'Firebase',
    paras: [
      'Sometimes the thing you need is not a website but a tool: a dashboard your team logs into, a customer portal, a booking system, a small SaaS. These are web applications, and they are the kind of software we build most. The Nexora platform itself (login, roles, multi-branch data, billing, reports) is one.',
      'The hard parts are rarely the screens. They are who can see which records, what happens when two people edit the same thing, and keeping each customer’s data separate from every other customer’s. We design those rules first and build the screens on top.',
    ],
    includes: ['Sign-in and role-based access', 'Per-customer or per-branch data separation', 'Dashboards, reports and exports', 'Real-time updates where they help', 'Admin panel for your own staff'],
    stack: 'React, Node.js, Firebase (Firestore and Auth), Cloudflare',
  },
  {
    id: 'service-software-maintenance',
    title: 'Software Maintenance & Support',
    tag: 'After launch',
    paras: [
      'Software does not stop needing attention on launch day. Libraries age, a payment provider changes an API, a new report is needed at quarter end. Maintenance means someone who already knows your system is available when that happens.',
      'We offer it for software we built and, case by case, for software we did not. Tell us what the system is, what is going wrong or what you want added, and we will say whether we can take it on before you commit to anything.',
    ],
    includes: ['Bug fixes and small improvements', 'Dependency and security updates', 'Performance checks', 'New features in agreed chunks', 'Support by WhatsApp and email'],
    stack: 'Whatever your system already runs on, after a first review',
  },
]

const built = [
  { name: 'Restaurant POS', to: '/restaurant-pos', text: 'KOT tickets, table management, billing and a kitchen display, with a Windows desktop app.' },
  { name: 'Retail POS', to: '/retail-pos', text: 'Barcode billing, discounts, tax, stock and customer ledgers for shops.' },
  { name: 'School ERP', to: '/school-erp', text: 'Student records, attendance, fee billing, exams and payroll in one place.' },
  { name: 'WhatsApp CRM', to: '/whatsapp-crm', text: 'Shared WhatsApp inbox, contacts, follow-ups and campaigns.' },
  { name: 'Nexora CRM', to: '/crm', text: 'Leads, pipeline, quotations, invoices and tasks for small teams.' },
  { name: 'Property ERP', to: '/property-erp', text: 'Leases, rent ledgers and repair tracking for property managers.' },
  { name: 'Transport & Fleet', to: '/transport-fleet', text: 'Vehicle availability, bookings and maintenance for rental fleets.' },
  { name: 'Pharmacy POS', to: '/pharmacy-pos', text: 'Medicine billing, batches and expiry tracking for medical stores.' },
]

const principles = [
  { t: 'Your data stays separated', d: 'Records are scoped per customer and per branch, with role-based access so staff only see what their job needs.' },
  { t: 'Built on managed infrastructure', d: 'We rely on Firebase and Cloudflare rather than a server we babysit ourselves, which keeps hosting simple and gives you backups to lean on.' },
  { t: 'Scope in writing first', d: 'Before work starts you get a written scope. If the scope changes, the price and timeline are discussed before the work is done, not after.' },
  { t: 'You see it as it grows', d: 'Working builds are shown during the project, so you correct course while it is cheap to do so.' },
  { t: 'Plain communication', d: 'You talk to the person who writes the code. WhatsApp or email, whichever you prefer.' },
  { t: 'No lock-in surprises', d: 'We tell you what the system runs on and who holds the accounts, so you are never unsure how to move it later.' },
]

const steps = [
  { t: 'Discovery', d: 'We ask how the work is done today: who does it, on what, and where it goes wrong. Most of the project is decided here.' },
  { t: 'Planning', d: 'A short written plan: what gets built first, what waits, which tools we will use, and a rough timeline.' },
  { t: 'UI/UX Design', d: 'Screens are sketched and shown to you before they are coded, so changes are cheap.' },
  { t: 'Development', d: 'We build in small pieces and show working software along the way instead of one big reveal.' },
  { t: 'Testing', d: 'We click through the real workflows ourselves, including the awkward ones like refunds, cancellations and wrong entries, then ask your staff to try it.' },
  { t: 'Deployment', d: 'The software goes live on its own domain with SSL, and we check it again in production.' },
  { t: 'Support', d: 'After launch we stay reachable for fixes and the next round of improvements.' },
]

const tools = [
  { n: 'React', d: 'Interfaces for websites and web apps, including this site.' },
  { n: 'Vite and Tailwind CSS', d: 'Fast builds and consistent styling.' },
  { n: 'Node.js', d: 'Server logic and background jobs where the browser is not enough.' },
  { n: 'Firebase', d: 'Sign-in and a real-time database behind our own SaaS products.' },
  { n: 'Cloudflare', d: 'Hosting, caching, workers and file storage.' },
  { n: 'Electron', d: 'The Windows desktop app for Restaurant POS.' },
  { n: 'Android', d: 'Android apps, such as our fleet app.' },
]

const faqs = [
  {
    q: 'What types of software does Nexora develop?',
    a: 'Business websites, e-commerce stores, custom CRM and ERP systems, restaurant and retail POS, school management software, mobile apps, web applications, AI features, API integrations and cloud setup. Most of what we build is business software for operations, such as billing, stock, records and customer follow-up.',
  },
  {
    q: 'How long does a typical software project take?',
    a: 'It depends entirely on scope. As a rough guide, a business website is usually a few weeks, and a custom CRM or ERP is usually a few months. We give a real estimate after discovery, once we know what has to be built, and we would rather say so than quote a number we cannot stand behind.',
  },
  {
    q: 'How much does custom software development cost?',
    a: 'Every project is priced from its scope, so we do not publish one figure. After a conversation about what you need, you receive a written proposal with the scope, timeline and price. If you only need a standard system, our ready-made products on the pricing page are usually cheaper than building from scratch.',
  },
  {
    q: 'Do you provide maintenance and support after delivery?',
    a: 'Yes. We can keep supporting what we build with fixes, updates and new features. Support terms are agreed in the proposal, so you know what is covered and what is billed separately.',
  },
  {
    q: 'Can you work with our existing systems and team?',
    a: 'Often, yes. We connect new software to existing tools through their APIs, such as payment gateways, messaging services and accounting systems. We can also work alongside your own developers. We will tell you honestly after a first look whether integration is practical.',
  },
  {
    q: 'Are you a software house in Multan, and do you work with clients across Pakistan?',
    a: 'Yes. Nexora Solution is a small software studio based in Multan, Punjab. Because the work is done online, we build for clients in Lahore, Karachi, Islamabad and abroad as well. For a local business, we are happy to meet in person in Multan.',
  },
  {
    q: 'What is your development process?',
    a: 'Seven steps: discovery, planning, UI/UX design, development, testing, deployment and support. You see working software during development, not only at the end, so you can correct course early.',
  },
  {
    q: 'Do you build mobile apps for both iOS and Android?',
    a: 'Mobile work is covered on the mobile app development page, including what we can build and for which platforms. Tell us which phones your users have, and we will recommend an approach before you spend anything.',
  },
  {
    q: 'Is my data secure with your software?',
    a: 'We use role-based access, keep each customer’s and each branch’s data separated, and build on Firebase and Cloudflare, which are managed platforms with their own security practices. No software is perfectly safe, so we also keep dependencies updated and review access rules before launch.',
  },
  {
    q: 'What makes Nexora different from other software companies?',
    a: 'We run our own software products, so we know what daily use of a POS, CRM or ERP is like and where these systems usually break. That experience shapes the custom work we do for others.',
  },
  {
    q: 'How do I get started with a software project?',
    a: 'Send us a message on WhatsApp at +92 319 432 9754 or write to hello@nexorasolution.us. Describe what you are trying to do. We will reply with questions or a suggestion, and there is no commitment at that stage.',
  },
]

const more = [
  { t: 'Mobile App Development', d: 'Phone apps connected to your backend.', to: '/mobile-app-development' },
  { t: 'SEO Services', d: 'Technical and content SEO for your site.', to: '/seo-services' },
  { t: 'AI Solutions', d: 'Assistants and automation in business software.', to: '/ai' },
  { t: 'All Products', d: 'Ready-made systems for restaurants, shops, schools and more.', to: '/industries' },
]

export default function SoftwareDevelopmentPage() {
  const seo = getSeoForPath('/software-development')

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Custom Software Development Services',
    provider: { '@type': 'Organization', name: 'Nexora Solution', url: 'https://nexorasolution.us' },
    serviceType: 'Software Development',
    description:
      'Custom business websites, e-commerce, CRM, ERP, POS, mobile apps, AI solutions, API integration, and cloud services.',
    areaServed: { '@type': 'Country', name: 'Pakistan' },
  }

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge="Software Development" badgeIcon={HiOutlineCodeBracket}>
      <PageSeo
        {...seo}
        softwareApplication={{
          name: 'Nexora Custom Software Development',
          description: seo.description,
          applicationCategory: 'DeveloperApplication',
        }}
        faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))}
        structuredData={[structuredData]}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Software Development</span>
      </nav>

      {/* Hero: blueprint sheet */}
      <section className="relative overflow-hidden bg-[#0b2447] pb-16 pt-24 text-white sm:pt-28 lg:pb-24">
        <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(#7dd3fc_1px,transparent_1px),linear-gradient(90deg,#7dd3fc_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div>
            <h1 className="text-[2.5rem] font-bold leading-[1.06] tracking-[-0.025em] sm:text-[3.5rem]">
              Custom Software Development Services
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-sky-100/90 sm:text-lg">
              We design and build websites, mobile apps, CRM systems, ERP solutions, POS software and
              AI-powered features for businesses that have outgrown spreadsheets, registers and
              WhatsApp threads.
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-sky-100/75">
              Nexora is a small software studio in Multan, Pakistan. We also run our own SaaS products,
              so when we build for you we already know where business software tends to go wrong.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contact-cta" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-sky-300 px-6 text-sm font-semibold text-[#0b2447] transition-colors hover:bg-sky-200">
                Start Your Project
                <HiOutlineArrowRight className="h-4 w-4" />
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-sky-200/50 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                <FaWhatsapp className="text-base" />
                Book Free Consultation
              </a>
            </div>
          </div>

          <aside aria-label="Example project brief" className="rounded-sm border border-sky-200/40 bg-[#0b2447]/80 p-6 font-mono text-[13px] leading-6 text-sky-100 shadow-[8px_8px_0_0_rgba(125,211,252,0.18)]">
            <p className="text-sky-300">Project brief (example)</p>
            <dl className="mt-3 divide-y divide-dashed divide-sky-200/30">
              <div className="flex justify-between gap-4 py-2"><dt className="text-sky-300/80">Problem</dt><dd className="text-right">Orders kept in notebooks</dd></div>
              <div className="flex justify-between gap-4 py-2"><dt className="text-sky-300/80">Build</dt><dd className="text-right">Web app + admin panel</dd></div>
              <div className="flex justify-between gap-4 py-2"><dt className="text-sky-300/80">Stack</dt><dd className="text-right">React, Firebase</dd></div>
              <div className="flex justify-between gap-4 py-2"><dt className="text-sky-300/80">First delivery</dt><dd className="text-right">Order entry screen</dd></div>
              <div className="flex justify-between gap-4 py-2"><dt className="text-sky-300/80">Then</dt><dd className="text-right">Reports, roles, exports</dd></div>
            </dl>
            <p className="mt-3 font-sans text-xs text-sky-200/70">A made-up brief, shown to illustrate how we scope work. Not a real client.</p>
          </aside>
        </div>
      </section>

      {/* Directory */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">Complete software development</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
            From business websites to full ERP systems. Each service below has its own page with the
            detail, so this is the short index. Pick the one closest to what you need.
          </p>
          <ul className="mt-10 grid gap-x-10 border-t border-slate-300 md:grid-cols-2">
            {directory.map((d) => (
              <li key={d.name} className="border-b border-slate-200">
                <Link to={d.to} className="group flex items-baseline justify-between gap-4 py-4">
                  <span>
                    <h3 className="text-[16px] font-bold text-slate-900 group-hover:text-sky-800">{d.name}</h3>
                    <span className="mt-0.5 block text-[14px] leading-6 text-slate-600">{d.line}</span>
                  </span>
                  <HiOutlineArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-sky-800" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* In-depth: services with no page of their own */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">Explore each service</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
            Three services do not have a page of their own, so they are explained properly here. For the
            rest, follow the links above.
          </p>
          <div className="mt-10 space-y-6">
            {inDepth.map((s) => (
              <article key={s.id} id={s.id} className="grid scroll-mt-28 gap-6 rounded-sm border border-slate-300 bg-white p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="text-xs font-semibold text-sky-800">{s.tag}</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">{s.title}</h3>
                  <div className="mt-4 space-y-3 text-[15px] leading-7 text-slate-700">
                    {s.paras.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </div>
                <div className="border-slate-200 lg:border-l lg:pl-6">
                  <p className="text-sm font-bold text-slate-900">What is usually included</p>
                  <ul className="mt-3 space-y-1.5 text-[14px] leading-6 text-slate-600">
                    {s.includes.map((i) => (
                      <li key={i} className="flex gap-2"><span className="text-sky-700">–</span>{i}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[13px] leading-6 text-slate-500"><span className="font-semibold text-slate-700">Built with: </span>{s.stack}</p>
                  <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-800 hover:underline">
                    <FaWhatsapp /> Discuss on WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Reliability */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">Built for reliability</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
            We would rather describe how we work than make big promises. These are the habits that matter on a real project.
          </p>
          <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {principles.map((p) => (
              <div key={p.t} className="border-l-4 border-sky-700 pl-5">
                <dt className="text-[16px] font-bold text-slate-900"><h3>{p.t}</h3></dt>
                <dd className="mt-1.5 text-[15px] leading-7 text-slate-600">{p.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Process */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">How we turn ideas into software</h2>
          <ol className="mt-10 border-l-2 border-slate-300">
            {steps.map((s, i) => (
              <li key={s.t} className="relative pb-8 pl-8 last:pb-0">
                <span className="absolute -left-[13px] top-0.5 grid h-6 w-6 place-items-center rounded-full bg-sky-800 text-[11px] font-bold text-white">{i + 1}</span>
                <h3 className="text-[17px] font-bold text-slate-900">{s.t}</h3>
                <p className="mt-1 max-w-2xl text-[15px] leading-7 text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tools */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">Modern tools for modern software</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
            This is the stack our own products run on. We pick tools for the job, and will say so if
            something else suits your project better.
          </p>
          <dl className="mt-8 grid gap-px overflow-hidden rounded-sm border border-slate-300 bg-slate-300 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <div key={t.n} className="bg-white p-5">
                <dt className="font-mono text-[15px] font-bold text-sky-900">{t.n}</dt>
                <dd className="mt-1 text-[14px] leading-6 text-slate-600">{t.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Built */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">Software we have built</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
            These are our own products. Each has a page with the real screens, features and questions.
          </p>
          <div className="mt-8 grid gap-px overflow-hidden rounded-sm border border-slate-300 bg-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {built.map((b) => (
              <Link key={b.to} to={b.to} className="group bg-white p-5 transition-colors hover:bg-sky-50">
                <h3 className="text-[16px] font-bold text-slate-900">{b.name}</h3>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">{b.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-800">Open <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
          <div className="mt-6 rounded-sm border border-slate-300 bg-white p-5 sm:p-6">
            <h3 className="text-[16px] font-bold text-slate-900">Alqudabea Security</h3>
            <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-600">
              A client project: the public website for a security company in Bahrain, with its services,
              industries and careers pages. You can visit it at{' '}
              <a href="https://alqudabeasecurity.online" target="_blank" rel="noreferrer" className="font-semibold text-sky-800 hover:underline">alqudabeasecurity.online</a>.
            </p>
            <p className="mt-3 text-[14px] text-slate-500">
              More about our own products and what they do is on the <Link to="/projects" className="font-semibold text-sky-800 hover:underline">projects page</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-slate-300 border-y border-slate-300">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-900 marker:hidden">
                  <span className="mr-2 text-sky-800 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-sky-800 group-open:inline">−</span>
                  <h3 className="inline">{f.q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* More + CTA */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-3xl">More from Nexora</h2>
          <div className="mt-6 grid gap-px overflow-hidden rounded-sm border border-slate-300 bg-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {more.map((m) => (
              <Link key={m.to} to={m.to} className="bg-white p-5 transition-colors hover:bg-sky-50">
                <h3 className="text-[15px] font-bold text-slate-900">{m.t}</h3>
                <p className="mt-1.5 text-[14px] leading-6 text-slate-600">{m.d}</p>
              </Link>
            ))}
          </div>

          <div id="contact-cta" className="mt-14 scroll-mt-28 rounded-sm bg-[#0b2447] p-8 text-white sm:p-10">
            <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Ready to Build Your Next Software Project?</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-sky-100/85">
              Tell us what you are trying to fix or build. We will reply with questions or a suggestion,
              and there is no commitment at that stage.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-sky-300 px-6 text-sm font-semibold text-[#0b2447] hover:bg-sky-200">
                <FaWhatsapp className="text-base" /> WhatsApp +92 319 432 9754
              </a>
              <Link to="/contact" className="inline-flex min-h-[44px] items-center rounded-md border border-sky-200/50 px-6 text-sm font-semibold hover:bg-white/10">
                Contact form
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
