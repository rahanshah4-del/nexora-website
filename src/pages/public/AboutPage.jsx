import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import {
  HiOutlineMapPin,
  HiOutlineLightBulb,
  HiOutlineLifebuoy,
  HiOutlineCodeBracket,
  HiOutlineWrenchScrewdriver,
  HiOutlineBriefcase,
  HiOutlineArrowRight,
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PublicPageShell from './PublicPageShell.jsx'
import { aboutHeadline, aboutIntro, aboutSections, companyCards, team, trustSignals } from '../../lib/aboutContent.js'
import { SITE_ADDRESS_TEXT } from '../../lib/seoStructuredData.js'

const cardIcons = [
  ['from-sky-500 to-blue-600', HiOutlineMapPin],
  ['from-violet-500 to-fuchsia-600', HiOutlineLightBulb],
  ['from-emerald-500 to-teal-600', HiOutlineLifebuoy],
]

const teamIcons = [
  ['from-indigo-500 to-blue-700', HiOutlineCodeBracket],
  ['from-amber-500 to-orange-600', HiOutlineWrenchScrewdriver],
  ['from-rose-500 to-pink-600', HiOutlineBriefcase],
]

const eyebrow = 'text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400'
const h2 = 'text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900 sm:text-[40px]'
const card = 'rounded-[28px] border border-slate-200/70 bg-white shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18)]'

function IconTile({ tint, Icon }) {
  return (
    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tint} text-white shadow-lg shadow-slate-900/10`}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
  )
}

export default function AboutPage() {
  const seo = getSeoForPath('/about')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]" />

        <header className="relative mx-auto max-w-4xl px-5 pb-14 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
          <p className={eyebrow}>About Nexora</p>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-slate-900 sm:text-[54px]">
            {aboutHeadline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-slate-500 sm:text-lg">
            {aboutIntro}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/923194329754"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-slate-900 px-7 text-[15px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]"
            >
              <FaWhatsapp className="h-4 w-4" aria-hidden="true" /> WhatsApp Nexora
            </a>
            <Link
              to="/pricing"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-slate-300/80 bg-white/70 px-7 text-[15px] font-medium text-slate-800 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]"
            >
              See pricing <HiOutlineArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* ── Company cards ── */}
        <section className="relative mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
          <div className="grid gap-5 lg:grid-cols-3">
            {companyCards.map(({ title, text }, i) => {
              const [tint, Icon] = cardIcons[i % cardIcons.length]
              return (
                <article key={title} className={`${card} p-8`}>
                  <IconTile tint={tint} Icon={Icon} />
                  <h2 className="mt-6 text-[21px] font-semibold leading-snug tracking-[-0.02em] text-slate-900">{title}</h2>
                  <p className="mt-3 text-[15px] leading-[1.7] text-slate-500">{text}</p>
                </article>
              )
            })}
          </div>
        </section>

        {/* ── Why Nexora: dark panel with the four facts ── */}
        <section className="relative mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
          <div className="overflow-hidden rounded-[36px] bg-[#0b1220] p-8 text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)] sm:p-12 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:p-16">
            <div className="relative">
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
              <p className="relative text-[13px] font-semibold uppercase tracking-[0.18em] text-white/50">Why choose Nexora</p>
              <h2 className="relative mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px]">
                Built around real business operations.
              </h2>
              <p className="relative mt-5 text-[16px] leading-8 text-white/65">
                Nexora focuses on practical workflows: billing, inventory, leads, customers, staff permissions, service requests and reporting. Our goal is to help owners run one shared workspace instead of disconnected files and manual updates.
              </p>
            </div>
            <dl className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:mt-0">
              {trustSignals.map(({ value, label }) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
                  <dt className="text-[26px] font-semibold tracking-[-0.03em] text-white">{value}</dt>
                  <dd className="mt-2 text-[14px] leading-6 text-white/60">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Story, products, platform ── */}
        <section className="relative mx-auto max-w-5xl px-5 pb-20 sm:px-6 sm:pb-28">
          <div className="divide-y divide-slate-200/70 border-y border-slate-200/70">
            {aboutSections.map(({ heading, paragraphs }, i) => (
              <div key={heading} className="grid gap-5 py-10 sm:py-14 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
                <div>
                  <p className="text-[13px] font-semibold tabular-nums tracking-[0.18em] text-slate-300">{String(i + 1).padStart(2, '0')}</p>
                  <h2 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[30px]">{heading}</h2>
                </div>
                <div>
                  {paragraphs.map((text) => (
                    <p key={text.slice(0, 40)} className="text-[16px] leading-[1.85] text-slate-500 [&:not(:first-child)]:mt-4">{text}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Team ── */}
        <section className="relative mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Team &amp; experience</p>
            <h2 className={`mt-4 ${h2}`}>People behind the platform.</h2>
            <p className="mt-5 text-[17px] leading-8 text-slate-500">
              Nexora combines product engineering, implementation support and business operations experience to help teams launch software with clarity.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {team.map(({ title, text }, i) => {
              const [tint, Icon] = teamIcons[i % teamIcons.length]
              return (
                <article key={title} className={`${card} p-7`}>
                  <IconTile tint={tint} Icon={Icon} />
                  <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.02em] text-slate-900">{title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.7] text-slate-500">{text}</p>
                </article>
              )
            })}
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="relative mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
          <div className={`${card} grid items-center gap-6 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-8 sm:p-12 lg:grid-cols-[1fr_auto]`}>
            <div>
              <h2 className={h2}>Contact Nexora Solution</h2>
              <p className="mt-4 max-w-2xl text-[16px] leading-7 text-slate-500">
                Website: https://nexorasolution.us · WhatsApp: 03194329754 · Head office: {SITE_ADDRESS_TEXT}.
              </p>
            </div>
            <a
              href="https://wa.me/923194329754"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[52px] w-max items-center gap-2 rounded-full bg-slate-900 px-8 text-[15px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]"
            >
              <FaWhatsapp className="h-4 w-4" aria-hidden="true" /> WhatsApp Nexora
            </a>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
