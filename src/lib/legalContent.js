// Single source of truth for the legal pages (Privacy Policy, Terms, Refund
// Policy). Rendered by the React pages in src/pages/public/ AND baked into the
// prerendered static HTML by scripts/prerender.mjs, so crawlers (including the
// AdSense and Search crawlers) read the full policy text before any JS runs.
//
// Each section: { heading, paragraphs?: string[], items?: string[],
// links?: { label, href }[] }. Keep it plain text — no HTML — so both
// renderers can escape it safely.

export const LEGAL_CONTACT = {
  company: 'Nexora Solution',
  website: 'https://nexorasolution.online',
  email: 'info@nexorasolution.online',
  phone: '03194329754',
  whatsappUrl: 'https://wa.me/923194329754',
  country: 'Pakistan',
}

/** URL-safe anchor id for a section heading (used by the contents list on both renderers). */
export function legalAnchor(heading) {
  return String(heading)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const privacyPolicy = {
  path: '/privacy-policy',
  title: 'Privacy Policy',
  lastUpdated: 'September 24, 2026',
  intro:
    'This Privacy Policy explains how Nexora Solution ("Nexora", "we", "us") collects, uses, shares and protects information when you visit nexorasolution.online, read our blog, contact us, or use the Nexora business software and services. By using this website you agree to the practices described here.',
  glanceHeading: 'Privacy at a glance',
  glanceNote: 'This summary is for convenience. The full policy below is what applies.',
  glance: [
    { title: 'We do not sell personal information', text: 'Your information is shared only with the service providers listed below, when you ask us to, to protect rights and safety, or when the law requires it.' },
    { title: 'Your business data stays yours', text: 'What you enter into the Nexora software, such as customers, products, invoices and staff records, belongs to you and is processed only to provide the service.' },
    { title: 'Card details are not stored by us', text: 'Online subscription payments are processed by Paddle. We do not store full card details.' },
    { title: 'Ads and cookies on this website', text: 'This website uses Google AdSense and analytics. You can opt out of personalised ads, and where the law requires it we ask for your consent first.' },
    { title: 'Access, correct, export or delete', text: 'Contact us to see, correct, export or delete your personal information, or to stop marketing messages.' },
    { title: 'Protected in transit and by role', text: 'We use HTTPS encryption in transit, access controls and role-based permissions to protect data.' },
  ],
  faqHeading: 'Privacy questions, answered',
  faqs: [
    { q: 'Does Nexora sell my personal information?', a: 'No. We do not sell your personal information. We share it only with the service providers named in this policy, when you ask us to, to protect rights and safety, or when required by law.' },
    { q: 'What information does Nexora collect?', a: 'Contact details you give us (such as name, business name, phone or WhatsApp number and email), the account and business data you enter into the software, technical data such as IP address, browser, device and pages viewed, and information stored in cookies and similar technologies.' },
    { q: 'Who processes data on behalf of Nexora?', a: 'Google (Tag Manager, Analytics, AdSense and Firebase), Meta (Pixel and WhatsApp), Cloudflare, Tawk.to, Paddle and email providers. Each processes data under its own privacy policy. The full list and what each one does is in the section on analytics and third-party services.' },
    { q: 'How do I ask for my data to be deleted?', a: 'Contact us by email, WhatsApp or the contact page and tell us what you want removed. Account data is kept while your account is active and deleted or anonymised after closure, unless we must keep it for legal or accounting reasons.' },
    { q: 'Does this website use cookies and show ads?', a: 'Yes. We and our partners use cookies, local storage and similar technologies to keep you signed in, remember preferences, measure usage and serve and measure advertising through Google AdSense. You can block cookies in your browser and opt out of personalised ads through Google Ads Settings.' },
    { q: 'Is Nexora meant for children?', a: 'No. The website and the software are intended for businesses and are not directed at children under 13. If you believe a child has given us personal information, contact us and we will delete it.' },
    { q: 'How do I contact Nexora about privacy?', a: `Email ${LEGAL_CONTACT.email}, message or call ${LEGAL_CONTACT.phone} on WhatsApp, or use the contact page. Nexora Solution is based in Multan, Pakistan.` },
  ],
  related: [
    { label: 'Cookie Policy', to: '/cookie-policy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Refund Policy', to: '/refund-policy' },
    { label: 'Help Center', to: '/help-center' },
    { label: 'Contact us', to: '/contact' },
  ],
  sections: [
    {
      heading: 'Information we collect',
      paragraphs: ['We collect only the information needed to run the website, answer enquiries and provide our software:'],
      items: [
        'Contact details you give us — such as your name, business name, phone/WhatsApp number and email address — when you request a demo, send a message, sign up or leave a review.',
        'Account and business data you enter into the Nexora software (for example customers, products, invoices and staff records). This data belongs to you and is processed only to provide the service.',
        'Technical and usage data collected automatically, such as IP address, browser type, device type, pages viewed, referring page and the date and time of your visit.',
        'Information stored in cookies and similar technologies, as described below.',
      ],
    },
    {
      heading: 'How we use information',
      items: [
        'To operate, maintain and improve the website and the Nexora software.',
        'To respond to enquiries, demo requests, support tickets and service requests.',
        'To create and secure user accounts, including fraud and abuse prevention.',
        'To measure website traffic and understand which content is useful to readers.',
        'To show advertising on this website, as explained in the advertising section below.',
        'To meet legal, tax and accounting obligations.',
      ],
      paragraphs: ['We do not sell your personal information.'],
    },
    {
      heading: 'Cookies and similar technologies',
      paragraphs: [
        'Cookies are small text files stored on your device. We and our partners use cookies, local storage and similar technologies to keep you signed in, remember preferences (for example a dismissed pop-up), measure site usage and serve and measure advertising.',
        'You can block or delete cookies in your browser settings. If you block cookies, some parts of the website or the software (such as signing in) may not work correctly.',
      ],
    },
    {
      heading: 'Advertising and Google AdSense',
      paragraphs: [
        'This website uses Google AdSense, an advertising service provided by Google LLC, to display ads. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.',
        "Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet. Other third-party vendors or ad networks may also use cookies to serve ads on our site.",
        'You may opt out of personalised advertising by visiting Google Ads Settings. You can also opt out of some third-party vendors’ use of cookies for personalised advertising by visiting aboutads.info or, in Europe, youronlinechoices.eu. Where required by law (for example for visitors in the EEA, UK and Switzerland), we ask for your consent before personalised ads are shown.',
      ],
      links: [
        { label: 'Google Ads Settings', href: 'https://adssettings.google.com/' },
        { label: 'How Google uses information from sites that use its services', href: 'https://policies.google.com/technologies/partner-sites' },
        { label: 'Google advertising cookies', href: 'https://policies.google.com/technologies/ads' },
        { label: 'Digital Advertising Alliance opt-out (aboutads.info)', href: 'https://optout.aboutads.info/' },
        { label: 'Your Online Choices (EU)', href: 'https://www.youronlinechoices.eu/' },
      ],
    },
    {
      heading: 'Analytics and third-party services',
      paragraphs: ['We use trusted third-party services to run the website and the software. These providers process data on our behalf under their own privacy policies:'],
      items: [
        'Google Tag Manager and Google Analytics — website traffic measurement.',
        'Meta Pixel — measuring the performance of our Facebook and Instagram campaigns.',
        'Google Firebase — account sign-in, secure database hosting and file storage.',
        'Cloudflare — website hosting, security and content delivery.',
        'Tawk.to — the live chat widget on the website.',
        'Paddle — processing of online subscription payments. We do not store full card details.',
        'WhatsApp (Meta) and email providers — sending messages you request or that are needed for your account.',
      ],
    },
    {
      heading: 'How we share information',
      paragraphs: [
        'We share information only with the service providers listed above, when you ask us to (for example to connect an integration), to protect our rights and users’ safety, or when required by law. If Nexora is involved in a merger or sale of assets, information may be transferred as part of that transaction under the same protections.',
      ],
    },
    {
      heading: 'Data retention and security',
      paragraphs: [
        'We keep personal information only for as long as needed for the purposes above or as required by law. Account data is kept while your account is active and deleted or anonymised after closure unless we must keep it for legal or accounting reasons.',
        'We use encryption in transit (HTTPS), access controls and role-based permissions to protect data. No method of transmission or storage is 100% secure, but we work to protect your information and review our safeguards regularly.',
      ],
    },
    {
      heading: 'Your choices and rights',
      paragraphs: [
        'You can ask us to access, correct, export or delete your personal information, or to stop sending you marketing messages, by contacting us using the details below. Depending on where you live (for example under the GDPR or the CCPA), you may have additional rights, including the right to object to or restrict processing and to complain to a data protection authority.',
      ],
    },
    {
      heading: "Children's privacy",
      paragraphs: [
        'This website and the Nexora software are intended for businesses and are not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has given us personal information, please contact us and we will delete it.',
      ],
    },
    {
      heading: 'Links to other websites',
      paragraphs: [
        'Our pages and blog articles may link to other websites. We are not responsible for the content or privacy practices of those websites, and we encourage you to read their privacy policies.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page shows when it was last changed. Significant changes will be highlighted on this page.',
      ],
    },
    {
      heading: 'Contact us',
      paragraphs: [
        `For privacy questions or requests, contact Nexora Solution by email at ${LEGAL_CONTACT.email}, on WhatsApp/phone at ${LEGAL_CONTACT.phone}, or through the contact page on nexorasolution.online.`,
      ],
    },
  ],
}

export const termsOfService = {
  path: '/terms',
  title: 'Terms of Service',
  lastUpdated: 'October 14, 2026',
  intro:
    'These Terms of Service govern your use of the nexorasolution.online website and the Nexora software and services provided by Nexora Solution. By accessing the website or using the services, you agree to these terms. If you do not agree, please do not use the website or services.',
  sections: [
    {
      heading: 'Use of the website and services',
      items: [
        'Use the website and software only for lawful business purposes.',
        'Do not attempt to gain unauthorised access, disrupt the service, reverse-engineer the software or misuse any data provided by Nexora.',
        'Do not upload content that is illegal, infringes someone else’s rights or contains malware.',
      ],
    },
    {
      heading: 'Accounts',
      paragraphs: [
        'You are responsible for the accuracy of the information you provide, for keeping your login details secure and for all activity under your account, including activity by staff members you invite. Tell us promptly if you suspect unauthorised use.',
      ],
    },
    {
      heading: 'Who we are',
      paragraphs: [
        'The website and the Nexora software are operated by Nexora Solution, a business based in Multan, Punjab, Pakistan. You can reach us at the email address, phone number and WhatsApp number in the contact section below.',
      ],
    },
    {
      heading: 'Software subscriptions and services',
      paragraphs: [
        'Nexora is a cloud software product (POS, ERP and CRM) that you subscribe to online. Separately, Nexora Solution also offers custom software development and related services to clients under written agreements. Those services are quoted and invoiced individually and are not part of the online software subscription checkout.',
      ],
    },
    {
      heading: 'Subscriptions, trials and billing',
      paragraphs: [
        'Software plans, prices and trial periods are described on the pricing page and may change from time to time; changes do not affect a billing period you have already paid for.',
        'Free trial: you can start a free trial without a credit card. If you do not choose a paid plan when the trial ends, your workspace stops being available for paid features and you are not charged.',
        'Renewal and cancellation: paid plans renew automatically each billing period (monthly or yearly) until you cancel. You can cancel at any time before the next renewal date; your plan then stays active until the end of the period you have paid for and does not renew.',
        'Taxes: prices may exclude applicable taxes such as VAT or sales tax, which are shown at checkout where they apply.',
        'Business services, onboarding and custom development may have their own scope, pricing, activation and support terms agreed with the client in writing. Refunds are handled under our Refund Policy.',
      ],
    },
    {
      heading: 'Online payments and merchant of record',
      paragraphs: [
        'Where you pay for a subscription online by card or another online method, the payment is processed by a third-party payment provider, which may act as the merchant of record for that transaction. Its terms apply to the payment, its name may appear on your statement, and it handles payment, tax collection and payment-related support. Nexora does not store full card details.',
        'We may also accept local payment methods in Pakistan, such as bank transfer, JazzCash or Easypaisa, for customers there. Your plan is activated once the payment is confirmed.',
      ],
    },
    {
      heading: 'Your data',
      paragraphs: [
        'You keep ownership of the business data you enter into Nexora. You give us permission to host and process that data only to provide, secure and support the service. How we handle personal information is explained in our Privacy Policy.',
      ],
    },
    {
      heading: 'Website content and advertising',
      paragraphs: [
        'Articles, guides and other content on this website are provided for general information only and are not legal, tax or financial advice. The website may display third-party advertisements (including Google AdSense). Nexora does not endorse advertised products or services and is not responsible for third-party websites reached through ads or links.',
      ],
    },
    {
      heading: 'Intellectual property',
      paragraphs: [
        'All content, logos, designs and software on this website are owned by or licensed to Nexora Solution and are protected by law. You may not copy, republish or redistribute them without written permission, except for sharing links or short quotes with attribution.',
      ],
    },
    {
      heading: 'Availability and changes',
      paragraphs: [
        'We work to keep the service available and secure, but we do not guarantee uninterrupted or error-free operation. We may update, add or remove features, and we may update these terms; the "Last updated" date shows the latest version.',
      ],
    },
    {
      heading: 'Limitation of liability',
      paragraphs: [
        'Nexora is not responsible for indirect, incidental or consequential losses such as loss of profits or data, and our liability is limited to the extent permitted by applicable law.',
      ],
    },
    {
      heading: 'Termination',
      paragraphs: [
        'You may stop using the service at any time. We may suspend or close accounts that break these terms or put other users or the platform at risk. Where possible, we will give notice and a chance to export your data.',
      ],
    },
    {
      heading: 'Governing law',
      paragraphs: [
        'These terms are governed by the laws of Pakistan. Any dispute that cannot be settled by talking to us first falls under the courts of Pakistan, without limiting any mandatory consumer rights you have where you live.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        `For service, billing or account questions, contact Nexora Solution by email at ${LEGAL_CONTACT.email}, on WhatsApp/phone at ${LEGAL_CONTACT.phone}, or through the contact page.`,
      ],
    },
  ],
}

export const refundPolicy = {
  path: '/refund-policy',
  title: 'Refund Policy',
  lastUpdated: 'October 14, 2026',
  intro:
    'This page explains how Nexora Solution handles refunds for software subscriptions, and how refund requests are reviewed for business services, setup work and custom development.',
  sections: [
    {
      heading: 'Free trial',
      paragraphs: [
        'You can try Nexora free without a credit card. If you do not choose a paid plan, you are not charged, so there is nothing to refund.',
      ],
    },
    {
      heading: 'Software subscriptions',
      paragraphs: [
        'If you are not satisfied with a paid Nexora subscription, you can ask for a full refund within 14 days of the charge, whether it is your first payment or a renewal. Send the request to our support email or WhatsApp number with the email on your account. Approved refunds are returned to the original payment method, and they usually appear within 5 to 10 business days, depending on your bank or payment provider.',
        'After 14 days, charges for the current billing period are not refunded, but you can cancel at any time and your plan simply will not renew. Cancelling stops future charges and your plan stays active until the end of the period you paid for.',
      ],
    },
    {
      heading: 'How to cancel',
      paragraphs: [
        'You can cancel a subscription before its next renewal date by contacting us by email or WhatsApp, or from your account billing settings where that option is available. We confirm the cancellation and the date your plan ends.',
      ],
    },
    {
      heading: 'Online payments',
      paragraphs: [
        'If you paid online through our payment provider, which may act as the merchant of record, the refund is issued to the same card or method you used. For local payments, such as bank transfer, JazzCash or Easypaisa, refunds are returned to the account that sent the payment.',
      ],
    },
    {
      heading: 'Business services',
      paragraphs: [
        'Business services are quoted and invoiced separately from software subscriptions. Payments may include setup, staffing, consultation, managed support or custom work. Refund eligibility depends on whether work has started, scope has been approved or resources have been assigned.',
      ],
    },
    {
      heading: 'Custom development',
      paragraphs: [
        'Custom development, implementation, migration and one-time setup work may be non-refundable once approved work has started. Any exception will be reviewed case by case.',
      ],
    },
    {
      heading: 'How to request a review',
      paragraphs: [
        `Contact Nexora on WhatsApp (${LEGAL_CONTACT.phone}) or email (${LEGAL_CONTACT.email}) with your business name, payment details, service name and reason for review. Nexora will respond with next steps.`,
      ],
    },
  ],
}

export const cookiePolicy = {
  path: '/cookie-policy',
  title: 'Cookie Policy',
  lastUpdated: 'October 11, 2026',
  intro:
    'This page explains which cookies and similar technologies Nexora Solution uses on nexorasolution.online, why we use them and how you can control them. It sits alongside our Privacy Policy, which explains how we handle personal information more broadly.',
  glanceHeading: 'Cookies at a glance',
  glanceNote: 'This summary is for convenience. The full policy below is what applies.',
  glance: [
    { title: 'Some storage is essential', text: 'Signing in, security and remembering simple choices need cookies or local storage to work.' },
    { title: 'We measure site usage', text: 'We use Google Tag Manager to manage the measurement tags that help us see how the website is used.' },
    { title: 'Ads use cookies', text: 'This website uses Google AdSense, which uses cookies to show and measure ads. You can opt out of personalised ads.' },
    { title: 'You are in control', text: 'You can block or delete cookies in your browser at any time. Some features may then stop working.' },
  ],
  sections: [
    {
      heading: 'What cookies are',
      paragraphs: [
        'Cookies are small text files that a website stores on your device. Similar technologies, such as the local storage of your browser, work in a comparable way. They let a website recognise your device, remember your choices and measure how it is used.',
      ],
    },
    {
      heading: 'Essential cookies and local storage',
      paragraphs: [
        'We use cookies and browser storage that the website and the software need in order to work: keeping you signed in to your Nexora account, protecting the site from misuse and remembering simple choices, such as a pop-up you have dismissed. Without them, parts of the website or the software, such as signing in, may not work correctly.',
      ],
    },
    {
      heading: 'Free tools and your documents',
      paragraphs: [
        'Our free tools, such as the invoice, quotation and receipt generators, keep what you type in your own browser. That information stays on your device and is not sent to our servers by the tools. Clearing your browser data removes it.',
      ],
    },
    {
      heading: 'Measurement and analytics',
      paragraphs: [
        'We use Google Tag Manager to load and manage the measurement tags on this website. These tags help us understand which pages are visited and how the website performs, so we can improve it. Measurement providers may set their own cookies, which are governed by their own policies.',
      ],
    },
    {
      heading: 'Advertising and Google AdSense',
      paragraphs: [
        'This website uses Google AdSense, an advertising service provided by Google LLC. Google and other third-party vendors use cookies to serve and measure ads based on your visits to this website or other websites.',
        'You may opt out of personalised advertising by visiting Google Ads Settings. You can also opt out of some third-party vendors’ use of cookies for personalised advertising by visiting aboutads.info or, in Europe, youronlinechoices.eu. Where required by law (for example for visitors in the EEA, UK and Switzerland), we ask for your consent before personalised ads are shown.',
      ],
      links: [
        { label: 'Google Ads Settings', href: 'https://adssettings.google.com/' },
        { label: 'How Google uses cookies in advertising', href: 'https://policies.google.com/technologies/ads' },
        { label: 'Digital Advertising Alliance opt-out (aboutads.info)', href: 'https://optout.aboutads.info/' },
        { label: 'Your Online Choices (EU)', href: 'https://www.youronlinechoices.eu/' },
      ],
    },
    {
      heading: 'How to control cookies',
      paragraphs: [
        'Most browsers let you see, block or delete cookies in their settings. You can usually also browse in a private window, which clears cookies when you close it. Blocking all cookies may stop signing in and some other features from working.',
        'Cookies set by third parties, such as advertising providers, are controlled through the opt-out tools linked above and through your browser settings.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'We may update this policy when the cookies or services we use change. The date at the top shows when it was last updated.',
      ],
    },
    {
      heading: 'Contact us',
      paragraphs: [
        'If you have a question about cookies on this website, email info@nexorasolution.online or message us on WhatsApp at 03194329754.',
      ],
    },
  ],
  faqHeading: 'Cookie questions, answered',
  faqs: [
    { q: 'Does this website use cookies?', a: 'Yes. We use cookies and browser storage to keep you signed in, remember simple choices, measure site usage and show and measure ads.' },
    { q: 'Which cookies are essential?', a: 'Those that keep you signed in, protect the website and remember simple choices such as a dismissed pop-up. Parts of the software may not work without them.' },
    { q: 'Do the free tools send my documents to Nexora?', a: 'No. The free tools keep what you type in your own browser, on your device. Clearing your browser data removes it.' },
    { q: 'How do I opt out of personalised ads?', a: 'Use Google Ads Settings, or the aboutads.info and youronlinechoices.eu tools linked on this page. You can also block or delete cookies in your browser.' },
    { q: 'Where can I read about how you handle personal information?', a: 'In our Privacy Policy, which explains what we collect, how we use it, how long we keep it and your rights.' },
  ],
  related: [
    { label: 'Privacy Policy', to: '/privacy-policy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Contact', to: '/contact' },
  ],
}

export const LEGAL_PAGES = {
  [privacyPolicy.path]: privacyPolicy,
  [termsOfService.path]: termsOfService,
  [refundPolicy.path]: refundPolicy,
  [cookiePolicy.path]: cookiePolicy,
}
