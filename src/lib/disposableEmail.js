/**
 * Signup-form check for disposable / temporary email domains (instant message in
 * the form). The email Worker enforces the same list on the server.
 * Nexora's own temp-mail domain is blocked too, once that tool is launched
 * (so the owner can still test the signup flow with it before launch).
 */
import { isDisposableAddress } from './disposableDomains.js'
import { TEMP_MAIL_LAUNCHED } from './tempMailLaunch.js'

export const isDisposableEmail = (email) => isDisposableAddress(email, { includeOwn: TEMP_MAIL_LAUNCHED })

export const DISPOSABLE_EMAIL_MESSAGE = 'Temporary email addresses are not allowed. Please use your real email.'
