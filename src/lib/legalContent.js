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

export const privacyPolicy = {
  path: '/privacy-policy',
  title: 'Privacy Policy',
  lastUpdated: 'September 24, 2026',
  intro:
    'This Privacy Policy explains how Nexora Solution ("Nexora", "we", "us") collects, uses, shares and protects information when you visit nexorasolution.online, read our blog, contact us, or use the Nexora business software and services. By using this website you agree to the practices described here.',
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
  lastUpdated: 'September 24, 2026',
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
      heading: 'Subscriptions, trials and payments',
      paragraphs: [
        'Software plans, prices and trial periods are described on the pricing page and may change from time to time; changes do not affect a billing period you have already paid for. Business services, onboarding and custom development may have their own scope, pricing, activation and support terms agreed with the client in writing. Refunds are handled under our Refund Policy.',
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
  lastUpdated: 'September 24, 2026',
  intro:
    'This page explains how Nexora Solution reviews refund requests for software subscriptions, business services, setup work and custom development.',
  sections: [
    {
      heading: 'Software subscriptions',
      paragraphs: [
        'Nexora subscriptions are reviewed based on the plan, activation status, billing cycle and support already delivered. If a refund is applicable, Nexora will confirm the approved amount and timeline after review.',
      ],
    },
    {
      heading: 'Business services',
      paragraphs: [
        'Business service payments may include setup, staffing, consultation, managed support or custom work. Refund eligibility depends on whether work has started, scope has been approved or resources have been assigned.',
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

export const LEGAL_PAGES = {
  [privacyPolicy.path]: privacyPolicy,
  [termsOfService.path]: termsOfService,
  [refundPolicy.path]: refundPolicy,
}
