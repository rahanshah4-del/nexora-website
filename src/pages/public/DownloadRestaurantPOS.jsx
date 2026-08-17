import { motion } from 'framer-motion'
import { HiOutlineArrowDownTray, HiOutlineChartBarSquare, HiOutlineCheck, HiOutlineCloud, HiOutlineComputerDesktop, HiOutlineCreditCard, HiOutlineDevicePhoneMobile, HiOutlineDocumentChartBar, HiOutlineLifebuoy, HiOutlinePrinter, HiOutlineServer, HiOutlineShieldCheck, HiOutlineShoppingCart, HiOutlineStar, HiOutlineTableCells, HiOutlineUserGroup, HiOutlineWifi } from 'react-icons/hi2'
import { Link } from 'react-router-dom'

// ───────────────────────────────────────────────────────────────────────
// Windows installer — Cloudflare R2 direct download link.
// ───────────────────────────────────────────────────────────────────────
const DOWNLOAD_URL = 'https://pub-d510223cafd94f76bf1559c431263a16.r2.dev/Nexora%20Solution%20POS-1.0.0-Setup.exe'

const APP_VERSION = 'v1.0.0'
const FILE_SIZE = '~104 MB'
const LAST_UPDATED = 'August 2026'

const SYSTEM_REQUIREMENTS = [
  { icon: HiOutlineComputerDesktop, label: 'Operating System', value: 'Windows 10 or later (64-bit)' },
  { icon: HiOutlineServer, label: 'RAM', value: '4 GB minimum, 8 GB recommended' },
  { icon: HiOutlineChartBarSquare, label: 'Disk Space', value: '500 MB free' },
  { icon: HiOutlineDevicePhoneMobile, label: 'Display', value: '1280 × 720 or higher' },
  { icon: HiOutlineWifi, label: 'Internet', value: 'Required for cloud sync' },
]

const KEY_FEATURES = [
  { icon: HiOutlineShoppingCart, title: 'Order Management', detail: 'Create dine-in, takeaway, delivery, and quick-bill orders with full cart editing, discounts, service charges, and tax support.' },
  { icon: HiOutlineTableCells, title: 'Table & Floor Layout', detail: 'Visual table map with occupancy tracking. Assign orders to tables, release on payment, see floor status at a glance.' },
  { icon: HiOutlinePrinter, title: 'KOT & Bill Printing', detail: 'Kitchen Order Tickets print automatically on order save. Thermal bill printing with itemised receipts, today reports, and invoice format.' },
  { icon: HiOutlineCreditCard, title: 'Customer Wallet & Dues', detail: 'Per-customer prepaid credit balances, outstanding due tracking, and full transaction ledger with WTX receipt numbers.' },
  { icon: HiOutlineChartBarSquare, title: 'Expense Management', detail: 'Log daily expenses with categories, payment methods, and notes. Submit for approval — owner reviews from the web dashboard.' },
  { icon: HiOutlineCloud, title: 'Cloud Sync', detail: 'Orders, customers, menu, expenses, and wallet transactions sync bidirectionally with the Nexora web platform in real time.' },
  { icon: HiOutlineDocumentChartBar, title: 'Reporting', detail: 'Today report with sales breakdown by order type, category, and payment method. Cash control summary with expenses.' },
  { icon: HiOutlineUserGroup, title: 'Staff Roles', detail: 'Owner, admin, and cashier roles with permission-gated access. Cashiers take orders; only owners manage settings and approve expenses.' },
]

const INSTALL_STEPS = [
  { step: 1, title: 'Download the installer', detail: 'Click the download button above and save NexoraPOS-Setup.exe to your computer.' },
  { step: 2, title: 'Run the installer', detail: 'Double-click NexoraPOS-Setup.exe. If Windows SmartScreen appears, click "More info" then "Run anyway".' },
  { step: 3, title: 'Follow the setup wizard', detail: 'Accept the license agreement, choose an install location (or keep the default), and click Install.' },
  { step: 4, title: 'Launch and sign in', detail: 'Open Nexora Restaurant POS from your desktop. Enter your workspace code (found on your web dashboard) and your staff PIN to start.' },
]

const CHANGELOG = [
  { version: 'v1.0.0', date: 'August 2026', changes: [
    'Initial release — complete restaurant POS with order management, KOT printing, table layout, menu management, customer wallet, expense tracking, and real-time cloud sync.',
  ]},
]

const accentGradient = 'from-violet-600 via-pink-600 to-rose-500'

const sectionReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  viewport: { once: true, margin: '-40px' },
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <span className="inline-block rounded-full border border-violet-200/60 bg-violet-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-violet-600">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base leading-7 text-slate-500">{subtitle}</p> : null}
    </div>
  )
}

export default function DownloadRestaurantPOS() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ── */}
      <header className="relative isolate overflow-hidden">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.15),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_80%_80%,rgba(236,72,153,0.08),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_20%_80%,rgba(99,102,241,0.08),transparent)]" />
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-20 sm:pb-28 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            {/* App icon — macOS/Windows style rounded square */}
            <div className="mx-auto mb-8">
              <div className="inline-grid h-[88px] w-[88px] place-items-center rounded-[22%] bg-gradient-to-br from-rose-400 via-pink-500 to-red-600 p-[2px] shadow-[0_8px_32px_-6px_rgba(244,63,94,0.35),0_2px_8px_-2px_rgba(244,63,94,0.2)] ring-1 ring-inset ring-white/20">
                <div className="grid h-full w-full place-items-center rounded-[20%] bg-gradient-to-br from-rose-400 via-pink-500 to-red-600">
                  <HiOutlineComputerDesktop className="h-[42px] w-[42px] text-white drop-shadow-sm" />
                </div>
              </div>
            </div>

            <h1 className="text-[2.75rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-slate-950 sm:text-6xl">
              Nexora<br className="sm:hidden" /> Restaurant POS
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-500">
              The complete offline-capable POS for restaurants — order management,
              kitchen display, billing, customer wallet, expense tracking, and more.
            </p>

            {/* Info pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {[
                { label: APP_VERSION, icon: HiOutlineStar, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
                { label: FILE_SIZE, icon: HiOutlineChartBarSquare, tone: 'bg-slate-50 text-slate-600 border-slate-200' },
                { label: 'Windows 10+', icon: HiOutlineComputerDesktop, tone: 'bg-sky-50 text-sky-700 border-sky-200' },
                { label: LAST_UPDATED, icon: HiOutlineCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              ].map((pill) => (
                <span key={pill.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${pill.tone}`}>
                  <pill.icon className="h-3.5 w-3.5" /> {pill.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Download CTA */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 text-center"
          >
            <a
              href={DOWNLOAD_URL}
              className="group relative inline-flex items-center gap-4 rounded-2xl bg-slate-900 px-10 py-5 text-xl font-bold text-white shadow-[0_8px_40px_-10px_rgba(15,23,42,0.35),0_2px_8px_-2px_rgba(15,23,42,0.15)] ring-1 ring-inset ring-white/10 transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.45),0_4px_12px_-2px_rgba(15,23,42,0.2)] active:scale-[0.98]"
            >
              {/* Windows logo */}
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 12V6.5l8-1.1v6.6H3zm0 .73h8v6.87l-8-1.15v-5.72zM11.73 5.27l9.27-1.3v7.3h-9.27V5.27zm0 13.46v-7.03h9.27v8.57l-9.27-1.54z"/>
              </svg>
              Download for Windows
            </a>
            <p className="mt-4 text-sm font-medium text-slate-400">
              Free download · No credit card required
            </p>
          </motion.div>
        </div>
      </header>

      {/* ── Key Features ── */}
      <section className="relative bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div {...sectionReveal}>
            <SectionHeading
              eyebrow="Features"
              title="Everything your counter needs"
              subtitle="Purpose-built tools available offline — syncs to the cloud when you're connected."
            />
          </motion.div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KEY_FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.1)]"
              >
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200/50 group-hover:from-violet-50 group-hover:to-pink-50 group-hover:text-violet-600 group-hover:ring-violet-200/50 transition-colors duration-300">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold leading-snug text-slate-950">{feat.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{feat.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── System Requirements ── */}
      <section className="relative bg-gradient-to-b from-slate-50/50 to-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div {...sectionReveal}>
            <SectionHeading
              eyebrow="Requirements"
              title="System requirements"
              subtitle="Your computer needs to meet these minimum specifications."
            />
          </motion.div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SYSTEM_REQUIREMENTS.map((req, i) => (
              <motion.div
                key={req.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                viewport={{ once: true }}
                className="group flex gap-4 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_20px_-6px_rgba(15,23,42,0.08)]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200/50 group-hover:bg-sky-50 group-hover:text-sky-600 group-hover:ring-sky-200/50 transition-colors duration-300">
                  <req.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{req.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{req.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Installation Steps ── */}
      <section className="relative bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-6">
          <motion.div {...sectionReveal}>
            <SectionHeading
              eyebrow="Setup"
              title="Installation"
              subtitle="Get up and running in a few minutes."
            />
          </motion.div>
          <div className="mt-14">
            {INSTALL_STEPS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                viewport={{ once: true }}
                className="relative flex gap-5 pb-10 last:pb-0"
              >
                {/* Timeline line */}
                {i < INSTALL_STEPS.length - 1 ? (
                  <div className="absolute left-[18px] top-12 bottom-0 w-px bg-gradient-to-b from-violet-200 to-transparent" aria-hidden="true" />
                ) : null}
                {/* Number circle */}
                <div className="relative z-[1] grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-pink-600 text-sm font-extrabold text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.35)] ring-4 ring-white">
                  {item.step}
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-base font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-500">{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Changelog ── */}
      <section className="relative bg-gradient-to-b from-slate-50/50 to-white py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div {...sectionReveal}>
            <SectionHeading
              eyebrow="Release Notes"
              title="What&rsquo;s New"
              subtitle="Release notes for recent versions."
            />
          </motion.div>
          <div className="mt-14 space-y-6">
            {CHANGELOG.map((entry, i) => (
              <motion.div
                key={entry.version}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                  <span className="rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                    {entry.version}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">{entry.date}</span>
                </div>
                <ul className="space-y-3 px-6 py-5">
                  {entry.changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-600">
                      <span className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                        <HiOutlineCheck className="h-3 w-3 stroke-[3px]" />
                      </span>
                      {change}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="relative bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: HiOutlineShieldCheck, label: 'Secure Download', detail: 'Digitally signed Windows installer — verified and safe to run.', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
              { icon: HiOutlineCloud, label: 'Free Updates', detail: 'Get the latest features, fixes, and sync improvements automatically.', color: 'from-sky-500 to-blue-500', bg: 'bg-sky-50', text: 'text-sky-600' },
              { icon: HiOutlineLifebuoy, label: 'Need Help?', detail: 'Our support team is ready to help with installation, setup, or troubleshooting.', color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-600' },
            ].map((badge) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                viewport={{ once: true }}
                className="group rounded-2xl border border-slate-200/60 bg-white p-6 text-center shadow-[0_2px_12px_-4px_rgba(15,23,42,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_32px_-10px_rgba(15,23,42,0.1)]"
              >
                <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${badge.bg} ${badge.text} shadow-sm ring-1 ring-inset ring-black/5 group-hover:scale-105 transition-transform duration-300`}>
                  <badge.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{badge.label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{badge.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center">
          <p className="text-sm leading-relaxed text-slate-500">
            Having trouble installing?{' '}
            <Link to="/support-center" className="font-semibold text-sky-600 underline decoration-sky-200 underline-offset-2 transition hover:text-sky-800 hover:decoration-sky-400">
              Visit our Support Center
            </Link>
            {' '}or{' '}
            <a href="mailto:support@nexorasolution.com" className="font-semibold text-sky-600 underline decoration-sky-200 underline-offset-2 transition hover:text-sky-800 hover:decoration-sky-400">
              contact support
            </a>
            .
          </p>
          <p className="mt-3 text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Nexora Solution. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
