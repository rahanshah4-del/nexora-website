import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineDevicePhoneMobile } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const approaches = [
  {
    name: 'Mobile-friendly web app (installable)',
    fits: 'Staff tools, dashboards, booking and order screens, anything people open daily on a phone.',
    pros: 'One codebase, no store review, updates reach everyone at once, and it can be added to the home screen. This is how the Nexora platform itself works on phones.',
    cons: 'Limited access to some phone hardware, and it does not appear in the app stores.',
  },
  {
    name: 'Native Android app',
    fits: 'Apps that need the camera, background work, device sensors or a presence on Google Play.',
    pros: 'Full access to the phone and the smoothest feel on Android. We write these in Kotlin.',
    cons: 'Android only, plus a store listing to maintain.',
  },
  {
    name: 'iOS app',
    fits: 'When your customers are mostly on iPhones and a web app is not enough.',
    pros: 'Presence on the App Store and iPhone-specific features.',
    cons: 'Needs an Apple developer account and App Store review. Tell us early if this is the goal, so we can scope it honestly.',
  },
]

const reasons = [
  {
    t: 'We start by asking if you need an app at all',
    d: 'A lot of “we need an app” requests are really “our staff need something on their phones”. A good mobile web app solves that for far less work than two store apps, and we will say so.',
  },
  {
    t: 'We build the backend too',
    d: 'Phone apps are only as good as what they talk to. We run our own cloud software on Firebase and Cloudflare, so sign-in, data and notifications are things we do every week, not extras.',
  },
  {
    t: 'We have shipped an Android app',
    d: 'Nexora Fleet is an Android app we built for managing rental vehicles. It is a smaller project than most, but it went through the whole path from design to a working install.',
  },
  {
    t: 'Plain talk about store rules',
    d: 'Google Play and the App Store both ask for a privacy policy, a way to delete an account and honest descriptions. We plan for these from the start instead of discovering them at submission.',
  },
]

const backend = [
  { t: 'Sign-in', d: 'Email and password, Google sign-in, or a one-time code, using Firebase Authentication.' },
  { t: 'Data and sync', d: 'Records live in a cloud database. Rules decide which user can read or write which record.' },
  { t: 'Push notifications', d: 'Firebase Cloud Messaging sends alerts such as a new order, an assigned job or a reminder.' },
  { t: 'Files and photos', d: 'Uploads go to cloud storage with size limits and access rules, so a receipt photo does not become a public link.' },
  { t: 'Payments', d: 'The app opens a payment page from your provider. The card or wallet details never pass through our code.' },
  { t: 'Admin side', d: 'Most apps need a small web panel so your own staff can see and fix what the app is creating.' },
]

const steps = [
  { t: 'Discovery', d: 'Who will use the app, on which phones, and what they need to do in under a minute.' },
  { t: 'UI/UX Design', d: 'Simple screen sketches first, then a clickable version for you to try before we write code.' },
  { t: 'Development', d: 'We build one workflow at a time and give you something to install and test after each one.' },
  { t: 'Testing', d: 'We try it on real phones, on slow connections and with bad input, and ask a few of your real users to try it too.' },
  { t: 'Launch', d: 'Store listing, privacy policy and screenshots for an app, or deployment and a home-screen install guide for a web app.' },
  { t: 'Support', d: 'Fixes, updates for new Android or iOS versions, and the next features once people are using it.' },
]

const stack = [
  { n: 'Kotlin', d: 'Native Android apps.' },
  { n: 'React', d: 'Installable mobile web apps and the admin panel.' },
  { n: 'Firebase', d: 'Sign-in, database and push notifications.' },
  { n: 'Node.js', d: 'Server logic and integrations.' },
  { n: 'Cloudflare', d: 'Hosting, workers and file storage.' },
]

const faqs = [
  {
    q: 'Flutter or native — which is better for my app?',
    a: 'We mostly build native Android in Kotlin and installable mobile web apps in React, so that is what we recommend and quote for. Cross-platform frameworks such as Flutter exist and suit some projects, but we would not claim experience we cannot show. Tell us what you want the app to do and we will recommend an approach, even if that approach is a web app instead.',
  },
  {
    q: 'How much does a mobile app cost to develop?',
    a: 'It depends on the number of screens, whether there is a backend, and which platforms you want. A simple mobile web app costs far less than a native app with its own backend. We give a written estimate after we understand the requirements, and we would rather tell you early if a cheaper option fits.',
  },
  {
    q: 'How long does it take to build a mobile app?',
    a: 'A small app with a few screens takes weeks. An app with accounts, payments and an admin panel takes a few months. We can give a better figure once the main workflows are written down, and you can test something working after each stage.',
  },
  {
    q: 'Do you publish the app to App Store and Play Store?',
    a: 'We prepare the Google Play listing for Android apps: store text, screenshots, privacy policy and the build itself. The developer account should be in your name so you own the listing. For the App Store, tell us up front so we can plan for Apple’s account and review requirements.',
  },
  {
    q: 'Can you integrate payment gateways in the app?',
    a: 'Yes, through your provider’s hosted payment page or API. The app starts the payment and your backend confirms it, so card details are handled by the provider and not stored by us. See the API integration page for how we handle payment webhooks.',
  },
  {
    q: 'Will my app work offline?',
    a: 'It depends on the app. Some screens can be cached so they open without a signal, and entries can be queued and sent later. Fully offline work with conflict handling is a bigger design job. If your users have patchy connections, say so at the start and we will plan for it.',
  },
  {
    q: 'Do you provide source code and ownership?',
    a: 'Ownership terms are agreed in writing before work begins. We recommend that the source code, the store accounts and the cloud accounts sit in your name, so you can move to another developer later if you ever want to.',
  },
  {
    q: 'What about app maintenance and updates?',
    a: 'Phones and stores change every year, and apps need updates to keep working. We can keep maintaining what we build, covering fixes, compatibility updates for new Android versions and new features. Terms are agreed per project.',
  },
]

export default function MobileAppDevelopmentPage() {
  const seo = getSeoForPath('/mobile-app-development')

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="Mobile Apps" badgeIcon={HiOutlineDevicePhoneMobile}>
      <PageSeo {...seo} faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/software-development">Software Development</Link>
        <span> / </span>
        <span aria-current="page">Mobile App Development</span>
      </nav>

      {/* Hero: phone */}
      <section className="overflow-hidden bg-rose-50 pb-14 pt-24 sm:pt-28 lg:pb-0">
        <div className="mx-auto grid max-w-6xl items-end gap-10 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="pb-4 lg:pb-20">
            <h1 className="text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-zinc-900 sm:text-[3.6rem]">Mobile App Development</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-700 sm:text-lg">
              Apps for the phones your staff and customers already carry. Before we write any code, we
              work out whether you need a store app, an Android app or a mobile web app, because the
              right answer is often the smaller one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-rose-500">
                Discuss Your App <HiOutlineArrowRight className="h-4 w-4" />
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-zinc-400 px-6 text-sm font-semibold text-zinc-800 hover:bg-white">
                <FaWhatsapp className="text-base text-emerald-600" /> WhatsApp Us
              </a>
            </div>
          </div>

          <div className="mx-auto w-[17rem] shrink-0 rounded-t-[2.5rem] border-[10px] border-b-0 border-zinc-900 bg-white pb-0 shadow-[0_30px_60px_-20px_rgba(24,24,27,0.4)]" aria-label="Example app screen">
            <div className="mx-auto mt-1 h-1.5 w-16 rounded-full bg-zinc-200" />
            <div className="px-4 pb-6 pt-4">
              <p className="text-[11px] text-zinc-500">Today’s jobs</p>
              <ul className="mt-2 space-y-2 text-[13px]">
                {[
                  ['Pickup, Gulgasht', 'Assigned'],
                  ['Delivery, Cantt', 'On the way'],
                  ['Collect cheque', 'Done'],
                ].map(([a, b]) => (
                  <li key={a} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5">
                    <span className="font-semibold text-zinc-900">{a}</span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[10px] leading-4 text-zinc-400">Made-up screen, shown for illustration.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Approaches */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Which kind of app do you actually need?</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-zinc-600">
            Three common routes, and when each makes sense. Most projects start with one of these and
            add another later if it is needed.
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-[14px] leading-6">
              <thead>
                <tr className="border-b-2 border-zinc-900 text-zinc-900">
                  <th className="py-3 pr-4 font-bold">Approach</th>
                  <th className="py-3 pr-4 font-bold">Fits when</th>
                  <th className="py-3 pr-4 font-bold">Good about it</th>
                  <th className="py-3 font-bold">Watch out for</th>
                </tr>
              </thead>
              <tbody className="align-top text-zinc-700">
                {approaches.map((a) => (
                  <tr key={a.name} className="border-b border-zinc-200">
                    <th scope="row" className="py-4 pr-4 font-bold text-rose-700">{a.name}</th>
                    <td className="py-4 pr-4">{a.fits}</td>
                    <td className="py-4 pr-4">{a.pros}</td>
                    <td className="py-4">{a.cons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why Nexora */}
      <section className="bg-zinc-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Why Nexora for Mobile Apps</h2>
          <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {reasons.map((r) => (
              <div key={r.t}>
                <h3 className="text-[17px] font-bold text-zinc-900">{r.t}</h3>
                <p className="mt-2 text-[15px] leading-7 text-zinc-600">{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Backend */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">What sits behind the app</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-zinc-600">
            The screens are the visible part. These are the pieces that usually take the time.
          </p>
          <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
            {backend.map((b) => (
              <div key={b.t} className="bg-white p-5">
                <dt className="text-[15px] font-bold text-zinc-900">{b.t}</dt>
                <dd className="mt-1.5 text-[14px] leading-6 text-zinc-600">{b.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Process */}
      <section className="bg-rose-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Development Process</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.t} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-rose-600">Stage {i + 1}</p>
                <h3 className="mt-1 text-[17px] font-bold text-zinc-900">{s.t}</h3>
                <p className="mt-2 text-[14px] leading-6 text-zinc-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Stack */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Technology Stack</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-zinc-600">What we actually use for mobile and mobile web work.</p>
          <ul className="mt-8 flex flex-wrap gap-3">
            {stack.map((s) => (
              <li key={s.n} className="rounded-full border border-zinc-300 px-4 py-2 text-[14px] text-zinc-700">
                <span className="font-bold text-zinc-900">{s.n}</span> — {s.d}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-zinc-100 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Mobile App FAQs</h2>
          <div className="mt-8 divide-y divide-zinc-300 border-y border-zinc-300">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-zinc-900 marker:hidden">
                  <span className="mr-2 text-rose-600 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-rose-600 group-open:inline">−</span>
                  <h3 className="inline">{f.q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-zinc-900 p-8 text-white sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">Ready to Build Your Mobile App?</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-zinc-300">
            Describe who will use it and what they need to do. We will reply with questions, or with an
            honest view on whether you need an app at all.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-rose-500 px-6 text-sm font-semibold text-white hover:bg-rose-400">
              Get Free Consultation <HiOutlineArrowRight className="h-4 w-4" />
            </a>
            <Link to="/software-development" className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-500 px-6 text-sm font-semibold hover:bg-white/10">
              All development services
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
