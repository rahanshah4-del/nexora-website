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
  description: 'Free temporary email in one click. Receive verification codes and links with no signup or phone number. Messages delete themselves after an hour.',
  keywords: 'free temporary email, temp mail for verification code, temporary email no signup, disposable email for OTP, private temp mail',
}

export const TEMP_MAIL_CONTENT = {
  eyebrow: 'Free tool · No signup',
  h1: 'Free Temporary Email, No Signup',
  lead: 'Get a throwaway address in one click and read what arrives right here. Use it for verification codes, free-trial signups and any site you do not trust with your real inbox. Mail and address are deleted automatically after an hour.',
  useCases: [
    { title: 'Verification codes (OTP)', text: 'Sign up somewhere that wants an email confirmation, paste the temporary address, and the code or link shows up in the inbox below within seconds.' },
    { title: 'Free trials and downloads', text: 'Try a service or grab a download without handing your real address to a mailing list.' },
    { title: 'Testing your own app', text: 'Developers and QA can check signup, password-reset and notification emails without creating a mailbox for every test.' },
    { title: 'Keeping spam away', text: 'When a form insists on an email, a temporary address keeps newsletters and promotions out of your real inbox.' },
  ],
  steps: [
    'Press "New address" (or keep the one generated for you).',
    'Copy it and use it on the site that needs an email.',
    'Wait a few seconds: new mail appears automatically, no refresh needed.',
    'Open the message, copy the code or click the link. Everything is deleted after an hour.',
  ],
  privacy: [
    'No account, no password, no personal details.',
    'Messages are kept for one hour, then deleted. You can delete an inbox sooner with one click.',
    'Mail is shown as plain, sanitised content: scripts and remote images are removed, so opening a message does not tell the sender you did.',
    'Attachments are not supported.',
  ],
  limits: 'Temporary addresses can only receive mail, not send it. Some sites block disposable domains, and you should never use a temporary address for banking, an account you want to keep, or password recovery of anything important.',
  faqs: [
    { question: 'Is this temporary email really free?', answer: 'Yes. There is no signup and no payment. Nexora offers it as a free tool.' },
    { question: 'How long does a temporary email address last?', answer: 'Messages are deleted one hour after they arrive, and an address stops being useful after that. Press "New address" any time for a fresh one.' },
    { question: 'Can I get a verification code without using my phone number?', answer: 'If the site sends the code by email, yes: use the temporary address and the code appears in the inbox. Services that only accept SMS cannot be used this way.' },
    { question: 'Can I send email from a temporary address?', answer: 'No. Temporary addresses are receive-only.' },
    { question: 'Why did a website refuse my temporary address?', answer: 'Some sites block known disposable domains. Use a different address for those sites, such as your regular email.' },
    { question: 'Are my messages private?', answer: 'Anyone who knows the exact address can read its inbox while it exists, so never use it for anything sensitive. Addresses are random and hard to guess, and messages expire after an hour.' },
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
