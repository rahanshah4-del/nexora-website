/**
 * Copy, SEO and schema for the free temp-mail tool (/tools/temp-mail/).
 * Own launch switch, like GeoLint: noindex and unlinked until TEMP_MAIL_LAUNCHED
 * is true (flip it after AdSense approval). Pure data, so prerender.mjs (Node)
 * and the page (Vite) read the same source.
 */
import { absoluteUrl, createFAQPageSchema, createWebApplicationSchema } from './seoStructuredData.js'

export const TEMP_MAIL_LAUNCHED = false
export const TEMP_MAIL_PATH = '/tools/temp-mail'

export const TEMP_MAIL_SEO = {
  title: 'Free Temporary Email, No Signup | Nexora Temp Mail',
  description: 'Free temporary email in one click. Receive verification codes and links with no signup or phone number. Inboxes erase themselves automatically.',
  keywords: 'free temporary email, temp mail for verification code, temporary email no signup, disposable email for OTP, private temp mail',
}

export const TEMP_MAIL_CONTENT = {
  eyebrow: 'Free tool · No signup',
  h1: 'Free Temporary Email, No Signup',
  lead: 'Get a throwaway address in one click and read what arrives right here. Use it for verification codes, free-trial signups and any site you do not trust with your real inbox.',
  badges: ['No signup', 'Codes detected for you', 'Auto-erased', 'Receive only'],
  useCases: [
    { title: 'Verification codes (OTP)', text: 'Paste the temporary address where a site wants email confirmation. The code is detected and shown with a one-click copy button the moment the mail arrives.' },
    { title: 'Free trials and downloads', text: 'Try a service or grab a download without handing your real address to a mailing list.' },
    { title: 'Testing your own app', text: 'Developers and QA can check signup, password-reset and notification emails, including attachments, without creating a mailbox for every test.' },
    { title: 'Keeping spam away', text: 'When a form insists on an email, a temporary address keeps newsletters and promotions out of your real inbox.' },
  ],
  steps: [
    { title: 'Get an address', text: 'One is created for you instantly. Prefer your own name? Press Customize and pick it.' },
    { title: 'Use it anywhere', text: 'Copy it and enter it on the site that needs an email. New mail appears here by itself, with a sound and a tab-title alert if you are elsewhere.' },
    { title: 'Grab the code', text: 'Verification codes are detected and can be copied in one click. Need more time? Add one extra hour from the timer.' },
  ],
  privacy: [
    'No account, no password, no personal details.',
    'An address lasts one hour, and you can add one extra hour once. When it expires, the inbox closes and its mail is erased automatically.',
    'Mail is shown sanitised: scripts and remote images are removed, so opening a message does not tell the sender you did.',
    'Attachments up to 1 MB each can be downloaded. Programs, scripts and HTML files are never kept.',
    'Receive only: temporary addresses cannot send mail.',
  ],
  limits: 'Anyone who knows an exact address can read its inbox while it exists, so never use a temporary address for banking, an account you want to keep, or password recovery of anything important. Some sites block disposable domains.',
  faqs: [
    { question: 'Is this temporary email really free?', answer: 'Yes. There is no signup and no payment. Nexora offers it as a free tool.' },
    { question: 'How long does a temporary email address last?', answer: 'One hour. A timer shows what is left, and you can add one extra hour, one time, for two hours in total. After that the inbox closes and its mail is erased.' },
    { question: 'Can I choose my own address?', answer: 'Yes. Press Customize, type a name of 3 to 32 characters and create it. If the name is taken or reserved you will be asked to pick another. Random addresses are harder to guess, so use those for anything sensitive.' },
    { question: 'Can I get a verification code without using my phone number?', answer: 'If the site sends the code by email, yes: use the temporary address and the code appears in the inbox, ready to copy. Services that only accept SMS cannot be used this way.' },
    { question: 'Can I open attachments?', answer: 'Yes, files up to 1 MB each can be downloaded as a plain file. Programs, scripts and HTML files are never kept. Only open files you expect and scan them first.' },
    { question: 'Can I send email from a temporary address?', answer: 'No. Temporary addresses are receive-only.' },
    { question: 'Why did a website refuse my temporary address?', answer: 'Some sites block known disposable domains. Use a different address for those sites, such as your regular email.' },
    { question: 'Are my messages private?', answer: 'Anyone who knows the exact address can read its inbox while it exists, so never use it for anything sensitive. Random addresses are hard to guess, and the inbox is erased when the address expires.' },
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
