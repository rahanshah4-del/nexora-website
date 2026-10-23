/**
 * Disposable / temporary email domains that cannot be used to sign up on Nexora.
 * Client-side friendly check (instant message in the form); it keeps honest
 * misuse of free trials down but is not a hard server-side guarantee.
 * Nexora's own temp-mail domain is blocked too, once that tool is launched
 * (so the owner can still test the signup flow with it before launch).
 */
import { TEMP_MAIL_LAUNCHED } from './tempMailData.js'

export const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz', 'guerrillamail.de', 'grr.la', 'sharklasers.com',
  'guerrillamailblock.com', 'pokemail.net', 'spam4.me', '10minutemail.com', '10minutemail.net', '10minutemail.co.uk', '20minutemail.com', '20minutemail.it',
  'temp-mail.org', 'temp-mail.io', 'temp-mail.ru', 'tempmail.com', 'tempmail.net', 'tempmail.dev', 'tempmail.email', 'temp-mail.com', 'tempmailo.com', 'tempail.com',
  'tempinbox.com', 'tempr.email', 'throwawaymail.com', 'throwaway.email', 'trashmail.com', 'trashmail.net', 'trashmail.de', 'trash-mail.com', 'wegwerfmail.de',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
  'getnada.com', 'nada.email', 'nada.ltd', 'dispostable.com', 'maildrop.cc', 'mailnesia.com', 'mailcatch.com', 'mailtemp.info', 'mintemail.com', 'mytemp.email',
  'fakeinbox.com', 'fakemail.net', 'fakemailgenerator.com', 'emailondeck.com', 'getairmail.com', 'airmail.cc', 'burnermail.io', 'anonbox.net', 'anonymbox.com',
  'spamgourmet.com', 'spambox.us', 'spamex.com', 'spamfree24.org', 'incognitomail.com', 'mailforspam.com', 'moakt.com', 'moakt.cc', 'tmpmail.org', 'tmpmail.net',
  'tmail.ws', 'tmails.net', 'emailfake.com', 'email-fake.com', 'crazymailing.com', 'inboxkitten.com', 'mohmal.com', 'mail.tm', 'mail.gw', 'internxt.com',
  'dropmail.me', 'minuteinbox.com', 'luxusmail.org', 'harakirimail.com', 'mailpoof.com', 'disposablemail.com', 'discard.email', 'discardmail.com', 'drdrb.net',
  'byom.de', 'tempmailaddress.com', 'temporary-mail.net', 'tempsky.com', '33mail.com', 'linshiyouxiang.net', 'einrot.com', 'cuvox.de', 'armyspy.com', 'dayrep.com',
  'rhyta.com', 'superrito.com', 'teleworm.us', 'jourrapide.com', 'gustr.com', 'fleckens.hu', 'mailsac.com', 'emltmp.com', 'trbvm.com', 'vomoto.com', 'mvrht.net',
  'tempmailer.com', 'tmpeml.com', 'fexbox.org', 'fexpost.com', 'fextemp.com', 'mailbox.in.ua', 'zeroe.ml', 'nwytg.net', 'gmailnator.com', 'emailnator.com',
]

const OWN_TEMP_MAIL_DOMAINS = ['mail.nexorasolution.us']

function blockedSet() {
  return new Set([...DISPOSABLE_EMAIL_DOMAINS, ...(TEMP_MAIL_LAUNCHED ? OWN_TEMP_MAIL_DOMAINS : [])])
}

/** True when the address is on a known disposable domain (or a subdomain of one). */
export function isDisposableEmail(email) {
  const text = String(email ?? '').trim().toLowerCase()
  const at = text.lastIndexOf('@')
  if (at < 1) return false
  const parts = text.slice(at + 1).replace(/\.$/, '').split('.')
  const set = blockedSet()
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (set.has(parts.slice(i).join('.'))) return true
  }
  return false
}

export const DISPOSABLE_EMAIL_MESSAGE = 'Temporary email addresses are not allowed. Please use your real email.'
