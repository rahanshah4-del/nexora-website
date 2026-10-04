import { planPriceSentence } from './platformPlans.js'

/**
 * City landing pages (local SEO). One object per city; CityPage.jsx renders it
 * and scripts/prerender.mjs reads the same data for the static HTML, so the
 * two cannot drift. Only state facts that are true: Nexora's head office is in
 * Multan (see SITE_ADDRESS in seoStructuredData.js), and the product list below
 * matches the modules on the site. No client names, counts or ratings.
 */

export const CITIES = [
  {
    slug: 'multan',
    name: 'Multan',
    nameUrdu: 'ملتان',
    province: 'Punjab',

    seoTitle: 'POS & Business Software in Multan | Nexora Solution',
    seoDescription: 'Nexora Solution is a Multan software company: restaurant, retail and pharmacy POS, school ERP, CRM and custom software. Free 1-month trial.',
    seoKeywords: 'POS software in Multan, restaurant software in Multan, software company in Multan, software house in Multan, billing software Multan, ERP software Multan, school software Multan, pharmacy software Multan',

    hero: {
      eyebrow: 'Head office in Multan · Punjab, Pakistan',
      headingA: 'POS and business software',
      headingB: 'made in Multan',
      subtitle: 'Nexora Solution builds restaurant POS, retail POS, pharmacy POS, school ERP, CRM and custom software for businesses in Multan. Our team works from Al Noor Plaza, so the people who build the product are in your own city.',
    },

    facts: [
      { value: '2019', label: 'Building business software since' },
      { value: 'Multan', label: 'Head office: Al Noor Plaza' },
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'Offline', label: 'Restaurant POS keeps billing without internet' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Nexora Solution is a software company based in Multan. Since 2019 we have been building cloud software that replaces registers, spreadsheets and scattered WhatsApp messages with one shared workspace: sales, stock, customers, staff access and reports in one dashboard that the owner can open from a phone or a laptop.',
        'The platform is called Nexora. It is one login with several business modules: Restaurant POS, Retail POS, Pharmacy POS (PharmaFlow), School ERP, CRM, WhatsApp CRM, and a Transport and Fleet module. You pick the module your business needs, invite your team, and give each person only the screens their job requires.',
        'Besides the ready-made modules, we also build custom software for companies that need something specific: a tailored CRM, an ERP, a mobile app, an online store or an integration with the tools they already use. If you are looking for a software house in Multan that can both sell you a working product today and build what is missing, that is the gap Nexora fills.',
      ],
    },

    arts: {
      eyebrow: 'The city we build for',
      heading: 'Multan is a city of makers, and its businesses run on trust',
      intro: 'Multan is called the City of Saints. Its shrines are covered in blue glazed tiles, its bazaars have traded for centuries, and its craftspeople are known across Pakistan. Software for this city has to respect how business is actually done here: by relationship, by credit, by the same customer coming back for years.',
      items: [
        {
          key: 'pottery',
          title: 'Blue pottery (kashi kari)',
          text: 'Multani blue pottery and tilework are famous worldwide. A pottery workshop deals with many small items, custom orders and walk-in customers, so it needs item-wise stock, quotations that turn into invoices, and a clear customer ledger.',
        },
        {
          key: 'lamp',
          title: 'Camel-skin lamps and khussa',
          text: 'Hand-painted camel-skin lamps and Multani khussa are sold from small shops and workshops. Barcode billing, item-wise stock and daily sales reports are what keep these counters tidy.',
        },
        {
          key: 'ajrak',
          title: 'Ajrak, cloth and bazaars',
          text: 'Hussain Agahi, Chowk Bazaar and the old city markets sell cloth, ajrak and everyday goods all day. Multi-counter billing and customer accounts help a busy shop stay accurate on a crowded day.',
        },
        {
          key: 'mango',
          title: 'Mangoes and Multani food',
          text: 'Multan is known for its mangoes, Sohan halwa, sohbat and lassi. Restaurants, sweet shops and fruit traders need fast billing and KOT during the rush, and clear purchase records during the season.',
        },
      ],
    },

    business: {
      heading: 'Which Nexora module fits your Multan business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add a second module later without starting over.',
      items: [
        { title: 'Restaurants, sweet shops and cafes', text: 'KOT and kitchen display, table management, split bills and an offline-ready POS for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Shops, marts and showrooms', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger for retail shops.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Medical stores and pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts at the counter.', label: 'Pharmacy POS', to: '/pharmacy-pos' },
        { title: 'Schools, academies and tuition centres', text: 'Student records, fee collection, attendance, exams, parent portal and staff payroll in one school ERP.', label: 'School ERP', to: '/school-erp' },
        { title: 'Transport, rent-a-car and fleets', text: 'Vehicles, drivers, bookings and expenses managed from one transport and fleet workspace.', label: 'Transport & Fleet', to: '/transport-fleet' },
        { title: 'Sales teams, traders and exporters', text: 'Track leads, follow-ups and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
      ],
    },

    why: {
      heading: 'Why Multan businesses choose Nexora',
      items: [
        { title: 'A team in your own city', text: 'Our head office is in Multan. Call or message on WhatsApp and you reach the people who build and support the product, in Urdu or English.' },
        { title: 'Works when the internet or power drops', text: 'Multan summers bring load-shedding and patchy connections. The Restaurant POS keeps taking orders offline and syncs when you are back online.' },
        { title: 'Pakistani payments', text: 'Record cash, card, JazzCash, Easypaisa and bank transfer sales in your POS. Nexora plans can be paid by JazzCash, Easypaisa or bank transfer.' },
        { title: 'Prices in rupees, trial first', text: 'Every plan starts with a free month, with no credit card needed. After that you pay in PKR, monthly or yearly.' },
        { title: 'Owner visibility', text: 'See today’s sales, stock and staff activity from your phone, even when you are not at the shop.' },
        { title: 'Roles and permissions', text: 'A cashier sees the billing screen, a manager sees reports, and the owner sees everything. Nobody gets more access than their job needs.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every area of Multan',
      text: 'Nexora opens in a browser, so it works the same wherever your shop or office is. Businesses can use it from Multan Cantt, Gulgasht Colony, Bosan Road, Nawan Shehr, Hussain Agahi, Shah Rukn-e-Alam Colony, Mumtazabad, Wapda Town and Vehari Road, as well as from the rest of Punjab and Pakistan. Setup, data migration and staff training are free on every plan.',
      list: ['Multan Cantt', 'Gulgasht Colony', 'Bosan Road', 'Nawan Shehr', 'Hussain Agahi', 'Shah Rukn-e-Alam Colony', 'Mumtazabad', 'Wapda Town', 'Vehari Road'],
    },

    pricingHeading: 'Simple pricing in rupees',
    pricingNote: 'Every plan includes a 1-month free trial, free setup, free data migration and free staff training. Full details are on the pricing page.',

    steps: [
      { title: 'Message us on WhatsApp or call', text: 'Tell us what kind of business you run and how many people use the counter or the office.' },
      { title: 'Start the free month', text: 'Create your account, pick the module that fits, and add your menu, products, students or customers. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test bills, and start using Nexora for real sales.' },
    ],

    faqs: [
      { q: 'Is Nexora Solution a software company in Multan?', a: 'Yes. Nexora Solution’s head office is at Al Noor Plaza, Multan, Punjab. We build the Nexora platform and custom software from here, and we support customers across Multan and the rest of Pakistan.' },
      { q: 'Which POS software is best for a restaurant in Multan?', a: 'It depends on your setup, so try before you decide. Nexora’s Restaurant POS covers KOT, kitchen display, table management and billing, works offline, and comes with a free first month, so you can run it in your own restaurant before paying.' },
      { q: 'Can I use Nexora for a pharmacy or medical store in Multan?', a: 'Yes. The Pharmacy POS (PharmaFlow) handles medicine search, batch and expiry tracking, supplier purchases and itemized receipts at the counter.' },
      { q: 'Does Nexora work during load-shedding or when the internet is down?', a: 'The Restaurant POS is built to keep billing offline and syncs automatically when the connection returns. Other modules are cloud-based and need an internet connection.' },
      { q: 'How much does Nexora cost in Multan?', a: `${planPriceSentence()} Every plan includes a 1-month free trial, and prices are in Pakistani rupees.` },
      { q: 'Do you build custom software for businesses in Multan?', a: 'Yes. Besides the ready-made modules, we build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need on WhatsApp and we will say whether a module already covers it or what a custom build would involve.' },
      { q: 'Can a school or academy in Multan manage fees and attendance with Nexora?', a: 'Yes. The School ERP covers student and parent records, fee collection, attendance (manual or with a biometric device), exams and staff payroll.' },
      { q: 'How do I get started?', a: 'Message us on WhatsApp at 0319 4329754 or use the contact page. We will help you start the free month, move your existing data and train your staff.' },
    ],

    ctaHeading: 'Ready to run your Multan business on Nexora?',
    ctaSubtext: 'Start the free month today, or message us and we will show you the module that fits your shop, restaurant, pharmacy or school.',
  },
]

export function getCity(slug) {
  return CITIES.find((city) => city.slug === slug) || null
}
