import Link from '../../components/AppLink.jsx'
import { HiOutlineSparkles, HiOutlineChatBubbleLeftRight, HiOutlineEnvelope, HiOutlineMapPin, HiOutlinePhone, HiOutlineShieldCheck } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import CopyEmailButton from '../../components/CopyEmailButton.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'
import ContactLeadForm from '../../components/ContactLeadForm.jsx'
import OfficeMap from '../../components/OfficeMap.jsx'
import { SITE_ADDRESS_TEXT, SITE_EMAILS } from '../../lib/seoStructuredData.js'

const contactMethods = [
  { label: 'WhatsApp / Phone', value: '03194329754', href: 'https://wa.me/923194329754', icon: HiOutlinePhone },
  { label: 'Sales email', value: SITE_EMAILS.sales, href: `mailto:${SITE_EMAILS.sales}`, icon: HiOutlineEnvelope },
  { label: 'Support email', value: SITE_EMAILS.support, href: `mailto:${SITE_EMAILS.support}`, icon: HiOutlineEnvelope },
  { label: 'Website', value: 'https://nexorasolution.us', href: '/', icon: HiOutlineShieldCheck },
]

const ctaBase =
  'inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-[15px] font-medium tracking-[-0.01em] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] sm:w-auto'
const ctaPrimary = `${ctaBase} bg-slate-900 text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)]`
const ctaSecondary = `${ctaBase} border border-slate-200/70 bg-white/80 text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl hover:border-slate-300/80 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)]`

const steps = [
  { title: 'We read your message.', text: 'Tell us your business type (restaurant, retail shop, pharmacy, school, rental fleet or sales team), how many users and branches you have, and what you do on paper or in spreadsheets today.' },
  { title: 'We reply within one business day', text: 'on WhatsApp or email with the product that fits, a short walkthrough and answers to your pricing questions.' },
  { title: 'You start a free 1-month trial.', text: 'Set up your items, students, vehicles or customers, test the workflow with your own team, then choose a plan only if it works for you.' },
]

const supportTopics = [
  'POS software demo',
  'School ERP consultation',
  'CRM and WhatsApp CRM setup',
  'Transport software workflow',
  'Business services request',
  'Pricing and onboarding',
]


const messageChecklist = [
  { title: 'Your business type', text: 'Restaurant, retail shop, pharmacy, school or academy, rental fleet, property team, sales team or something else. This decides which product we show you first.' },
  { title: 'Size of the team', text: 'How many people will log in, and whether they need different access, such as cashiers, accountants and managers.' },
  { title: 'Branches or locations', text: 'One shop or several. Multi-branch businesses have a few extra questions to settle at the start.' },
  { title: 'What you use today', text: 'Paper registers, spreadsheets, another software or WhatsApp. It helps us plan how to bring your records across.' },
  { title: 'Your biggest daily headache', text: 'Slow billing, wrong stock, late fees, missed follow-ups or month-end reports that take days. We start with the problem that costs you most.' },
  { title: 'When you want to start', text: 'This week, next month or before a season. It shapes the plan for setup and training.' },
]

const reasons = [
  { title: 'See a demo', text: 'We walk you through the product that fits your business using examples close to your own, so you see your day on the screen and not a generic tour.' },
  { title: 'Ask about pricing', text: 'Plans, team sizes, yearly billing and currency. Every product starts with a free 1-month trial, and setup, data migration and staff training are free on every plan.' },
  { title: 'Get help with setup', text: 'Menus, products, tables, classes, vehicles, staff and roles. Tell us what you have and we will help you load it.' },
  { title: 'Request support', text: 'Existing customers can write to the support address with the module, what they were doing and a screenshot.' },
  { title: 'Discuss custom work', text: 'Custom software, ERP, CRM, mobile apps, online stores and integrations when a ready-made module does not cover your need.' },
  { title: 'Ask about partnership or media', text: 'Write to the sales address and tell us who you are and what you have in mind.' },
]

const contactFaqs = [
  { q: 'How quickly will you reply?', a: 'We usually reply within one business day on WhatsApp or email. Because the team is based in Pakistan, replies follow Pakistan working days.' },
  { q: 'Is the demo free?', a: 'Yes. Ask for a demo on WhatsApp or through the form and the team will walk you through the module that fits your business.' },
  { q: 'Do I need to pay to try Nexora?', a: 'No. Every product starts with a free 1-month trial, so you can test it with your own data first.' },
  { q: 'Which email should I use?', a: 'Use the sales email for pricing, demos and partnerships, and the support email for help with a product you already use.' },
  { q: 'Do you work with customers outside Pakistan?', a: 'Yes. We support customers worldwide online. Our head office is in Multan, Punjab, Pakistan, and we do not have local offices in other countries.' },
  { q: 'Can you help me move my existing records?', a: 'Yes. Setup, data migration and staff training are free on every plan.' },
  { q: 'I need something Nexora does not do. What now?', a: 'Tell us. We will say honestly whether a module already covers it, whether a setting solves it or whether it is a custom project.' },
  { q: 'What should I never send in a message?', a: 'Passwords or payment card details. Nexora never asks for them over chat or email.' },
]


const demoSteps = [
  { title: 'We ask about your day', text: 'The call or chat starts with how your business runs, not with a feature list. We want to know where time is lost.' },
  { title: 'We show the matching product', text: 'You see the screens your team would use: billing, stock, fees, bookings or follow-ups, depending on your business.' },
  { title: 'We follow one real example', text: 'We take a sale, an admission, a booking or a lead from start to finish, then open the report it creates.' },
  { title: 'We answer your hard questions', text: 'Ask about printing, taxes, staff access, many branches or slow internet. We say plainly what works today and what does not.' },
  { title: 'We suggest the next step', text: 'Usually a free 1-month trial with your own data, and a plan for setup and training if you want help.' },
]

const worries = [
  { title: '"My staff are not technical."', text: 'Most Nexora users are cashiers, teachers and shop owners. Setup and staff training are free, and each role sees only the screens it needs, which keeps things simple.' },
  { title: '"I already have my data in spreadsheets."', text: 'That is a good starting point. Bring over the most important records first, check them, then add the rest.' },
  { title: '"What if the internet goes down?"', text: 'The restaurant billing screen keeps working when the connection drops and syncs afterwards. Tell us about your connection during the demo so we can talk through your situation.' },
  { title: '"I do not want to be locked in."', text: 'Every product starts with a free 1-month trial, so you can test it before you choose a plan.' },
  { title: '"Will it fit my business?"', text: 'If a ready-made module fits, we will say so. If it does not, we will tell you honestly and discuss whether a custom project makes sense.' },
  { title: '"Who do I call when something breaks?"', text: 'The same team that builds the software answers on WhatsApp and email. Include the module and a screenshot and we can usually solve it in one reply.' },
]

export default function ContactPage() {
  const seo = getSeoForPath('/contact')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Contact</span>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white pb-14 pt-20 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              Contact Nexora
            </span>
            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.03em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
              Talk to Nexora about your{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                business software.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
              Contact Nexora Solution for POS, ERP, CRM, WhatsApp CRM, transport software, business services, onboarding and pricing questions in Pakistan.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <a href="https://wa.me/923194329754" target="_blank" rel="noreferrer" className={ctaPrimary}>
                WhatsApp Nexora
                <HiOutlineChatBubbleLeftRight className="h-[18px] w-[18px]" />
              </a>
              <Link to="/pricing" className={ctaSecondary}>
                View Pricing
              </Link>
            </div>
          </div>

          {/* Contact method cards */}
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contactMethods.map(({ label, value, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noreferrer' : undefined}
                className="group rounded-[1.35rem] border border-slate-200/60 bg-white/80 p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.14)]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-[14px] font-medium tracking-[-0.01em] text-slate-900">{label}</span>
                <span className="mt-1 inline-flex max-w-full flex-wrap items-center break-all text-[13px] leading-6 text-slate-500">
                  <span>{value}</span>
                  {href.startsWith('mailto:') ? <CopyEmailButton email={value} /> : null}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact form + office ── */}
      <section id="contact-form" className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:px-8">
          <div>
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">Send us a message</h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Tell us about your business and what you need. We reply on WhatsApp or email, usually within one business day.
            </p>
            <div className="mt-8 flex items-start gap-3 rounded-[1.35rem] border border-slate-200/60 bg-slate-50/70 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-200 text-slate-600">
                <HiOutlineMapPin className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[14px] font-medium tracking-[-0.01em] text-slate-900">Head office</span>
                <span className="mt-1 block text-[13px] leading-6 text-slate-500">{SITE_ADDRESS_TEXT}</span>
              </span>
            </div>
            <OfficeMap className="mt-4" />
          </div>
          <div className="rounded-[1.8rem] border border-slate-200/60 bg-white p-5 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.1)] sm:p-8">
            <ContactLeadForm />
          </div>
        </div>
      </section>

      {/* ── What happens next ── */}
      <section className="bg-white pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">What happens after you contact us</h2>
          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {steps.map(({ title, text }, i) => (
              <li key={title} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-7 text-[14px] leading-[1.7] text-slate-500 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-medium text-white">{i + 1}</span>
                <strong className="mt-5 block text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</strong>
                <span className="mt-2 block">{text}</span>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-8 max-w-3xl text-center text-[15px] leading-7 text-slate-500">
            Already a customer? Write to <a className="text-slate-900 underline" href={`mailto:${SITE_EMAILS.support}`}>{SITE_EMAILS.support}</a> for product support. For plans and costs, see <Link className="text-slate-900 underline" to="/pricing">pricing</Link> or browse the <Link className="text-slate-900 underline" to="/help-center">help center</Link>.
          </p>
        </div>
      </section>

      {/* ── How we can help ── */}
      <section className="bg-white py-16 sm:py-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
              How we can help
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Send a message with your business type, current workflow and software need. Nexora team can guide you toward the right product or service page.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {supportTopics.map((topic) => (
              <span key={topic} className="rounded-full border border-slate-200/70 bg-white px-5 py-2.5 text-[14px] font-medium tracking-[-0.01em] text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>


      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">What to expect in a demo</h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              A demo with Nexora is a working conversation of about half an hour, shaped around your business. You do not need to prepare anything beyond a few notes about how you work today.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2">
            {demoSteps.map(({ title, text }, i) => (
              <li key={title} className="flex gap-4 rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-medium text-white">{i + 1}</span>
                <div>
                  <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                  <p className="mt-2 text-[14px] leading-7 text-slate-500">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-slate-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">Common worries before switching software</h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Changing how a business keeps its records is a big decision, and it is normal to hesitate. These are the concerns we hear most, with honest answers.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {worries.map(({ title, text }) => (
              <article key={title} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-7 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {/* ── Long-form guidance ── */}
      <section className="bg-slate-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">What to include in your message</h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              You do not need technical words. A few plain sentences about your business let us give a useful answer in the first reply instead of asking a list of questions.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {messageChecklist.map(({ title, text }) => (
              <article key={title} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-7 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">Why people contact us</h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Most messages fall into one of these groups. Pick the one that sounds closest and mention it in your first line.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {reasons.map(({ title, text }) => (
              <article key={title} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-7 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50/60 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">Which channel is best for you?</h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              WhatsApp is the fastest way to ask a quick question, book a demo or send a screenshot, and it works well from the shop counter. Email suits longer questions, attachments and anything you want a written record of. The contact form is best when you are new and would like the team to recommend a product after reading about your business.
            </p>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Whichever you choose, you will talk to the team that builds and supports the software, not a call-centre script. If your question is about a product you already use, the <Link className="text-slate-900 underline" to="/help-center/support-and-contact">support guide</Link> explains what to include so we can solve it in one reply.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">About Nexora Solution</h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is in Multan, Punjab, Pakistan, and we support customers worldwide online. We build ready-made products for restaurants, retail shops, pharmacies, schools, fleets, property teams and sales teams, and we also take on custom software, mobile apps, online stores and integrations.
            </p>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Explore the <Link className="text-slate-900 underline" to="/industries">industries we serve</Link>, read the <Link className="text-slate-900 underline" to="/help-center">Help Center</Link> or see <Link className="text-slate-900 underline" to="/projects">how a rollout works</Link> before you write.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-10 divide-y divide-slate-200/70 rounded-[1.35rem] border border-slate-200/60 bg-white">
            {contactFaqs.map(({ q, a }) => (
              <div key={q} className="p-6">
                <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{q}</h3>
                <p className="mt-2 text-[14px] leading-7 text-slate-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
