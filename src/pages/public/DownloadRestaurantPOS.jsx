import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaWhatsapp } from 'react-icons/fa6'
import {
  HiOutlineArrowDownTray,
  HiOutlineBanknotes,
  HiOutlineBolt,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineCircleStack,
  HiOutlineCloudArrowUp,
  HiOutlineComputerDesktop,
  HiOutlineCpuChip,
  HiOutlineFire,
  HiOutlineInformationCircle,
  HiOutlinePhone,
  HiOutlinePrinter,
  HiOutlineTableCells,
  HiOutlineUserPlus,
  HiOutlineWallet,
  HiOutlineWifi,
} from 'react-icons/hi2'
import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { STABLE_DOWNLOAD_URL, getLatestRelease } from '../../lib/desktopReleases.js'
import { formatFileSize } from '../../lib/desktopReleaseUtils.js'
import PublicPageShell from './PublicPageShell.jsx'
import AppPreview from './download/AppPreview.jsx'
import FaqAccordion from './download/FaqAccordion.jsx'
import ReleaseCard from './download/ReleaseCard.jsx'
import {
  FAQS,
  FEATURES,
  HELP,
  HERO,
  INSTALL_STEPS,
  PHONE_DISPLAY,
  PHONE_TEL,
  REQUIREMENTS,
  WHATSAPP_URL,
} from './download/downloadContent.js'

// ───────────────────────────────────────────────────────────────────────
// Windows installer — version, size, date, notes and link come from the
// latest release published in the Control Centre (nexora-releases-api → R2
// restaurant-pos/latest.json). Until that loads, or if it fails, the button
// uses the Worker's stable /download link, which redirects to the current
// installer — so the link is never broken and no release needs a code change.
//
// Night mode: the page sits in PublicPageShell like every other public page,
// so the generated public-dark palette (src/styles/public-dark.css) applies.
// Only colour classes that palette already covers are used here.
// ───────────────────────────────────────────────────────────────────────

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500'

const FEATURE_ICONS = {
  billing: HiOutlineBolt,
  kitchen: HiOutlineFire,
  tables: HiOutlineTableCells,
  wallet: HiOutlineWallet,
  expenses: HiOutlineBanknotes,
  reports: HiOutlineChartBar,
  offline: HiOutlineCloudArrowUp,
  printer: HiOutlinePrinter,
}

const FEATURE_TONES = [
  'bg-sky-50 text-sky-700',
  'bg-rose-50 text-rose-700',
  'bg-indigo-50 text-indigo-700',
  'bg-violet-50 text-violet-700',
  'bg-amber-50 text-amber-700',
  'bg-blue-50 text-blue-700',
  'bg-cyan-50 text-cyan-700',
  'bg-emerald-50 text-emerald-700',
]

const REQUIREMENT_ICONS = {
  os: HiOutlineComputerDesktop,
  memory: HiOutlineCpuChip,
  disk: HiOutlineCircleStack,
  internet: HiOutlineWifi,
  printer: HiOutlinePrinter,
}

function SectionHeading({ id, eyebrow, title, subtitle }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-base leading-7 text-slate-600">{subtitle}</p> : null}
    </div>
  )
}

function DownloadButton({ status, release, href }) {
  const size = release ? formatFileSize(release.sizeBytes) : ''
  return (
    <a
      href={href}
      className={`premium-button-primary min-h-[3.75rem] px-7 text-base sm:px-8 ${FOCUS_RING}`}
    >
      <HiOutlineArrowDownTray className="h-6 w-6 shrink-0" aria-hidden="true" />
      <span className="flex flex-col items-start leading-tight">
        <span>Download for Windows</span>
        <span className="mt-1 text-xs font-semibold opacity-70">
          {status === 'loading' ? (
            <>
              <span className="sr-only">Loading version</span>
              <span className="block h-3 w-24 animate-pulse rounded bg-current opacity-40" aria-hidden="true" />
            </>
          ) : release ? (
            `v${release.version}${size ? ` · ${size}` : ''}`
          ) : (
            'Latest version'
          )}
        </span>
      </span>
    </a>
  )
}

export default function DownloadRestaurantPOS() {
  const seo = getSeoForPath('/download/restaurant-pos')
  const [release, setRelease] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()
    getLatestRelease({ signal: controller.signal })
      .then((latest) => {
        setRelease(latest)
        setStatus(latest ? 'ready' : 'unavailable')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('unavailable')
      })
    return () => controller.abort()
  }, [])

  const downloadUrl = release?.url || STABLE_DOWNLOAD_URL

  return (
    <PublicPageShell>
      <PageSeo {...seo} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]" aria-labelledby="download-hero-title">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center lg:text-left"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-700">
              <HiOutlineComputerDesktop className="h-4 w-4" aria-hidden="true" />
              {HERO.eyebrow}
            </p>
            <h1 id="download-hero-title" className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] text-slate-950 sm:text-5xl lg:text-6xl">
              {HERO.title}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600 lg:mx-0">{HERO.subtitle}</p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <DownloadButton status={status} release={release} href={downloadUrl} />
              <Link to="/signup" className={`premium-button-secondary min-h-[3.75rem] px-7 text-base ${FOCUS_RING}`}>
                <HiOutlineUserPlus className="h-5 w-5" aria-hidden="true" />
                Create free account
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 lg:justify-start" aria-label="Download facts">
              {HERO.trust.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <HiOutlineCheckCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <AppPreview />
          </motion.div>
        </div>
      </section>

      {/* ── Latest release ── */}
      <section className="bg-white px-4 pb-16 sm:px-6 lg:px-8" aria-label="Latest release">
        <div className="mx-auto max-w-4xl">
          <ReleaseCard status={status} release={release} />
        </div>
      </section>

      {/* ── Install in 4 steps ── */}
      <section id="install" className="bg-slate-50 py-16 sm:py-24" aria-labelledby="install-title">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading id="install-title" eyebrow="Get started" title="Install in 4 steps" subtitle="From download to your first bill in a few minutes." />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INSTALL_STEPS.map((step, index) => (
              <li key={step.title} className="premium-card flex flex-col p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-bold text-white shadow-sm" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
                {step.note ? (
                  <p className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    <HiOutlineInformationCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{step.note}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-white py-16 sm:py-24" aria-labelledby="features-title">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading id="features-title" eyebrow="Features" title="Everything your counter needs" subtitle="Built for busy restaurant counters — and it keeps working when the internet doesn’t." />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => {
              const Icon = FEATURE_ICONS[feature.icon]
              return (
                <li key={feature.title} className="premium-card p-6">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${FEATURE_TONES[index % FEATURE_TONES.length]}`} aria-hidden="true">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.detail}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ── System requirements + FAQ ── */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-12 lg:px-8">
          <section id="requirements" aria-labelledby="requirements-title">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Before you install</p>
            <h2 id="requirements-title" className="mt-3 text-3xl font-bold tracking-tight text-slate-950">System requirements</h2>
            <dl className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {REQUIREMENTS.map((item, index) => {
                const Icon = REQUIREMENT_ICONS[item.icon]
                return (
                  <div key={item.label} className={`flex items-start gap-4 px-5 py-4 ${index ? 'border-t border-slate-100' : ''}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700" aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{item.value}</dd>
                    </div>
                  </div>
                )
              })}
            </dl>
          </section>

          <section id="faq" aria-labelledby="faq-title">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">FAQ</p>
            <h2 id="faq-title" className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Frequently asked questions</h2>
            <div className="mt-6">
              <FaqAccordion items={FAQS} />
            </div>
          </section>
        </div>
      </section>

      {/* ── Help CTA ── */}
      <section className="bg-slate-50 px-4 pb-20 sm:px-6 lg:px-8" aria-labelledby="help-title">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 text-center shadow-[0_24px_70px_-24px_rgba(15,23,42,0.5)] sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_15%_0%,rgba(14,165,233,0.28),transparent),radial-gradient(ellipse_60%_80%_at_85%_100%,rgba(139,92,246,0.3),transparent)]" aria-hidden="true" />
          <div className="relative">
            <h2 id="help-title" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{HELP.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300">{HELP.detail}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 ${FOCUS_RING}`}
              >
                <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
                WhatsApp us
              </a>
              <a href={PHONE_TEL} className={`premium-button-secondary ${FOCUS_RING}`}>
                <HiOutlinePhone className="h-5 w-5" aria-hidden="true" />
                Call {PHONE_DISPLAY}
              </a>
              <Link to="/signup" className={`premium-button-secondary ${FOCUS_RING}`}>
                <HiOutlineUserPlus className="h-5 w-5" aria-hidden="true" />
                Create free account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
