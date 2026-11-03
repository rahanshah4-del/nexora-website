import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineWifi } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

// Every entry here is an integration that exists in the Nexora codebase today.
const shipped = [
  {
    method: 'POST',
    path: 'WhatsApp Business (Meta Cloud API)',
    title: 'WhatsApp messages and webhooks',
    body: 'Powers the shared inbox in Nexora WhatsApp CRM. Meta first calls our endpoint to verify it with a token, then posts every incoming message and delivery update. We check the X-Hub-Signature-256 header on each request, reject anything that does not match, and answer quickly with a 200 so Meta does not keep retrying while we process the message.',
  },
  {
    method: 'POST',
    path: 'Subscription payments',
    title: 'Checkout and payment confirmation',
    body: 'Nexora subscriptions are billed through hosted checkout pages from payment providers, and our backend waits for the provider’s notification before it activates a plan. For the crypto checkout, the provider’s callback is verified with an HMAC signature before any subscription is changed. A browser redirect alone never unlocks anything.',
  },
  {
    method: 'POST',
    path: 'Transactional email',
    title: 'Email sending through SendGrid',
    body: 'Invoices, invitations and notices are sent from a backend function, never from the browser, so the API key stays private. The sender is chosen by configuration, which means the provider can be switched without touching the screens that ask for an email to be sent.',
  },
  {
    method: 'POST',
    path: 'Push notifications',
    title: 'Web push with Firebase Cloud Messaging',
    body: 'Clients can opt in to notifications. A backend job decides who should get which message, and the sending itself goes through Firebase Cloud Messaging.',
  },
  {
    method: 'GET',
    path: 'Sign-in',
    title: 'Authentication with Firebase',
    body: 'Sign-in tokens issued by Firebase are verified by our backend workers before they touch any data, so a request is tied to a real signed-in user and a real workspace.',
  },
]

const patterns = [
  {
    t: 'Verify before you trust',
    d: 'Anything that arrives from outside, whether it is a webhook or a callback, has to prove who sent it. We check signatures or tokens before reading the contents.',
  },
  {
    t: 'Answer fast, work later',
    d: 'Providers retry if you are slow. We acknowledge the request first and do the heavy work after, so a slow database call does not cause duplicate deliveries.',
  },
  {
    t: 'Expect duplicates',
    d: 'The same event can arrive twice. Handlers are written so that processing a payment or a message a second time changes nothing.',
  },
  {
    t: 'Keep secrets on the server',
    d: 'API keys live in the backend’s secret store. The browser or the phone app only ever talks to our own endpoint.',
  },
  {
    t: 'Log what happened',
    d: 'When an integration fails at 2 am, you want to know which event failed and why. We log each webhook and outcome so problems can be traced afterwards.',
  },
  {
    t: 'Read the provider’s documentation first',
    d: 'Before promising anything, we read the API docs. If a service has no usable API, we say so and look for a safe alternative, such as a file export, instead of guessing.',
  },
]

const kinds = [
  { t: 'Payments', d: 'Hosted checkout, status callbacks and matching payments to the right order or subscription.' },
  { t: 'Messaging', d: 'WhatsApp, email and push, including templates and incoming replies.' },
  { t: 'Your own software', d: 'Connect a Nexora module to the accounting tool, spreadsheet or older system you already use, through its API or a scheduled file exchange.' },
  { t: 'Custom endpoints', d: 'A small API of your own so a website, an app and a back-office tool all read from the same data.' },
]

const faqs = [
  {
    q: 'What is API integration and why do I need it?',
    a: 'API integration lets two pieces of software exchange data on their own, such as your shop system telling your courier service about a new order. Without it, someone retypes the same information in two places, and mistakes creep in. It is worth doing when the same data is being copied by hand every day.',
  },
  {
    q: 'How long does API integration take?',
    a: 'A single, well-documented integration such as one payment provider can take days to a couple of weeks. Several services, or an old system with no proper API, take longer. We can usually give a sensible estimate after reading the provider’s documentation.',
  },
  {
    q: 'What payment gateways do you work with?',
    a: 'We have built subscription checkout with hosted payment providers and a crypto checkout with signed callbacks for Nexora itself. For your project, we start from the gateway you want to use: if it has a documented API, we read it and tell you what is realistic before you commit.',
  },
  {
    q: 'Can you integrate WhatsApp Business API?',
    a: 'Yes. Nexora WhatsApp CRM uses the Meta WhatsApp Cloud API for sending messages and receiving webhooks, with signature checks on incoming requests. WhatsApp has its own rules about templates and when you can message a customer, and we build around those rules.',
  },
  {
    q: 'How much does WhatsApp API integration cost?',
    a: 'There are usually two costs: Meta’s charges for conversations sent through the WhatsApp Business Platform, and the one-off work to build and connect the integration. Meta’s rates change and depend on the type of message and the country, so check Meta’s current pricing page. Our work is quoted from your scope, such as sending messages, receiving replies and linking to a CRM.',
  },
  {
    q: 'How do you handle errors and failures?',
    a: 'Incoming events are acknowledged fast, processed so that repeats are harmless, and logged. Failures are visible in the logs, so we can see which event went wrong. How much automatic retrying and alerting a project needs is part of the scope, and we agree on it up front.',
  },
  {
    q: 'Do you provide API documentation?',
    a: 'For any API we build for you, yes: the endpoints, the data each one expects and returns, and how to authenticate. For third-party integrations, we write up how the pieces connect so that another developer can maintain it.',
  },
]

export default function APIIntegrationPage() {
  const seo = getSeoForPath('/api-integration')

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="API Integration" badgeIcon={HiOutlineWifi}>
      <PageSeo {...seo} faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/software-development">Software Development</Link>
        <span> / </span>
        <span aria-current="page">API Integration</span>
      </nav>

      {/* Hero: webhook request/response */}
      <section className="bg-emerald-50 pb-14 pt-24 sm:pt-28 lg:pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div>
            <h1 className="text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-slate-900 sm:text-[3.6rem]">API Integration</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              Connect your software to the services around it: payments, WhatsApp, email, your accounting
              tools and older systems. So data moves on its own and nobody types the same thing twice.
            </p>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600">
              We build integrations for our own products every week. This page shows which ones are
              live today, and how we make them dependable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-emerald-800 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                Discuss Your Integration <HiOutlineArrowRight className="h-4 w-4" />
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-400 px-6 text-sm font-semibold text-slate-800 hover:bg-white">
                <FaWhatsapp className="text-base text-emerald-600" /> WhatsApp Us
              </a>
            </div>
          </div>

          <div aria-label="Example webhook exchange" className="overflow-hidden rounded-md border border-slate-800 bg-slate-950 font-mono text-[12.5px] leading-6 text-slate-300 shadow-[8px_8px_0_0_rgba(6,78,59,0.25)]">
            <div className="border-b border-slate-800 px-4 py-2 text-slate-500">incoming webhook (example)</div>
            <pre className="overflow-x-auto px-4 py-4"><code>{`POST /webhooks/messages
X-Hub-Signature-256: sha256=3f9a…c41e
Content-Type: application/json

{ "event": "message.received",
  "id": "evt_1042" }

→ signature checked      ok
→ seen this id before?   no
→ queued for processing  ok

200 OK`}</code></pre>
            <div className="border-t border-slate-800 px-4 py-2 font-sans text-[11px] text-slate-500">Simplified example for illustration. Values are made up.</div>
          </div>
        </div>
      </section>

      {/* What exists today */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">Integration Services</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
            Here is what is already running inside Nexora, described as it actually works. It is the
            same approach we would use on yours.
          </p>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {shipped.map((s) => (
              <article key={s.title} className="grid gap-3 py-7 md:grid-cols-[13rem_1fr] md:gap-8">
                <div>
                  <span className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] font-bold ${s.method === 'GET' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>{s.method}</span>
                  <p className="mt-2 text-[13px] leading-5 text-slate-500">{s.path}</p>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-slate-600">{s.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Patterns */}
      <section className="bg-slate-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">What makes an integration dependable</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
            Connecting two systems for the first time is easy. Keeping them connected when something
            goes wrong is the real work.
          </p>
          <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {patterns.map((p) => (
              <div key={p.t} className="border-l-4 border-emerald-700 pl-5">
                <dt className="text-[16px] font-bold text-slate-900"><h3>{p.t}</h3></dt>
                <dd className="mt-1.5 text-[15px] leading-7 text-slate-600">{p.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Kinds */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">Four kinds of integration we take on</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-slate-300 bg-slate-300 sm:grid-cols-2">
            {kinds.map((k) => (
              <div key={k.t} className="bg-white p-6">
                <h3 className="text-[16px] font-bold text-slate-900">{k.t}</h3>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">{k.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-[15px] leading-7 text-slate-600">
            If the service you need is not in this list, send us a link to its API documentation. We
            will read it and tell you plainly whether the integration is practical, how long it should
            take, and what it depends on. See also our <Link to="/cloud-solutions" className="font-semibold text-emerald-800 hover:underline">cloud solutions</Link> and <Link to="/erp-development" className="font-semibold text-emerald-800 hover:underline">ERP development</Link> pages.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-100 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">API FAQs</h2>
          <div className="mt-8 divide-y divide-slate-300 border-y border-slate-300">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-900 marker:hidden">
                  <span className="mr-2 text-emerald-700 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-emerald-700 group-open:inline">−</span>
                  <h3 className="inline">{f.q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-md bg-emerald-900 p-8 text-white sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">Need to Connect Your Systems?</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-emerald-100">
            Tell us which two systems should talk to each other and what should happen when they do.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-white px-6 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
              Get Free Consultation <HiOutlineArrowRight className="h-4 w-4" />
            </a>
            <Link to="/software-development" className="inline-flex min-h-[44px] items-center rounded-md border border-emerald-300/50 px-6 text-sm font-semibold hover:bg-white/10">
              All development services
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
