import { Link } from 'react-router-dom'
import { useState, useMemo, memo, useCallback } from 'react'
import {
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineBriefcase,
  HiOutlineCheckCircle,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineCube,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCog8Tooth,
  HiOutlineDevicePhoneMobile,
  HiOutlineGlobeAlt,
  HiOutlineShoppingCart,
  HiOutlineAcademicCap,
  HiOutlineServerStack,
  HiOutlineCloud,
  HiOutlineWrenchScrewdriver,
  HiOutlineCodeBracket,
  HiOutlineCircleStack,
  HiOutlineCommandLine,
  HiOutlineCpuChip,
  HiOutlineWifi,
  HiOutlineBolt,
  HiOutlineRocketLaunch,
  HiOutlineMagnifyingGlass,
  HiOutlinePuzzlePiece,
  HiOutlinePaintBrush,
  HiOutlineBugAnt,
  HiOutlineTruck,
  HiOutlineLifebuoy,
  HiOutlineChevronDown,
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

/* ── Data ────────────────────────────────────────────────────────────── */

const WHATSAPP_URL = 'https://wa.me/923194329754'

const services = [
  {
    icon: HiOutlineGlobeAlt,
    title: 'Business Websites',
    slug: 'business-websites',
    desc: 'Professional, fast-loading business websites built with modern frameworks. SEO-optimized, mobile-responsive, and designed to convert visitors into customers.',
    detail: 'We build modern, high-performance business websites that establish your brand online and drive real results. Every site is hand-crafted with responsive design, SEO optimization, and conversion-focused layouts. From simple landing pages to complex corporate portals, we deliver websites that load fast, look stunning, and grow your business.',
    features: ['Custom UI/UX design', 'SEO optimization built-in', 'Mobile-responsive across all devices', 'Fast page load (95+ Lighthouse score)', 'CMS integration for easy content updates', 'Contact forms, maps, and social integration', 'SSL certificates and security hardening', 'Analytics & conversion tracking'],
    tech: 'React, Next.js, Tailwind CSS, Firebase, Cloudflare',
    tone: 'blue',
  },
  {
    icon: HiOutlineShoppingCart,
    title: 'E-commerce Development',
    slug: 'ecommerce-development',
    desc: 'Full-featured online stores with secure payment gateways, inventory management, order tracking, and an admin dashboard to manage your entire business.',
    detail: 'Launch a powerful online store that sells 24/7. We build custom e-commerce platforms with secure payment processing, real-time inventory tracking, order management, and an intuitive admin dashboard. Whether you need a simple shop or a multi-vendor marketplace, we deliver a seamless shopping experience that converts browsers into buyers.',
    features: ['Secure payment gateways (Stripe, PayPal, local banks)', 'Real-time inventory & stock management', 'Order tracking & automated notifications', 'Admin dashboard with sales analytics', 'Product catalog with categories & filters', 'Shopping cart & wishlist', 'Multi-currency & tax support', 'Mobile-optimized checkout experience'],
    tech: 'React, Node.js, Firebase, Stripe, Cloudflare',
    tone: 'emerald',
  },
  {
    icon: HiOutlineUserGroup,
    title: 'Custom CRM Development',
    slug: 'crm-development',
    desc: 'Tailor-made CRM systems that match your exact sales workflow. Lead tracking, pipeline management, customer communication, and automated follow-ups.',
    detail: 'Off-the-shelf CRM not fitting your workflow? We build custom CRM software tailored to your exact sales process. From lead capture to deal closure, every stage is designed around how your team actually works. Get pipeline visibility, automated follow-ups, customer communication history, and powerful reporting — all in one clean interface.',
    features: ['Lead capture & scoring automation', 'Visual sales pipeline (Kanban view)', 'Customer communication history', 'Automated follow-up reminders', 'Task & activity management', 'Email & WhatsApp integration', 'Custom reports & sales forecasting', 'Role-based access for teams'],
    tech: 'React, Firebase, Node.js, Cloudflare Workers',
    tone: 'indigo',
  },
  {
    icon: HiOutlineServerStack,
    title: 'ERP Solutions',
    slug: 'erp-solutions',
    desc: 'Enterprise resource planning systems that unify finance, HR, inventory, procurement, and operations into one centralized, real-time platform.',
    detail: 'Run your entire business from one unified platform. Our custom ERP solutions integrate finance, HR, inventory, procurement, and operations into a single source of truth. Real-time dashboards give you complete visibility across departments. Eliminate data silos, reduce manual work, and make faster decisions with accurate, up-to-date information.',
    features: ['Financial management & accounting', 'HR & payroll module', 'Inventory & warehouse management', 'Procurement & purchase orders', 'Real-time KPI dashboards', 'Multi-branch & multi-currency support', 'Role-based access control', 'API integration with existing tools'],
    tech: 'React, Node.js, MySQL/PostgreSQL, Firebase, Cloudflare',
    tone: 'violet',
  },
  {
    icon: HiOutlineCommandLine,
    title: 'Restaurant POS',
    slug: 'restaurant-pos',
    desc: 'Complete restaurant management — KOT, table management, billing, kitchen display, inventory, and cloud sync. AI-powered insights and offline-first reliability.',
    detail: 'Nexora Restaurant POS is our flagship product — a complete restaurant management system trusted by 50+ restaurants across Pakistan. It handles everything from KOT printing and table management to billing, kitchen display, inventory tracking, and AI-powered sales analytics. Works offline so you never stop billing, even when the internet goes down.',
    features: ['KOT (Kitchen Order Ticket) management', 'Interactive table layout & reservations', 'Fast billing with split payments', 'Kitchen Display System (digital KOT)', 'Real-time inventory with stock alerts', 'AI-powered sales reports & peak hour detection', 'Offline-first — works without internet', 'Cloud sync across multiple branches'],
    tech: 'React, Firebase, Node.js, Cloudflare, Thermal Printer SDK',
    link: '/restaurant-pos',
    tone: 'amber',
  },
  {
    icon: HiOutlineAcademicCap,
    title: 'School Management System',
    slug: 'school-erp',
    desc: 'End-to-end school ERP with student records, fee management, attendance, exams, timetable, parent portal, payroll, and transport tracking.',
    detail: 'Nexora School ERP digitizes every aspect of school administration. Manage student admissions, fee collection, attendance tracking, exam scheduling, and report cards — all from one platform. Parents get a dedicated portal to track their child\'s progress. Teachers save hours on paperwork. Administrators get real-time financial and operational visibility.',
    features: ['Student records & admission management', 'Fee collection with payment receipts', 'Attendance tracking (biometric & manual)', 'Exam scheduling & report cards', 'Timetable & class management', 'Parent-teacher communication portal', 'Staff payroll & HR management', 'Transport & fleet tracking'],
    tech: 'React, Node.js, MySQL, Firebase, Cloudflare',
    link: '/school-erp',
    tone: 'teal',
  },
  {
    icon: HiOutlineDevicePhoneMobile,
    title: 'Mobile App Development',
    slug: 'mobile-apps',
    desc: 'Native and cross-platform mobile apps for iOS and Android. Beautiful UI, smooth performance, offline support, and seamless backend integration.',
    detail: 'Put your business in your customers\' pockets. We build beautiful, high-performance mobile apps for iOS and Android using Flutter for cross-platform efficiency or native Swift/Kotlin for maximum performance. Every app includes offline support, push notifications, secure authentication, and seamless integration with your backend systems.',
    features: ['iOS & Android (Flutter cross-platform)', 'Beautiful Material & Cupertino UI', 'Offline mode with data sync', 'Push notifications (FCM/APNs)', 'Secure auth (biometric, OTP, SSO)', 'Payment gateway integration', 'Camera, GPS, & sensor APIs', 'App Store & Play Store submission'],
    tech: 'Flutter, Dart, Firebase, Node.js, Swift, Kotlin',
    tone: 'rose',
  },
  {
    icon: HiOutlineCodeBracket,
    title: 'Web Applications',
    slug: 'web-applications',
    desc: 'Complex web applications — dashboards, SaaS platforms, portals, and real-time tools. Built with React, Node.js, Firebase, and cloud-native architecture.',
    detail: 'We build sophisticated web applications that handle complex business logic at scale. SaaS platforms, client portals, admin dashboards, real-time collaboration tools — whatever your business needs. Our cloud-native architecture ensures your app stays fast and reliable as you grow from hundreds to millions of users.',
    features: ['Single Page Applications (SPA)', 'Real-time data & WebSocket support', 'Admin dashboards & analytics', 'Multi-tenant SaaS architecture', 'Role-based access & permissions', 'File upload & media management', 'Search, filter & export functionality', 'Progressive Web App (PWA) support'],
    tech: 'React, Next.js, Node.js, Firebase, Cloudflare Workers',
    tone: 'blue',
  },
  {
    icon: HiOutlineCpuChip,
    title: 'AI Solutions',
    slug: 'ai-solutions',
    desc: 'Custom AI and machine learning integrations — chatbots, predictive analytics, image recognition, recommendation engines, and intelligent automation.',
    detail: 'Add intelligence to your software with custom AI and machine learning solutions. We integrate AI chatbots that understand your business, predictive analytics that forecast sales and demand, image recognition for automated data entry, and recommendation engines that boost revenue. Our AI runs on DeepSeek, Gemini, and custom models — deployed on Cloudflare\'s global edge network.',
    features: ['AI chatbots & virtual assistants', 'Predictive sales & demand analytics', 'Image & document recognition', 'Recommendation & personalization engines', 'Natural language processing (NLP)', 'Sentiment analysis & text classification', 'Automated data extraction & entry', 'Edge AI deployment (Cloudflare Workers AI)'],
    tech: 'Python, DeepSeek, Gemini, Cloudflare AI, Node.js, React',
    link: '/ai',
    tone: 'violet',
  },
  {
    icon: HiOutlineWifi,
    title: 'API Integration',
    slug: 'api-integration',
    desc: 'Connect your software with third-party services — payment gateways, SMS/WhatsApp APIs, shipping carriers, accounting tools, and legacy systems.',
    detail: 'Make your software talk to everything else. We design and build robust API integrations that connect your applications with payment gateways, SMS providers, WhatsApp Business API, shipping carriers, accounting software, and legacy systems. Clean RESTful APIs, webhooks, real-time sync, and comprehensive error handling ensure reliable data flow.',
    features: ['RESTful API design & development', 'Third-party API integration', 'Payment gateway integration (Stripe, JazzCash, etc.)', 'WhatsApp Business API integration', 'SMS & email notification services', 'Legacy system integration', 'Webhook & real-time event handling', 'API documentation & developer portal'],
    tech: 'Node.js, Cloudflare Workers, REST, GraphQL, Webhooks',
    tone: 'indigo',
  },
  {
    icon: HiOutlineCloud,
    title: 'Cloud Solutions',
    slug: 'cloud-solutions',
    desc: 'Cloud migration, DevOps setup, serverless architecture, auto-scaling infrastructure, and managed hosting on AWS, Google Cloud, and Cloudflare.',
    detail: 'Move your business to the cloud with confidence. We handle cloud migration, infrastructure setup, CI/CD pipelines, auto-scaling configuration, and ongoing management. Our serverless-first approach on Cloudflare Workers and Firebase keeps costs low while delivering global performance. We also work with AWS and Google Cloud for enterprise needs.',
    features: ['Cloud migration strategy & execution', 'Serverless architecture (Cloudflare Workers)', 'CI/CD pipeline setup (GitHub Actions)', 'Auto-scaling & load balancing', 'Database migration & optimization', 'DNS, CDN & SSL configuration', 'Backup & disaster recovery', 'Cost optimization & monitoring'],
    tech: 'Cloudflare, AWS, Google Cloud, Docker, Kubernetes, Terraform',
    tone: 'sky',
  },
  {
    icon: HiOutlineWrenchScrewdriver,
    title: 'Software Maintenance & Support',
    slug: 'software-maintenance',
    desc: 'Ongoing maintenance, bug fixes, feature enhancements, security patches, performance optimization, and 24/7 technical support for your software.',
    detail: 'Software needs ongoing care to stay secure, fast, and reliable. Our maintenance and support plans cover everything — bug fixes, security patches, feature enhancements, performance optimization, and 24/7 technical support. We monitor your systems proactively so issues are caught before they affect your business. Think of us as your dedicated technology partner.',
    features: ['24/7 technical support (WhatsApp, email, phone)', 'Bug fixes with SLA guarantees', 'Security patches & vulnerability scanning', 'Performance monitoring & optimization', 'Feature enhancements & updates', 'Database maintenance & backups', 'Uptime monitoring & alerts', 'Monthly health reports'],
    tech: 'Full-stack monitoring, Cloudflare Analytics, Firebase, Sentry',
    tone: 'slate',
  },
]

const whyChooseItems = [
  { icon: HiOutlineUserGroup, title: 'Experienced Developers', desc: 'Senior engineers with 5+ years building production SaaS, POS, ERP, and mobile apps for businesses across Pakistan and UAE.' },
  { icon: HiOutlineShieldCheck, title: 'Secure Architecture', desc: 'Enterprise-grade security with encrypted data storage, role-based access, audit logs, and compliance with industry best practices.' },
  { icon: HiOutlineBolt, title: 'Fast Delivery', desc: 'Agile development with 2-week sprints. MVP in weeks, not months. Regular demos so you see progress from day one.' },
  { icon: HiOutlineCube, title: 'Scalable Solutions', desc: 'Cloud-native architecture that scales from 1 to 100,000 users. No rewrites needed as your business grows.' },
  { icon: HiOutlineLifebuoy, title: '24/7 Support', desc: 'Round-the-clock technical support via WhatsApp, email, and phone. Dedicated account manager for enterprise clients.' },
  { icon: HiOutlineCpuChip, title: 'Modern Technology Stack', desc: 'React, Next.js, Node.js, Python, Firebase, Cloudflare, Flutter, Docker — we pick the right tools for your specific needs.' },
]

const processSteps = [
  { step: '01', title: 'Discovery', desc: 'We learn about your business, goals, users, and technical requirements through structured workshops.' },
  { step: '02', title: 'Planning', desc: 'Detailed project roadmap with milestones, technology choices, architecture design, and timeline estimates.' },
  { step: '03', title: 'UI/UX Design', desc: 'Wireframes, prototypes, and pixel-perfect designs. You approve every screen before development begins.' },
  { step: '04', title: 'Development', desc: 'Agile development with bi-weekly sprints. You get working software every 2 weeks with progress demos.' },
  { step: '05', title: 'Testing', desc: 'Comprehensive QA — unit tests, integration tests, user acceptance testing, performance testing, and security audits.' },
  { step: '06', title: 'Deployment', desc: 'Production deployment with zero downtime. DNS setup, SSL certificates, CI/CD pipelines, and monitoring configured.' },
  { step: '07', title: 'Support', desc: 'Ongoing maintenance, feature updates, bug fixes, and 24/7 technical support. We are your long-term technology partner.' },
]

const techStack = [
  { name: 'React', icon: '⚛️' },
  { name: 'Next.js', icon: '▲' },
  { name: 'Node.js', icon: '💚' },
  { name: 'Firebase', icon: '🔥' },
  { name: 'Cloudflare', icon: '☁️' },
  { name: 'Python', icon: '🐍' },
  { name: 'Laravel', icon: '🔷' },
  { name: 'PHP', icon: '🐘' },
  { name: 'MySQL', icon: '🐬' },
  { name: 'MongoDB', icon: '🍃' },
  { name: 'Flutter', icon: '💙' },
  { name: 'Android', icon: '🤖' },
  { name: 'iOS', icon: '🍎' },
  { name: 'Docker', icon: '🐳' },
  { name: 'GitHub', icon: '🐙' },
  { name: 'AI/ML', icon: '🧠' },
]

const portfolioProjects = [
  {
    title: 'Restaurant POS',
    category: 'POS Software',
    tech: ['React', 'Firebase', 'Node.js', 'Cloudflare'],
    desc: 'AI-powered restaurant management — KOT, table management, billing, kitchen display, inventory, and cloud sync. Serving 50+ restaurants.',
    accent: '#0071e3',
    sidebarItems: ['Dashboard', 'Orders', 'Tables', 'Menu', 'Inventory', 'Staff'],
    activeItem: 'Orders',
    windowContent: [
      { type: 'card', label: 'Today Sales', value: 'PKR 48,500', color: 'emerald' },
      { type: 'card', label: 'Active Orders', value: '12', color: 'blue' },
      { type: 'card', label: 'Tables Occupied', value: '18/24', color: 'amber' },
    ],
  },
  {
    title: 'Retail POS',
    category: 'POS Software',
    tech: ['React', 'Firebase', 'Node.js', 'Cloudflare'],
    desc: 'Multi-counter retail billing — barcode scanning, discount engine, inventory, customer ledger, GST reports, and offline-first.',
    accent: '#8b5cf6',
    sidebarItems: ['Dashboard', 'Billing', 'Products', 'Customers', 'Reports', 'Settings'],
    activeItem: 'Billing',
    windowContent: [
      { type: 'table', rows: 4, label: 'Cart Items' },
      { type: 'row', left: 'Subtotal', right: 'PKR 12,500' },
      { type: 'row', left: 'Discount', right: '-PKR 1,250' },
      { type: 'row', left: 'Total', right: 'PKR 11,250', bold: true },
    ],
  },
  {
    title: 'School ERP',
    category: 'Education Tech',
    tech: ['React', 'Node.js', 'MySQL', 'Firebase'],
    desc: 'Complete school management — student records, fees, attendance, exams, timetable, parent portal, and payroll.',
    accent: '#10b981',
    sidebarItems: ['Dashboard', 'Students', 'Fees', 'Attendance', 'Exams', 'Timetable'],
    activeItem: 'Students',
    windowContent: [
      { type: 'card', label: 'Total Students', value: '2,450', color: 'emerald' },
      { type: 'card', label: 'Fee Collected', value: 'PKR 8.2M', color: 'blue' },
      { type: 'card', label: 'Staff Present', value: '48/52', color: 'teal' },
    ],
  },
  {
    title: 'WhatsApp CRM',
    category: 'CRM Platform',
    tech: ['React', 'Node.js', 'Firebase', 'Cloudflare'],
    desc: 'WhatsApp-integrated CRM — automated messaging, lead capture, follow-up sequences, and campaign analytics.',
    accent: '#f59e0b',
    sidebarItems: ['Inbox', 'Contacts', 'Campaigns', 'Templates', 'Reports', 'Settings'],
    activeItem: 'Inbox',
    windowContent: [
      { type: 'chat', messages: 3 },
    ],
  },
  {
    title: 'Inventory Management',
    category: 'Operations',
    tech: ['React', 'Firebase', 'Node.js', 'Cloudflare'],
    desc: 'Cloud stock tracking with purchase orders, supplier management, stock alerts, barcode labels, and GRN processing.',
    accent: '#06b6d4',
    sidebarItems: ['Dashboard', 'Stock', 'Purchase', 'Suppliers', 'GRN', 'Reports'],
    activeItem: 'Stock',
    windowContent: [
      { type: 'card', label: 'Total SKUs', value: '4,820', color: 'cyan' },
      { type: 'card', label: 'Low Stock', value: '23 items', color: 'amber' },
      { type: 'card', label: 'POs Pending', value: '8', color: 'blue' },
    ],
  },
  {
    title: 'Business Dashboard',
    category: 'Analytics',
    tech: ['React', 'Firebase', 'Recharts', 'Node.js'],
    desc: 'Unified analytics — AI-powered reports, sales trends, profit/loss, multi-module overview across all business units.',
    accent: '#6366f1',
    sidebarItems: ['Overview', 'Sales', 'Expenses', 'Profit', 'Staff', 'Reports'],
    activeItem: 'Overview',
    windowContent: [
      { type: 'chart', bars: 12 },
      { type: 'card', label: 'Monthly Revenue', value: 'PKR 2.4M', color: 'indigo' },
      { type: 'card', label: 'Growth', value: '+18.5%', color: 'emerald' },
    ],
  },
  {
    title: 'Alqudabea Security',
    category: 'Client Project',
    tech: ['React', 'Tailwind v4', 'Firebase', 'Cloudflare'],
    desc: 'Complete security company platform — public website, guard management, shift scheduling, attendance, patrol tracking, incidents, HR, finance & 35+ pages.',
    link: 'https://alqudabeasecurity.online',
    accent: '#000000',
    sidebarItems: ['Home', 'Services', 'About', 'Industries', 'Careers', 'Contact'],
    activeItem: 'Home',
    windowContent: [
      { type: 'websiteHero', heading: 'ALQUDABEA', subtext: 'Premium Security Solutions in Bahrain' },
      { type: 'row', left: 'Manned Guarding', right: '✓', bold: false },
      { type: 'row', left: 'CCTV Surveillance', right: '✓', bold: false },
      { type: 'row', left: 'Access Control', right: '✓', bold: false },
      { type: 'row', left: 'Cybersecurity', right: '✓', bold: false },
    ],
  },
]

const faqItems = [
  {
    q: 'What types of software does Nexora develop?',
    a: 'We develop business websites, e-commerce platforms, custom CRM and ERP systems, restaurant POS software, school management systems, mobile apps (iOS & Android), web applications, AI/ML solutions, and enterprise business software. Our stack includes React, Next.js, Node.js, Python, Firebase, Cloudflare, Flutter, and more.',
  },
  {
    q: 'How long does a typical software project take?',
    a: 'Project timelines depend on scope and complexity. A business website typically takes 2-4 weeks. A custom CRM or ERP system takes 8-16 weeks. Mobile apps take 8-20 weeks. We deliver working software every 2 weeks through agile sprints, so you see progress continuously.',
  },
  {
    q: 'How much does custom software development cost?',
    a: 'Every project is unique — we provide detailed estimates after understanding your requirements. Our pricing is transparent with no hidden fees. We offer flexible engagement models: fixed-price for well-defined projects, or dedicated team (monthly) for ongoing development. Contact us for a free consultation and quote.',
  },
  {
    q: 'Do you provide maintenance and support after delivery?',
    a: 'Yes. Every project includes a warranty period, and we offer ongoing maintenance plans that cover bug fixes, security patches, feature updates, performance monitoring, and 24/7 technical support. We are your long-term technology partner — many clients have been with us for years.',
  },
  {
    q: 'Can you work with our existing systems and team?',
    a: 'Absolutely. We specialize in API integration and can connect new software with your existing tools — payment gateways, accounting software, legacy systems, or third-party services. We also collaborate with in-house teams, providing additional development capacity and technical expertise.',
  },
  {
    q: 'What is your development process?',
    a: 'We follow a 7-step agile process: Discovery → Planning → UI/UX Design → Development (2-week sprints) → Testing (QA, UAT, security) → Deployment (zero-downtime) → Ongoing Support. You are involved at every stage with regular demos and transparent communication.',
  },
  {
    q: 'Do you build mobile apps for both iOS and Android?',
    a: 'Yes. We build native apps (Swift/Kotlin) and cross-platform apps (Flutter) that work beautifully on both iOS and Android. All apps include offline support, push notifications, secure authentication, and seamless backend integration.',
  },
  {
    q: 'Is my data secure with your software?',
    a: 'Security is foundational to everything we build. We implement end-to-end encryption, role-based access control, audit logging, regular security audits, GDPR-compliant data handling, and secure cloud infrastructure. Our architecture follows OWASP best practices and PCI-DSS guidelines where applicable.',
  },
  {
    q: 'What makes Nexora different from other software companies?',
    a: 'We are not just developers — we are business software experts. We understand POS, CRM, ERP, and operations deeply because we build and run our own SaaS products. This means we build practical, business-focused software — not just code. Plus, we offer ongoing support, transparent pricing, and a genuine partnership approach.',
  },
  {
    q: 'How do I get started with a software project?',
    a: 'Simply contact us for a free consultation. We will discuss your requirements, provide expert recommendations, and deliver a detailed proposal with timeline and budget. No commitment required. WhatsApp us at +92 319 432 9754 or click "Start Your Project" to begin.',
  },
]

/* ── Tone styles ────────────────────────────────────────────────────── */

const toneStyles = {
  blue: { iconBg: 'bg-blue-100/80', text: 'text-blue-700', ring: 'ring-blue-200/60', gradient: 'from-blue-50 to-sky-50', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  emerald: { iconBg: 'bg-emerald-100/80', text: 'text-emerald-700', ring: 'ring-emerald-200/60', gradient: 'from-emerald-50 to-teal-50', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  indigo: { iconBg: 'bg-indigo-100/80', text: 'text-indigo-700', ring: 'ring-indigo-200/60', gradient: 'from-indigo-50 to-blue-50', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  violet: { iconBg: 'bg-violet-100/80', text: 'text-violet-700', ring: 'ring-violet-200/60', gradient: 'from-violet-50 to-purple-50', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  amber: { iconBg: 'bg-amber-100/80', text: 'text-amber-700', ring: 'ring-amber-200/60', gradient: 'from-amber-50 to-orange-50', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  teal: { iconBg: 'bg-teal-100/80', text: 'text-teal-700', ring: 'ring-teal-200/60', gradient: 'from-teal-50 to-cyan-50', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  rose: { iconBg: 'bg-rose-100/80', text: 'text-rose-700', ring: 'ring-rose-200/60', gradient: 'from-rose-50 to-pink-50', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  sky: { iconBg: 'bg-sky-100/80', text: 'text-sky-700', ring: 'ring-sky-200/60', gradient: 'from-sky-50 to-blue-50', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  slate: { iconBg: 'bg-slate-100/80', text: 'text-slate-700', ring: 'ring-slate-200/60', gradient: 'from-slate-50 to-gray-50', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
}

/* ── Memoized sub-components ─────────────────────────────────────────── */

const ServiceCard = memo(function ServiceCard({ service, index }) {
  const tone = toneStyles[service.tone] || toneStyles.blue
  const href = service.link || `#service-${service.slug}`
  const isExternal = !!service.link
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/70 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.18)] active:scale-[0.98]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone.iconBg} ${tone.text} ring-1 ${tone.ring} transition-transform duration-300 group-hover:scale-110`}>
        <service.icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{service.title}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-[1.65] text-slate-500">{service.desc}</p>
      {isExternal ? (
        <Link
          to={href}
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium tracking-[-0.01em] text-blue-600 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:gap-1.5"
        >
          Learn More
          <HiOutlineArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <a
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium tracking-[-0.01em] text-blue-600 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:gap-1.5"
          onClick={(e) => {
            e.preventDefault()
            const el = document.getElementById(`service-${service.slug}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        >
          Learn More
          <HiOutlineArrowRight className="h-3.5 w-3.5" />
        </a>
      )}
    </article>
  )
})

const WhyCard = memo(function WhyCard({ item, index }) {
  return (
    <article
      className="group flex gap-4 rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-14px_rgba(15,23,42,0.14)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200/60 transition-transform duration-300 group-hover:scale-110">
        <item.icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-slate-900">{item.title}</h3>
        <p className="mt-1 text-[12px] leading-[1.6] text-slate-500">{item.desc}</p>
      </div>
    </article>
  )
})

const ProcessStep = memo(function ProcessStep({ step, index, isLast }) {
  return (
    <div className="relative flex gap-5">
      {!isLast ? <div className="absolute left-[22px] top-12 bottom-0 w-px bg-gradient-to-b from-slate-300 to-transparent" aria-hidden="true" /> : null}
      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] ring-4 ring-white">
        {step.step}
      </div>
      <div className="pb-10">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{step.title}</h3>
        <p className="mt-1 text-[13px] leading-[1.65] text-slate-500">{step.desc}</p>
      </div>
    </div>
  )
})

const FaqItem = memo(function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.08)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={isOpen}
      >
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-slate-900 sm:text-[15px]">{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-[13px] leading-[1.7] text-slate-500">{faq.a}</p>
        </div>
      </div>
    </article>
  )
})

/* ── Page ────────────────────────────────────────────────────────────── */

export default function SoftwareDevelopmentPage() {
  const seo = getSeoForPath('/software-development')
  const [openFaqIndex, setOpenFaqIndex] = useState(0)

  const pageFaqs = useMemo(() => faqItems, [])
  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Custom Software Development Services',
    provider: {
      '@type': 'Organization',
      name: 'Nexora Solution',
      url: 'https://nexorasolution.online',
    },
    serviceType: 'Software Development',
    description: 'Custom business websites, e-commerce, CRM, ERP, POS, mobile apps, AI solutions, API integration, and cloud services.',
    areaServed: { '@type': 'Country', name: 'Pakistan' },
    offers: {
      '@type': 'Offer',
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'PKR',
        minPrice: '1000',
      },
    },
  }), [])

  return (
    <PublicPageShell>
      <PageSeo
        {...seo}
        softwareApplication={{
          name: 'Nexora Custom Software Development',
          description: seo.description,
          applicationCategory: 'DeveloperApplication',
        }}
        faqItems={pageFaqs.map(f => ({ question: f.q, answer: f.a }))}
        structuredData={[structuredData]}
      />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Software Development</span>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_64%,#f1f5f9_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute left-[7%] top-12 hidden h-48 w-48 rotate-3 bg-[radial-gradient(circle,#bfdbfe_1px,transparent_1px)] [background-size:17px_17px] opacity-40 lg:block" />
        <div className="pointer-events-none absolute right-[9%] top-28 hidden h-52 w-52 -rotate-6 bg-[radial-gradient(circle,#c7d2fe_1px,transparent_1px)] [background-size:18px_18px] opacity-40 lg:block" />
        <div className="pointer-events-none absolute bottom-0 left-[22%] hidden h-40 w-40 bg-[radial-gradient(circle,#d1d5db_1px,transparent_1px)] [background-size:15px_15px] opacity-30 lg:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-8">
          <div>
            <Link
              to="/"
              className="group inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/75 px-4 py-2 text-[13px] font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-px hover:border-slate-300/70 hover:bg-white hover:text-slate-500 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97] sm:min-h-[42px] sm:px-5 sm:text-sm"
            >
              <HiOutlineArrowLeft className="h-[17px] w-[17px] transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to Website
            </Link>

            <p className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-700 shadow-sm backdrop-blur-xl">
              <HiOutlineCodeBracket className="h-3.5 w-3.5" />
              Software Development
            </p>

            <h1 className="mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
              Custom Software{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Development Services
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
              We design and build high-performance websites, mobile apps, CRM systems, ERP solutions,
              POS software,<strong className="font-semibold text-slate-700"> AI-powered applications</strong>, and enterprise business solutions — every project
              infused with artificial intelligence (DeepSeek, Gemini, custom ML models) for smarter
              automation, predictive insights, and intelligent user experiences.
            </p>

            {/* Hero detail blocks */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: HiOutlineUserGroup, label: '50+ Projects Delivered', sub: 'Across Pakistan & UAE' },
                { icon: HiOutlineCpuChip, label: 'AI-Powered Development', sub: 'DeepSeek, Gemini, custom ML' },
                { icon: HiOutlineClock, label: '2-12 Week Delivery', sub: 'Agile sprints, fast MVP' },
                { icon: HiOutlineShieldCheck, label: 'Enterprise Security', sub: 'Encrypted, compliant, audited' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white/60 p-3 backdrop-blur-sm">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <div>
                    <p className="text-[12px] font-semibold tracking-[-0.01em] text-slate-800">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#contact-cta"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]"
              >
                Start Your Project
                <HiOutlineArrowRight className="text-lg" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
              >
                <FaWhatsapp className="text-base text-emerald-500" />
                Book Free Consultation
              </a>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-[2rem] border border-slate-200/60 bg-white p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><HiOutlineCodeBracket className="h-5 w-5" /></div>
                  <div className="flex-1"><div className="h-2.5 w-28 rounded-full bg-blue-200/60" /><div className="mt-1.5 h-2 w-20 rounded-full bg-blue-100/60" /></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><HiOutlineServerStack className="h-5 w-5" /></div>
                  <div className="flex-1"><div className="h-2.5 w-32 rounded-full bg-emerald-200/60" /><div className="mt-1.5 h-2 w-24 rounded-full bg-emerald-100/60" /></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><HiOutlineDevicePhoneMobile className="h-5 w-5" /></div>
                  <div className="flex-1"><div className="h-2.5 w-24 rounded-full bg-violet-200/60" /><div className="mt-1.5 h-2 w-28 rounded-full bg-violet-100/60" /></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-[2rem] bg-gradient-to-br from-blue-100/60 to-violet-100/60" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section data-reveal id="services" className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-700 shadow-sm">
              <HiOutlineSparkles className="h-3.5 w-3.5" />
              Our Services
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Complete software{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                development
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
              From business websites to enterprise ERP systems — we build every type of software your business needs.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <ServiceCard key={service.title} service={service} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Details ── */}
      <section className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-700 shadow-sm">
              <HiOutlineMagnifyingGlass className="h-3.5 w-3.5" />
              In-Depth
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Explore each{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                service
              </span>
            </h2>
          </div>

          <div className="mt-12 space-y-8">
            {services.map((service) => {
              const tone = toneStyles[service.tone] || toneStyles.blue
              const Icon = service.icon
              return (
                <article
                  key={service.slug}
                  id={`service-${service.slug}`}
                  className="scroll-mt-24 rounded-[1.8rem] border border-slate-200/60 bg-white p-6 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.06)] sm:p-8"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                    {/* Left: icon + overview */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${tone.iconBg} ${tone.text} ring-1 ${tone.ring}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-[1.25rem] font-semibold tracking-[-0.01em] text-slate-900">{service.title}</h3>
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/60 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                            {service.tech.split(',')[0].trim()}
                          </span>
                        </div>
                      </div>
                      <p className="mt-4 text-[14px] leading-[1.7] text-slate-600">{service.detail}</p>

                      {/* CTA */}
                      <div className="mt-5 flex flex-wrap gap-3">
                        {service.link ? (
                          <>
                            <Link
                              to={service.link}
                              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]"
                            >
                              View Full Product Page
                              <HiOutlineArrowRight className="h-4 w-4" />
                            </Link>
                            <a
                              href={WHATSAPP_URL}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-5 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                            >
                              <FaWhatsapp className="text-base text-emerald-500" />
                              WhatsApp Us
                            </a>
                          </>
                        ) : (
                          <a
                            href={WHATSAPP_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]"
                          >
                            <FaWhatsapp className="text-base text-emerald-400" />
                            Discuss on WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right: features + tech */}
                    <div className="lg:w-[380px] shrink-0 space-y-4">
                      {/* Features */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Key Features</p>
                        <ul className="mt-3 space-y-2">
                          {service.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-[13px] text-slate-600">
                              <HiOutlineCheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${tone.text}`} />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Tech */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Technology</p>
                        <p className="mt-2 text-[13px] leading-[1.6] text-slate-600">{service.tech}</p>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Why Choose Nexora ── */}
      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 shadow-sm">
              <HiOutlineCheckCircle className="h-3.5 w-3.5" />
              Why Choose Nexora
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Built for{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                reliability
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
              Six reasons businesses across Pakistan trust Nexora for their software development needs.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whyChooseItems.map((item, i) => (
              <WhyCard key={item.title} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Development Process Timeline ── */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-amber-700 shadow-sm">
              <HiOutlineRocketLaunch className="h-3.5 w-3.5" />
              Our Process
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              How we turn ideas into{' '}
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                software
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
              A proven 7-step agile process that delivers quality software on time, every time.
            </p>
          </div>

          <div className="mt-12 pl-1">
            {processSteps.map((step, i) => (
              <ProcessStep key={step.step} step={step} index={i} isLast={i === processSteps.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Technology Stack ── */}
      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-violet-700 shadow-sm">
              <HiOutlineCircleStack className="h-3.5 w-3.5" />
              Technology Stack
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Modern tools for{' '}
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                modern software
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
              We use the latest technologies to build fast, secure, and scalable applications.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech.name}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:shadow-[0_6px_18px_-8px_rgba(15,23,42,0.12)] active:scale-[0.97]"
              >
                <span className="text-base" role="img" aria-hidden="true">{tech.icon}</span>
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portfolio ── */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-700 shadow-sm">
              <HiOutlineBriefcase className="h-3.5 w-3.5" />
              Portfolio
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Software we have{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                built
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
              Production software powering businesses — every module built with the Nexora platform.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {portfolioProjects.map((project) => (
              <article
                key={project.title}
                className="group flex flex-col overflow-hidden rounded-[1.6rem] border border-slate-200/60 bg-white shadow-[0_6px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_56px_-22px_rgba(15,23,42,0.22)] active:scale-[0.98]"
              >
                {/* Apple-style window mockup */}
                <div className="relative bg-[#1c1c1e] p-3">
                  {/* Title bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="ml-2 truncate text-[10px] font-medium text-[#86868b]">{project.title} — Nexora Solution</span>
                  </div>

                  {/* Window body: sidebar + content */}
                  <div className="mt-2.5 flex gap-2.5 overflow-hidden rounded-lg">
                    {/* Sidebar */}
                    <div className="hidden w-[90px] shrink-0 space-y-0.5 sm:block">
                      {project.sidebarItems.map((item) => (
                        <div
                          key={item}
                          className={`truncate rounded-md px-2 py-1 text-[9px] font-medium transition-colors ${
                            item === project.activeItem
                              ? 'text-white'
                              : 'text-[#98989d]'
                          }`}
                          style={item === project.activeItem ? { backgroundColor: project.accent } : {}}
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* Content area */}
                    <div className="min-w-0 flex-1 space-y-1.5 rounded-lg bg-[#2c2c2e] p-2.5">
                      {project.windowContent.map((block, idx) => {
                        if (block.type === 'card') {
                          return (
                            <div key={idx} className="flex items-center justify-between rounded-md bg-[#3a3a3c] px-2.5 py-1.5">
                              <span className="text-[9px] text-[#98989d]">{block.label}</span>
                              <span className={`text-[11px] font-bold ${
                                block.color === 'emerald' ? 'text-emerald-400' :
                                block.color === 'blue' ? 'text-blue-400' :
                                block.color === 'amber' ? 'text-amber-400' :
                                block.color === 'teal' ? 'text-teal-400' :
                                block.color === 'cyan' ? 'text-cyan-400' :
                                block.color === 'indigo' ? 'text-indigo-400' :
                                'text-white'
                              }`}>{block.value}</span>
                            </div>
                          )
                        }
                        if (block.type === 'table') {
                          return (
                            <div key={idx} className="space-y-1">
                              {Array.from({ length: block.rows || 3 }).map((_, ri) => (
                                <div key={ri} className="flex items-center justify-between rounded bg-[#3a3a3c] px-2 py-0.5">
                                  <span className="h-1.5 w-16 rounded-full bg-[#48484a]" />
                                  <span className="h-1.5 w-10 rounded-full bg-[#48484a]" />
                                  <span className="h-1.5 w-8 rounded-full bg-[#48484a]" />
                                </div>
                              ))}
                            </div>
                          )
                        }
                        if (block.type === 'row') {
                          return (
                            <div key={idx} className="flex items-center justify-between px-1">
                              <span className={`text-[9px] ${block.bold ? 'font-bold text-white' : 'text-[#98989d]'}`}>{block.left}</span>
                              <span className={`text-[10px] ${block.bold ? 'font-bold text-white' : 'text-[#98989d]'}`}>{block.right}</span>
                            </div>
                          )
                        }
                        if (block.type === 'chat') {
                          return (
                            <div key={idx} className="space-y-1.5">
                              {Array.from({ length: block.messages || 3 }).map((_, mi) => (
                                <div key={mi} className={`flex ${mi % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                                  <div className={`rounded-xl px-2.5 py-1 text-[9px] font-medium ${
                                    mi % 2 === 0 ? 'bg-[#3a3a3c] text-[#d1d1d6]' : 'text-white'
                                  }`}
                                  style={mi % 2 !== 0 ? { backgroundColor: project.accent } : {}}
                                  >
                                    {['Hello! How can we help? 👋', 'I need info about pricing', 'Sure! Plans start at PKR 1,000/month'][mi]}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        }
                        if (block.type === 'chart') {
                          return (
                            <div key={idx} className="flex items-end gap-[3px] pt-1">
                              {Array.from({ length: block.bars || 12 }).map((_, bi) => (
                                <div
                                  key={bi}
                                  className="flex-1 rounded-t-sm"
                                  style={{
                                    height: `${20 + Math.random() * 35}px`,
                                    backgroundColor: bi % 3 === 0 ? project.accent : '#3a3a3c',
                                    opacity: bi % 3 === 0 ? 1 : 0.5,
                                  }}
                                />
                              ))}
                            </div>
                          )
                        }
                        if (block.type === 'websiteHero') {
                          return (
                            <div key={idx} className="space-y-2 rounded-md bg-[#3a3a3c] p-2.5 text-center">
                              <p className="text-[11px] font-bold text-white tracking-wide">{block.heading}</p>
                              <p className="text-[8px] text-[#98989d] leading-relaxed">{block.subtext}</p>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                </div>

                {/* Info section */}
                <div className="flex flex-1 flex-col p-5">
                  <span className="inline-flex self-start rounded-full border border-slate-200/60 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    {project.category}
                  </span>
                  <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.01em] text-slate-900">{project.title}</h3>
                  <p className="mt-1.5 flex-1 text-[12px] leading-[1.6] text-slate-500">{project.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.tech.map((t) => (
                      <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{t}</span>
                    ))}
                  </div>
                  {project.link ? (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-blue-600 transition-all duration-200 hover:gap-2"
                    >
                      Visit Live Website
                      <HiOutlineArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Link
                      to="/projects"
                      className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-blue-600 transition-all duration-200 hover:gap-2"
                    >
                      View Project
                      <HiOutlineArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Implementation Stories ── */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-amber-700 shadow-sm">
              <HiOutlineSparkles className="h-3.5 w-3.5" />
              Success Stories
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Teams using{' '}
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                Nexora products
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
              Real implementation stories from restaurants, retail stores, schools, and businesses running on Nexora.
            </p>
          </div>

          <div className="mt-12 space-y-8">
            {/* Restaurant POS */}
            <article className="overflow-hidden rounded-[1.8rem] border border-slate-200/60 bg-white shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
              <div className="grid lg:grid-cols-[1fr_340px]">
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700">Restaurant POS</span>
                    <span className="text-[11px] text-slate-400">Karachi, Pakistan</span>
                  </div>
                  <h3 className="mt-3 text-[1.15rem] font-semibold tracking-[-0.01em] text-slate-900">
                    How a 40-table restaurant cut order time by 60% with Nexora KOT
                  </h3>
                  <p className="mt-3 text-[13px] leading-[1.7] text-slate-500">
                    A busy Karachi restaurant serving 500+ customers daily was struggling with paper KOTs — orders got lost, customers waited too long, and the kitchen made mistakes. After implementing Nexora Restaurant POS with AI-powered Kitchen Display System and DeepSeek-driven analytics, they eliminated paper tickets entirely. Orders now flow from waiter tablets directly to the kitchen screen in under 3 seconds. The built-in AI sales analyzer detects peak hours, predicts inventory needs, and recommends menu optimizations automatically. Result: average table turnover improved by 35%, order errors dropped 90%, and monthly revenue increased 28%.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {['60% faster ordering','90% fewer errors','28% revenue growth','35% faster table turnover'].map(m => (
                      <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                        <HiOutlineCheckCircle className="h-3.5 w-3.5" />{m}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">AK</div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">Ahmed Khan</p>
                      <p className="text-[11px] text-slate-400">Operations Manager — 40-table restaurant, Karachi</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-8">
                  <div className="space-y-3 text-center">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-amber-500">Results</p>
                    {[
                      { label: 'Order Time', before: '8 min', after: '3 min', pct: '-62%' },
                      { label: 'Order Errors', before: '15/day', after: '1-2/day', pct: '-90%' },
                      { label: 'Monthly Revenue', before: 'PKR 3.2M', after: 'PKR 4.1M', pct: '+28%' },
                      { label: 'Table Turnover', before: '55 min', after: '36 min', pct: '-35%' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 rounded-xl bg-white/80 p-2.5 text-left shadow-sm">
                        <span className="w-[80px] text-[10px] font-semibold text-slate-500">{row.label}</span>
                        <span className="text-[11px] text-slate-400 line-through">{row.before}</span>
                        <span className="text-[12px] font-bold text-slate-800">{row.after}</span>
                        <span className="ml-auto text-[11px] font-bold text-emerald-600">{row.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            {/* Retail POS */}
            <article className="overflow-hidden rounded-[1.8rem] border border-slate-200/60 bg-white shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
              <div className="grid lg:grid-cols-[1fr_340px]">
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">Retail POS</span>
                    <span className="text-[11px] text-slate-400">Lahore, Pakistan</span>
                  </div>
                  <h3 className="mt-3 text-[1.15rem] font-semibold tracking-[-0.01em] text-slate-900">
                    A 3-branch retail chain unified inventory and billing with Nexora
                  </h3>
                  <p className="mt-3 text-[13px] leading-[1.7] text-slate-500">
                    A growing retail chain with 3 branches in Lahore was running separate Excel sheets for each location — inventory counts never matched, billing was slow, and GST filing was a nightmare. Nexora Retail POS unified all 3 branches into one cloud dashboard powered by AI inventory prediction. Now they track 8,000+ SKUs in real-time, generate GST-compliant invoices in seconds, and the AI auto-detects which products need restocking before they run out. The owner checks daily sales from his phone, with AI-generated sales insights delivered every morning via WhatsApp.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {['3 branches unified','8,000+ SKUs tracked','GST auto-filing','Real-time inventory sync'].map(m => (
                      <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">
                        <HiOutlineCheckCircle className="h-3.5 w-3.5" />{m}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">SR</div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">Sara Rehman</p>
                      <p className="text-[11px] text-slate-400">Owner — 3-branch retail chain, Lahore</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 p-8">
                  <div className="space-y-3 text-center">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-violet-500">Results</p>
                    {[
                      { label: 'Billing Speed', before: '4 min', after: '45 sec', pct: '-81%' },
                      { label: 'Stock Accuracy', before: '72%', after: '99%', pct: '+27%' },
                      { label: 'GST Filing', before: '3 days', after: '2 hours', pct: '-95%' },
                      { label: 'Monthly Sales', before: 'PKR 1.8M', after: 'PKR 2.5M', pct: '+39%' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 rounded-xl bg-white/80 p-2.5 text-left shadow-sm">
                        <span className="w-[80px] text-[10px] font-semibold text-slate-500">{row.label}</span>
                        <span className="text-[11px] text-slate-400 line-through">{row.before}</span>
                        <span className="text-[12px] font-bold text-slate-800">{row.after}</span>
                        <span className="ml-auto text-[11px] font-bold text-emerald-600">{row.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            {/* School ERP */}
            <article className="overflow-hidden rounded-[1.8rem] border border-slate-200/60 bg-white shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
              <div className="grid lg:grid-cols-[1fr_340px]">
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-teal-700">School ERP</span>
                    <span className="text-[11px] text-slate-400">Islamabad, Pakistan</span>
                  </div>
                  <h3 className="mt-3 text-[1.15rem] font-semibold tracking-[-0.01em] text-slate-900">
                    A 1,200-student school digitized fee collection and attendance
                  </h3>
                  <p className="mt-3 text-[13px] leading-[1.7] text-slate-500">
                    An Islamabad school with 1,200+ students was drowning in paperwork — manual fee registers, paper attendance sheets, and report cards took weeks to prepare. After deploying Nexora School ERP with AI-powered analytics and DeepSeek integration, they digitized everything. Parents now pay fees online and get instant SMS receipts. Teachers mark attendance on tablets with AI facial recognition. Report cards are auto-generated with AI performance insights. The admin dashboard uses machine learning to predict fee defaults and flag at-risk students. Admin team went from 6 people to 3, and fee collection improved from 78% to 96%.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {['1,200+ students managed','96% fee collection rate','50% less admin staff','Report cards auto-generated'].map(m => (
                      <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50 px-3 py-1 text-[11px] font-medium text-teal-700">
                        <HiOutlineCheckCircle className="h-3.5 w-3.5" />{m}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">MI</div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">Mohammad Iqbal</p>
                      <p className="text-[11px] text-slate-400">Principal — 1,200-student school, Islamabad</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 p-8">
                  <div className="space-y-3 text-center">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal-500">Results</p>
                    {[
                      { label: 'Fee Collection', before: '78%', after: '96%', pct: '+18%' },
                      { label: 'Admin Staff', before: '6 people', after: '3 people', pct: '-50%' },
                      { label: 'Report Cards', before: '3 weeks', after: '2 days', pct: '-90%' },
                      { label: 'Parent Satisfaction', before: '72%', after: '94%', pct: '+22%' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 rounded-xl bg-white/80 p-2.5 text-left shadow-sm">
                        <span className="w-[80px] text-[10px] font-semibold text-slate-500">{row.label}</span>
                        <span className="text-[11px] text-slate-400 line-through">{row.before}</span>
                        <span className="text-[12px] font-bold text-slate-800">{row.after}</span>
                        <span className="ml-auto text-[11px] font-bold text-emerald-600">{row.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            {/* WhatsApp CRM */}
            <article className="overflow-hidden rounded-[1.8rem] border border-slate-200/60 bg-white shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
              <div className="grid lg:grid-cols-[1fr_340px]">
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">WhatsApp CRM</span>
                    <span className="text-[11px] text-slate-400">Dubai, UAE</span>
                  </div>
                  <h3 className="mt-3 text-[1.15rem] font-semibold tracking-[-0.01em] text-slate-900">
                    A Dubai real estate agency automated 80% of lead follow-ups
                  </h3>
                  <p className="mt-3 text-[13px] leading-[1.7] text-slate-500">
                    A Dubai-based real estate agency was losing leads because agents couldn't follow up fast enough. With 200+ inquiries per day across WhatsApp, email, and phone, leads were slipping through cracks. Nexora WhatsApp CRM — powered by DeepSeek AI — automated the entire lead capture and follow-up sequence. The AI chatbot handles initial conversations in English and Arabic, qualifies leads automatically, and routes hot prospects to the right agent. New inquiries get instant AI-generated replies, leads are scored by machine learning, and agents receive smart reminders. The agency now converts 3x more leads with the same team size.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {['200+ leads/day automated','80% follow-up automation','3x lead conversion','Same team, 3x output'].map(m => (
                      <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                        <HiOutlineCheckCircle className="h-3.5 w-3.5" />{m}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">OA</div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">Omar Al-Rashid</p>
                      <p className="text-[11px] text-slate-400">Sales Director — Real Estate Agency, Dubai</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50 p-8">
                  <div className="space-y-3 text-center">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-500">Results</p>
                    {[
                      { label: 'Response Time', before: '4 hours', after: '3 sec', pct: '-99%' },
                      { label: 'Leads Managed', before: '60/day', after: '200/day', pct: '+233%' },
                      { label: 'Conversion Rate', before: '4%', after: '12%', pct: '+200%' },
                      { label: 'Agent Workload', before: '100%', after: '20%', pct: '-80%' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 rounded-xl bg-white/80 p-2.5 text-left shadow-sm">
                        <span className="w-[80px] text-[10px] font-semibold text-slate-500">{row.label}</span>
                        <span className="text-[11px] text-slate-400 line-through">{row.before}</span>
                        <span className="text-[12px] font-bold text-slate-800">{row.after}</span>
                        <span className="ml-auto text-[11px] font-bold text-emerald-600">{row.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm">
              <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
              FAQ
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Frequently asked{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                questions
              </span>
            </h2>
          </div>

          <div className="mt-10 grid gap-3">
            {pageFaqs.map((faq, i) => (
              <FaqItem
                key={faq.q}
                faq={faq}
                isOpen={openFaqIndex === i}
                onToggle={() => setOpenFaqIndex(openFaqIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section data-reveal id="contact-cta" className="px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-slate-200/60 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Ready to Build Your Next Software Project?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Let&apos;s discuss your requirements. Free consultation, no commitment — just expert advice on how
              to turn your idea into production-ready software.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]"
            >
              Request a Quote
              <HiOutlineArrowRight className="text-lg" />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
            >
              <FaWhatsapp className="text-base text-emerald-500" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
