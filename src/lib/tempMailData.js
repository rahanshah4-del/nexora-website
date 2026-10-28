/**
 * Copy, SEO and schema for the free temp-mail tool (/tools/temp-mail/).
 * Own launch switch (src/lib/tempMailLaunch.js), like GeoLint: noindex and unlinked while
 * TEMP_MAIL_LAUNCHED is false. Pure data, so prerender.mjs (Node)
 * and the page (Vite) read the same source.
 */
import { absoluteUrl, createFAQPageSchema, createWebApplicationSchema } from './seoStructuredData.js'

import { TEMP_MAIL_LAUNCHED, TEMP_MAIL_PATH } from './tempMailLaunch.js'

export { TEMP_MAIL_LAUNCHED, TEMP_MAIL_PATH }

export const TEMP_MAIL_SEO = {
  title: 'Temp Mail: Free Temporary Email Address Generator | Nexora',
  description: 'Free temp mail and disposable email address generator. Get a temporary email in one click, read OTP codes live and test signups. No signup, auto-erased.',
  keywords: 'temp mail, temporary email, temp mail generator, temporary email generator, temporary email address, disposable email address, disposable email generator, free temporary email, free disposable email, temp mail for developers, temporary email for testing, test signup flow, email verification testing, OTP test email, free temporary email no signup',
}

export const TEMP_MAIL_CONTENT = {
  eyebrow: 'Free tool · No signup · Built for testers too',
  h1: 'Free Temp Mail: Temporary Email Address for Signups, OTP and Testing',
  lead: 'Get a throwaway inbox in one click and watch real mail arrive live. Developers and QA use it to test signup, OTP, email-verification and password-reset flows on a real address, and everyone else uses it to keep spam out of their own inbox.',
  badges: ['No signup', 'OTP detected for you', 'Real delivery', 'Auto-erased', 'Receive only'],
  intro: {
    heading: 'What is a temporary email address?',
    paragraphs: [
      'A temporary (or disposable) email address is a real, working inbox that exists for a short time and then deletes itself. It accepts mail like any other address, but it is not tied to your name, your phone number or an account, so nothing about you ends up on a mailing list.',
      'That makes it useful in two very different ways. For everyday users it is a shield: use it once to get a code or a download, then let it vanish. For people who build websites it is a test tool: you get a clean, never-used address on demand, and you see exactly what your app sends, exactly when it arrives.',
      'Nexora Temp Mail runs on our own mail domain and our own infrastructure. Mail is received by a server we operate, shown sanitised in your browser, and erased when the address expires.',
    ],
  },
  devSection: {
    eyebrow: 'For developers, QA and website owners',
    heading: 'Test your signup and email flows on a real address',
    lead: 'Mock mail servers show you what your app tried to send. A temporary inbox shows you what actually arrived: through real DNS, a real mail path, and a real inbox. That is the part that breaks in production, and the part users judge you on.',
    steps: [
      { title: 'Generate a fresh address', text: 'Every test starts clean. No old mail, no codes from earlier runs, no shared inbox where one test reads another test\'s message. Press New address to rotate whenever you need a blank slate.' },
      { title: 'Submit it in your signup form', text: 'Paste the address into your registration, invite or newsletter form. Use a plain, unique address per test run so duplicate-account rules do not get in the way.' },
      { title: 'Watch the mail land', text: 'The inbox checks for new mail every second for the first two minutes after you act, so you can see how long your provider really takes. A sound and a tab-title alert tell you when it arrives.' },
      { title: 'Check the content', text: 'Open the message and check the sender name, subject, links, formatting and unsubscribe text. Remote images and scripts are blocked in the preview, so check images in a real mail client too.' },
      { title: 'Copy the code and finish the flow', text: 'One-time codes are detected and shown above the message with a copy button. Click the verification link or enter the code and confirm your app marks the account as verified.' },
      { title: 'Try the unhappy paths', text: 'Request a second code, enter a wrong one, let a code expire, and use the same address twice. The mistakes real users make are the bugs you want to find before launch.' },
    ],
    scenarios: [
      { title: 'Signup and email verification', text: 'Confirm the confirmation email is sent, arrives quickly, links to the right environment and activates the account.' },
      { title: 'OTP and one-time codes', text: 'Check the code is present, readable, the right length and not already expired. The tool picks out numeric and alphanumeric codes, including spaced and grouped ones.' },
      { title: 'Password reset', text: 'Verify the reset email arrives, the link works once, and an old link stops working after a new request.' },
      { title: 'Welcome and onboarding sequence', text: 'Walk through the first emails a new user receives and check their order, timing and wording.' },
      { title: 'Notifications and receipts', text: 'See order confirmations, alerts and invoices exactly as a customer would receive them, including attachments up to 1 MB each.' },
      { title: 'Invitations and multi-user flows', text: 'Open several tabs, each with its own address, to test team invites or shared-access flows without making real mailboxes.' },
      { title: 'Spam-folder and deliverability smoke test', text: 'If a message never shows up, that is an early warning that your sender domain, SPF or DKIM setup needs attention. This is a quick check, not a full deliverability audit.' },
      { title: 'Disposable-email blocking', text: 'Check that your own signup form rejects throwaway addresses the way you intend, and that the error message is clear.' },
    ],
    compare: {
      heading: 'Temp mail or a local mail catcher?',
      lead: 'They answer different questions. Good teams use both.',
      columns: ['', 'Temporary inbox (this tool)', 'Local mail catcher (Mailpit, MailHog and similar)'],
      rows: [
        ['What it proves', 'Mail was really delivered over the internet and reached an inbox', 'Your app built and attempted to send the message'],
        ['Real DNS, SPF and DKIM involved', 'Yes', 'No'],
        ['Setup', 'None. Open the page', 'Run and configure a local server'],
        ['Best for', 'Staging checks, manual QA, demos, quick debugging', 'Unit and integration tests, offline development, CI'],
        ['Inbox privacy', 'Public by address; erased after expiry', 'Private to your machine or network'],
      ],
    },
    practices: [
      'Use dummy data. Never send real customer data, passwords or production secrets to a temporary inbox.',
      'Use a new address per test run so earlier mail cannot be mistaken for a fresh message.',
      'Label your environments (staging or production) in the email subject or footer so you can tell which one sent a message.',
      'Do not use a temporary address for admin, billing or API-key accounts. It expires, and anyone who knows the address can read its mail.',
      'Allow for delivery time. Mail is usually near-instant, but providers can take several seconds, so wait before declaring a bug.',
      'Pair real-delivery checks with a local mail catcher in CI. Use this tool for the final, human look.',
    ],
    limitsNote: 'To be clear about what this tool is: a free web inbox for manual and exploratory testing. It has no public API, webhooks or custom domains, so it is not a replacement for an automated email-testing service in a CI pipeline. If you need those, pair it with a local mail catcher as described above.',
  },
  steps: [
    { title: 'Get an address', text: 'One is created for you instantly. Prefer your own name? Press Customize and pick it.' },
    { title: 'Use it anywhere', text: 'Copy it and enter it on the site that needs an email. New mail appears here by itself, with a sound and a tab-title alert if you are elsewhere.' },
    { title: 'Grab the code', text: 'Verification codes are detected and can be copied in one click. Need more time? Add one extra hour from the timer.' },
  ],
  useCases: [
    { title: 'Verification codes (OTP)', text: 'Paste the temporary address where a site wants email confirmation. The code is detected and shown with a one-click copy button the moment the mail arrives.' },
    { title: 'Free trials and downloads', text: 'Try a service or grab a download without handing your real address to a mailing list.' },
    { title: 'Testing your own website or app', text: 'Check signup, password-reset and notification emails on a real address, without creating a mailbox for every test.' },
    { title: 'Keeping spam away', text: 'When a form insists on an email, a temporary address keeps newsletters and promotions out of your real inbox.' },
    { title: 'Demos and screenshots', text: 'Record a product demo or a tutorial using a throwaway address instead of exposing your personal one.' },
    { title: 'One-off account checks', text: 'Quickly see how a site treats a brand-new user without touching your real accounts.' },
  ],
  features: [
    { title: 'Instant', text: 'An inbox is ready the moment the page loads.' },
    { title: 'Live', text: 'New mail is checked every second while you are waiting for it, then more gently.' },
    { title: 'Code finder', text: 'Numeric, spaced and alphanumeric one-time codes are detected and copyable.' },
    { title: 'Alerts', text: 'A sound and a tab title alert, plus optional push notifications and install-as-app on supported browsers.' },
    { title: 'Safe preview', text: 'Scripts and remote images are stripped, so opening mail does not tell the sender you did.' },
    { title: 'Custom names', text: 'Pick a readable address, or keep the random one that is harder to guess.' },
  ],
  privacy: [
    'No account, no password, no personal details.',
    'An address lasts one hour, and you can add one extra hour once (two hours in total). When it expires, the inbox closes and its mail is erased automatically.',
    'Mail is shown sanitised: scripts and remote images are removed, so opening a message does not tell the sender you did.',
    'Attachments up to 1 MB each can be downloaded. Programs, scripts and HTML files are never kept.',
    'Receive only: temporary addresses cannot send mail.',
    'We store a salted, hashed form of your IP address for abuse protection, not the address itself.',
  ],
  limits: 'Anyone who knows an exact address can read its inbox while it exists, so never use a temporary address for banking, an account you want to keep, or password recovery of anything important. Some sites block disposable domains.',
  faqs: [
    { question: 'What is a temp mail generator?', answer: 'A temp mail generator creates a working email address on demand, so you do not have to invent one. Open this page and an address is ready at once. Copy it, use it, and it deletes itself when the timer ends.' },
    { question: 'What is a disposable email address?', answer: 'It is a short-lived inbox you use once and throw away. It receives mail like a normal address, but it is not linked to your name or phone number, and its mail is erased when it expires.' },
    { question: 'Is temp mail the same as a temporary email address?', answer: 'Yes. Temp mail, temporary email and disposable email all mean the same thing: a free inbox that exists for a short time and then deletes itself.' },
    { question: 'Can I get a temporary Gmail address?', answer: 'No. Gmail addresses come only from Google. A temporary inbox gives you an address on our own mail domain instead, and it works for most signups that only need an email to send a code or link.' },
    { question: 'Is this temporary email really free?', answer: 'Yes. There is no signup and no payment. Nexora offers it as a free tool.' },
    { question: 'What is a temporary email used for?', answer: 'Mostly for receiving a verification code or link without giving out your real address, for avoiding promotional mail after a free trial or download, and for testing how a website behaves for a brand-new user.' },
    { question: 'How long does a temporary email address last?', answer: 'One hour. A timer shows what is left, and you can add one extra hour, one time, for two hours in total. After that the inbox closes and its mail is erased.' },
    { question: 'Can developers use it to test a signup flow?', answer: 'Yes. Create an address, submit it in your registration form, and watch the verification email arrive on a real inbox. It is well suited to manual and exploratory testing of signup, OTP and password-reset emails. It has no API, so it is not meant for automated pipelines.' },
    { question: 'Does it work for testing OTP and email verification codes?', answer: 'Yes. One-time codes in the subject or body are detected and shown above the message with a copy button, including codes with spaces or letters. Always glance at the original message too, since a template can contain more than one number.' },
    { question: 'How is it different from Mailpit, MailHog or a staging mail catcher?', answer: 'A local mail catcher shows what your app tried to send and never leaves your network. A temporary inbox receives mail that really travelled over the internet, so it also tests your sending domain and delivery. They complement each other.' },
    { question: 'Can I use it in automated tests or CI?', answer: 'Not at the moment. It is a web tool without a public API, webhooks or custom domains. For automated suites, a local mail catcher is the better fit, and this tool is handy for the final manual check.' },
    { question: 'Can I choose my own address?', answer: 'Yes. Press Customize, type a name of 3 to 32 characters and create it. If the name is taken or reserved you will be asked to pick another. Random addresses are harder to guess, so use those for anything sensitive.' },
    { question: 'Can I get a verification code without using my phone number?', answer: 'If the site sends the code by email, yes: use the temporary address and the code appears in the inbox, ready to copy. Services that only accept SMS cannot be used this way.' },
    { question: 'Why did a website refuse my temporary address?', answer: 'Many sites and apps block known disposable domains to stop fake signups and free-trial abuse. Use a different address for those sites, such as your regular email. If you run a site, a block like this is also something you can test here.' },
    { question: 'Is a temporary email the same as an alias or forwarding address?', answer: 'No. An alias forwards mail to your real inbox for as long as you keep it. A temporary inbox is separate, short-lived and deletes itself, so nothing is linked back to you.' },
    { question: 'Why did my verification email not arrive?', answer: 'Wait a few seconds first, since providers sometimes queue mail. Check the address for typos, make sure the address has not expired, and check that the site does not block disposable domains. If you are testing your own app, check your sending logs, SPF and DKIM.' },
    { question: 'Can I open attachments?', answer: 'Yes, files up to 1 MB each can be downloaded as a plain file. Programs, scripts and HTML files are never kept. Only open files you expect and scan them first.' },
    { question: 'Can I send email from a temporary address?', answer: 'No. Temporary addresses are receive-only.' },
    { question: 'Are my messages private?', answer: 'Anyone who knows the exact address can read its inbox while it exists, so never use it for anything sensitive. Random addresses are hard to guess, and the inbox is erased when the address expires.' },
    { question: 'Is it safe to use temp mail for testing with real customer data?', answer: 'No. Use dummy data only. A temporary inbox is public to anyone who knows the address, so real personal data, passwords or production secrets should never be sent to it.' },
    { question: 'Can I get notified when mail arrives?', answer: 'Yes. You get a sound and a tab-title alert while the page is open. On supported browsers you can also turn on push alerts or install the tool as an app.' },
    { question: 'How do I report spam or abuse?', answer: 'Open the message and use Report. Reports help us block senders that abuse the service.' },
  ],
}

export function tempMailPageSchemas() {
  return [
    createWebApplicationSchema({
      name: 'Nexora Temp Mail',
      path: TEMP_MAIL_PATH,
      description: TEMP_MAIL_SEO.description,
      operatingSystem: 'Any (web browser)',
    }),
    createFAQPageSchema({ path: TEMP_MAIL_PATH, items: TEMP_MAIL_CONTENT.faqs }),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${absoluteUrl(TEMP_MAIL_PATH)}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Free Tools', item: absoluteUrl('/tools') },
        { '@type': 'ListItem', position: 3, name: 'Temp Mail', item: absoluteUrl(TEMP_MAIL_PATH) },
      ],
    },
  ].filter(Boolean)
}
