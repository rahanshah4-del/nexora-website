/** Locales offered in the locale picker (formatting of numbers and dates only). */

export const COMMON_LOCALES = Object.freeze([
  'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ', 'en-IE', 'en-IN', 'en-PK', 'en-AE', 'en-SG', 'en-ZA', 'en-NG', 'en-KE', 'en-PH',
  'fr-FR', 'fr-CA', 'fr-CH', 'de-DE', 'de-AT', 'de-CH', 'es-ES', 'es-MX', 'es-AR', 'pt-BR', 'pt-PT', 'it-IT', 'nl-NL', 'sv-SE',
  'nb-NO', 'da-DK', 'fi-FI', 'pl-PL', 'cs-CZ', 'tr-TR', 'ru-RU', 'uk-UA', 'ar-AE', 'ar-SA', 'ar-EG', 'he-IL', 'ur-PK', 'hi-IN',
  'bn-BD', 'id-ID', 'ms-MY', 'th-TH', 'vi-VN', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW',
])

let displayNames = null

/** "en-GB" → "English (United Kingdom)". */
export function localeLabel(code) {
  try {
    displayNames = displayNames || new Intl.DisplayNames(['en'], { type: 'language' })
    return displayNames.of(code) || code
  } catch {
    return code
  }
}
