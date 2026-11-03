import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineCloud } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

// The path a request takes through the Nexora platform today.
const path = [
  { n: 'Browser or app', d: 'A customer or staff member opens the site.' },
  { n: 'Cloudflare edge', d: 'Serves the pre-built pages from a nearby location.' },
  { n: 'Workers', d: 'Small server programs for payments, WhatsApp and background jobs.' },
  { n: 'Firebase', d: 'Sign-in, the database and file storage.' },
]

const services = [
  { t: 'Cloud Migration', d: 'Moving a site or app from shared hosting, a single server or a local PC to managed cloud services. We plan it first, copy the data, test on a private address, and only then switch the domain.' },
  { t: 'Serverless Architecture', d: 'Instead of renting a whole server that sits idle, small functions run only when something happens. Our own payment, WhatsApp and background-job services run on Cloudflare Workers and Firebase Functions this way.' },
  { t: 'CI/CD Pipelines', d: 'Pushing a change to the main branch builds and publishes the site automatically, so releases are repeatable and nobody uploads files by hand.' },
  { t: 'Security Hardening', d: 'Access rules on the database and file storage, secrets kept out of the code, role-based access, signature checks on incoming webhooks and a review of who can see what before launch.' },
  { t: 'CDN & Edge', d: 'Static pages and files are served from Cloudflare’s network, which keeps pages fast for visitors in different countries and absorbs traffic spikes.' },
  { t: 'Managed Infrastructure', d: 'We can look after hosting, domains, SSL and deployments for the systems we build, so you do not have to learn the dashboards.' },
  { t: 'Database Management', d: 'Structuring data so it stays fast as it grows, setting security rules, planning indexes and exporting data when you want a copy of your own records.' },
  { t: 'Performance Optimization', d: 'Smaller pages, lazy-loaded sections, cached files and fewer blocking scripts, measured on a mid-range phone rather than a developer laptop.' },
]

const choose = [
  { t: 'Cloudflare plus Firebase', d: 'Our default for web apps and business software: low cost at small scale, simple deployment, and managed sign-in and database. This is what Nexora itself runs on.' },
  { t: 'AWS or another large cloud', d: 'Worth it when a project has needs such as heavy computing, a particular compliance requirement or an existing AWS setup. Tell us, and we will check honestly whether we are the right team.' },
  { t: 'Staying where you are', d: 'If your current hosting works and is affordable, the best advice can be to leave it alone and fix the one slow or insecure thing.' },
]

const faqs = [
  { q: 'Should I use Cloudflare or AWS?', a: 'For most small and medium business apps, Cloudflare with Firebase is simpler and cheaper to run, and it is what we use ourselves. AWS makes sense for needs such as heavy computing, particular compliance rules or an existing AWS setup. We will recommend based on your project and say so if another team would suit you better.' },
  { q: 'How much does cloud hosting cost?', a: 'It depends on traffic and how much data you store. Cloudflare and Firebase both have free tiers that cover small sites and early-stage apps, and charges grow with usage. Check their current pricing pages, since plans change. Our fee for set-up and management is separate and quoted from the work involved.' },
  { q: 'How long does cloud migration take?', a: 'A simple static site can move in days. An app with a database, user accounts and integrations takes longer, mostly because of testing and moving data safely. We write a migration plan first so you know the order of steps and what could go wrong.' },
  { q: 'Will my site go down during migration?', a: 'We aim for none. The new setup is built and tested alongside the old one, and the domain is switched only when the new one works. Some changes, such as moving a database, can need a short quiet period, and we agree it with you beforehand.' },
  { q: 'Do you provide ongoing management?', a: 'Yes, for systems we have built or reviewed. That covers deployments, domains and SSL, updates, checking that things are running and fixing problems. What is covered, and how quickly we respond, is agreed in writing so there are no surprises.' },
]

export default function CloudSolutionsPage() {
  const seo = getSeoForPath('/cloud-solutions')

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="Cloud Solutions" badgeIcon={HiOutlineCloud}>
      <PageSeo {...seo} faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/software-development">Software Development</Link>
        <span> / </span>
        <span aria-current="page">Cloud Solutions</span>
      </nav>

      <section className="bg-slate-950 pb-16 pt-24 text-white sm:pt-28 lg:pb-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h1 className="max-w-3xl text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3.6rem]">Cloud Solutions</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Hosting, deployment, security and databases for business software, on the same managed
            services that run Nexora. No server to babysit, and a bill you can predict.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-lime-300 px-6 text-sm font-bold text-slate-950 hover:bg-lime-200">Plan Your Migration <HiOutlineArrowRight className="h-4 w-4" /></a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-500 px-6 text-sm font-semibold hover:bg-white/10"><FaWhatsapp className="text-base" /> WhatsApp Us</a>
          </div>

          <div aria-label="How a request travels through the platform" className="mt-14">
            <ol className="grid gap-3 md:grid-cols-4">
              {path.map((p, i) => (
                <li key={p.n} className="relative rounded-md border border-lime-300/40 bg-slate-900 p-5">
                  <p className="font-mono text-xs text-lime-300">{i + 1}</p>
                  <p className="mt-1 text-[16px] font-bold">{p.n}</p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-400">{p.d}</p>
                  {i < path.length - 1 && <HiOutlineArrowRight className="absolute -right-[14px] top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-lime-300 md:block" />}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-500">A simplified view of how Nexora is put together. Your project may use fewer or different parts.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">Cloud Services</h2>
          <div className="mt-8 grid gap-x-12 md:grid-cols-2">
            {services.map((s) => (
              <article key={s.t} className="border-t border-slate-300 py-5">
                <h3 className="text-[17px] font-bold text-slate-900">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">{s.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-lime-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">Which platform should you pick?</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">There is no single right answer. This is how we think about it.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {choose.map((c) => (
              <div key={c.t} className="border-l-4 border-lime-600 pl-5">
                <h3 className="text-[16px] font-bold text-slate-900">{c.t}</h3>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">{c.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-[15px] leading-7 text-slate-600">
            If your software talks to payment or messaging providers, read about our <Link to="/api-integration" className="font-semibold text-lime-800 hover:underline">API integration</Link> work. For building the software itself, see <Link to="/software-development" className="font-semibold text-lime-800 hover:underline">software development</Link>.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">Cloud FAQs</h2>
          <div className="mt-8 divide-y divide-slate-300 border-y border-slate-300">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-900 marker:hidden">
                  <span className="mr-2 text-lime-700 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-lime-700 group-open:inline">−</span>
                  <h3 className="inline">{f.q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-md bg-slate-950 p-8 text-white sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">Ready to Move to the Cloud?</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-300">Tell us where your site or app lives today and what is going wrong. We will say what to move, what to leave, and what it should cost to run.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-lime-300 px-6 text-sm font-bold text-slate-950 hover:bg-lime-200">Get Free Consultation <HiOutlineArrowRight className="h-4 w-4" /></a>
            <Link to="/software-development" className="inline-flex min-h-[44px] items-center rounded-md border border-slate-500 px-6 text-sm font-semibold hover:bg-white/10">All development services</Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
