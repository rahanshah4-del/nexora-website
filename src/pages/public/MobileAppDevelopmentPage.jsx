import Link from '../../components/AppLink.jsx'
import { useState, useMemo } from 'react'
import {
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineDevicePhoneMobile,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineBolt,
  HiOutlineCube,
  HiOutlineCloud,
  HiOutlineCpuChip,
  HiOutlineWifi,
  HiOutlinePaintBrush,
  HiOutlineCommandLine,
  HiOutlineRocketLaunch,
  HiOutlineChevronDown,
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const features = [
  { icon: HiOutlineDevicePhoneMobile, title: 'Cross-Platform', desc: 'One codebase for iOS and Android using Flutter — save 40% on development costs while delivering native performance and beautiful UI on both platforms.' },
  { icon: HiOutlineBolt, title: 'Native Performance', desc: '60fps animations, smooth scrolling, instant startup. Native Swift/Kotlin for performance-critical features. Flutter for rapid cross-platform delivery.' },
  { icon: HiOutlineShieldCheck, title: 'Secure by Design', desc: 'Biometric authentication (Face ID, fingerprint), encrypted local storage, secure API communication, OAuth 2.0, PCI-compliant payment flows.' },
  { icon: HiOutlineCloud, title: 'Offline-First', desc: 'Apps work without internet. Local database syncs automatically when reconnected. Perfect for field workers, delivery fleets, and areas with unreliable connectivity.' },
  { icon: HiOutlineCpuChip, title: 'AI Integration', desc: 'Built-in AI features — chatbots, image recognition, voice commands, predictive text, and personalized recommendations powered by DeepSeek and Gemini.' },
  { icon: HiOutlineWifi, title: 'Push Notifications', desc: 'Firebase Cloud Messaging for Android, APNs for iOS. Segmented push campaigns, in-app notifications, and automated triggers based on user behavior.' },
  { icon: HiOutlinePaintBrush, title: 'Beautiful UI/UX', desc: 'Material Design 3 for Android, Cupertino for iOS. Custom animations, dark mode, haptic feedback, and pixel-perfect designs that users love.' },
  { icon: HiOutlineCube, title: 'Backend Integration', desc: 'Seamless connection to Firebase, Node.js, REST APIs, GraphQL, WebSocket for real-time features. Scalable serverless backend included.' },
]

const processSteps = [
  { step: '01', title: 'Discovery', desc: 'Understand your users, business goals, and feature requirements. Competitive analysis and platform strategy.' },
  { step: '02', title: 'UI/UX Design', desc: 'Wireframes → prototypes → pixel-perfect designs. You approve every screen before development.' },
  { step: '03', title: 'Development', desc: 'Agile sprints with working builds every 2 weeks. Flutter for cross-platform, native for platform-specific features.' },
  { step: '04', title: 'Testing', desc: 'Unit tests, widget tests, integration tests. Real device testing on 20+ devices. Beta testing via TestFlight & Play Store.' },
  { step: '05', title: 'Launch', desc: 'App Store submission, Play Store listing, ASO optimization, launch strategy, and monitoring setup.' },
  { step: '06', title: 'Support', desc: 'Post-launch monitoring, crash analytics, user feedback loops, feature updates, and ongoing maintenance.' },
]

const techIcons = [
  { name: 'Flutter', icon: '💙', desc: 'Cross-platform UI toolkit' },
  { name: 'Swift', icon: '🍎', desc: 'Native iOS development' },
  { name: 'Kotlin', icon: '🤖', desc: 'Native Android development' },
  { name: 'React Native', icon: '⚛️', desc: 'JavaScript cross-platform' },
  { name: 'Firebase', icon: '🔥', desc: 'Backend & real-time sync' },
  { name: 'Node.js', icon: '💚', desc: 'API & server logic' },
  { name: 'Cloudflare', icon: '☁️', desc: 'Edge deployment & CDN' },
  { name: 'DeepSeek AI', icon: '🧠', desc: 'AI/ML integration' },
]

const faqs = [
  { q: 'Flutter or native — which is better for my app?', a: 'Flutter is ideal for 90% of business apps — it delivers beautiful 60fps UI on both iOS and Android from a single codebase, saving 40% on development costs. Native (Swift/Kotlin) is better for apps that need deep hardware integration (AR, advanced camera, Bluetooth LE) or maximum possible performance. We help you choose the right approach based on your specific requirements.' },
  { q: 'How much does a mobile app cost to develop?', a: 'A business app typically ranges from PKR 200,000 for a simple app (5-8 screens) to PKR 1,500,000+ for a complex app with AI, real-time features, payment integration, and custom backend. Every project is unique — we provide a detailed estimate after understanding your requirements. Contact us for a free consultation and quote.' },
  { q: 'How long does it take to build a mobile app?', a: 'Simple apps (landing, catalog, booking): 4-6 weeks. Medium apps (e-commerce, CRM, delivery): 8-16 weeks. Complex apps (AI, real-time, multi-vendor): 16-24 weeks. We deliver working builds every 2 weeks through agile sprints, so you can test and provide feedback throughout development.' },
  { q: 'Do you publish the app to App Store and Play Store?', a: 'Yes — we handle the entire submission process including App Store Connect setup, Play Store Console configuration, ASO (App Store Optimization), screenshot creation, privacy policy, and compliance. We also manage updates and version releases post-launch.' },
  { q: 'Can you integrate payment gateways in the app?', a: 'Absolutely. We integrate Stripe, PayPal, JazzCash, Easypaisa, and bank payment gateways. All payment flows are PCI-compliant with secure tokenization. We also support in-app purchases and subscription billing.' },
  { q: 'Will my app work offline?', a: 'Yes — we build all apps with offline-first architecture. User data is stored locally and syncs automatically when the internet reconnects. This is critical for field workers, delivery apps, and areas with patchy connectivity.' },
  { q: 'Do you provide source code and ownership?', a: 'You own 100% of the source code, designs, and intellectual property. Upon project completion, we transfer everything to your GitHub/GitLab repository with complete documentation. No vendor lock-in — you can take the code to any developer.' },
  { q: 'What about app maintenance and updates?', a: 'We offer ongoing maintenance plans covering OS updates (iOS/Android version compatibility), bug fixes, security patches, performance optimization, feature enhancements, and App Store/Play Store compliance. Most clients choose our monthly maintenance plan for continuous support.' },
]

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.08)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-slate-900 sm:text-[15px]">{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[13px] leading-[1.7] text-slate-500">{faq.a}</p></div>
      </div>
    </article>
  )
}

export default function MobileAppDevelopmentPage() {
  const seo = getSeoForPath('/mobile-app-development')
  const [openFaqIndex, setOpenFaqIndex] = useState(0)
  const pageFaqs = useMemo(() => faqs, [])

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="Mobile Apps" badgeIcon={HiOutlineDevicePhoneMobile}>
      <PageSeo {...seo} faqItems={pageFaqs.map(f => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span>
        <Link to="/software-development">Software Development</Link><span> / </span>
        <span aria-current="page">Mobile App Development</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fff1f2_64%,#f1f5f9_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h1 className="mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
            Mobile App{' '}
            <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent">Development</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
            Beautiful, high-performance mobile apps for iOS and Android. Native and cross-platform
            development with Flutter, Swift, and Kotlin. AI-powered features, offline support,
            and seamless backend integration.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: HiOutlineDevicePhoneMobile, label: 'iOS + Android', sub: 'Cross-platform & native' },
              { icon: HiOutlineBolt, label: '60fps Performance', sub: 'Smooth animations' },
              { icon: HiOutlineCpuChip, label: 'AI-Powered', sub: 'DeepSeek & Gemini' },
              { icon: HiOutlineCloud, label: 'Offline-First', sub: 'Works without internet' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white/60 p-3 backdrop-blur-sm">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div>
                  <p className="text-[12px] font-semibold tracking-[-0.01em] text-slate-800">{item.label}</p>
                  <p className="text-[11px] text-slate-400">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]">
              Start Your App Project <HiOutlineArrowRight className="text-lg" />
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
              <FaWhatsapp className="text-base text-emerald-500" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">Why <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent">Nexora</span> for Mobile Apps</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(f => (
              <article key={f.title} className="group flex flex-col rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_-16px_rgba(15,23,42,0.16)]">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100/80 text-rose-700 ring-1 ring-rose-200/60 transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-[14px] font-semibold tracking-[-0.01em] text-slate-900">{f.title}</h3>
                <p className="mt-2 flex-1 text-[12px] leading-[1.6] text-slate-500">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section data-reveal className="bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">Technology <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent">Stack</span></h2>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {techIcons.map(t => (
              <div key={t.name} className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white p-3 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5">
                <span className="text-2xl" role="img" aria-hidden="true">{t.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{t.name}</p>
                  <p className="text-[10px] text-slate-400">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">Development <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent">Process</span></h2>
          </div>
          <div className="mt-10 pl-1">
            {processSteps.map((s, i) => (
              <div key={s.step} className="relative flex gap-5">
                {i < processSteps.length - 1 ? <div className="absolute left-[22px] top-12 bottom-0 w-px bg-gradient-to-b from-rose-300 to-transparent" aria-hidden="true" /> : null}
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white shadow-[0_4px_16px_-6px_rgba(244,63,94,0.3)] ring-4 ring-white">{s.step}</div>
                <div className="pb-10">
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-[1.65] text-slate-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">Mobile App <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent">FAQs</span></h2>
          </div>
          <div className="mt-10 grid gap-3">
            {pageFaqs.map((faq, i) => (
              <FaqItem key={faq.q} faq={faq} isOpen={openFaqIndex === i} onToggle={() => setOpenFaqIndex(openFaqIndex === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-reveal className="px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-rose-200/60 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_58%,#ffe4e6_100%)] p-6 shadow-[0_8px_40px_-16px_rgba(244,63,94,0.1)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Ready to Build Your Mobile App?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Let's discuss your app idea. Free consultation, detailed estimate, no commitment.</p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(244,63,94,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 active:scale-[0.97]">
              Start Your Project <HiOutlineArrowRight className="text-lg" />
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
              <FaWhatsapp className="text-base text-emerald-500" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
