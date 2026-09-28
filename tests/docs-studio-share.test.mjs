/**
 * Docs Studio sharing — the WhatsApp / email message, wa.me and mailto URL
 * encoding, phone numbers (E.164, calling codes), share links (no local
 * assets, size limit) and the share view decoder with its error screens.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { deflateSync, strToU8 } from 'fflate'

import { SHARE_LINK_MAX_LENGTH, calculateDocument, normalizeDocument } from '../src/tools/docs-studio/engine/index.js'
import { createSampleDocument } from '../src/tools/docs-studio/sample.js'
import {
  DEFAULT_MESSAGE_TEMPLATE, SHARE_VIEW_PATH, buildShareLink, documentForShareLink, emailSubject, hasLocalDesignAssets, joinPhone,
  mailtoUrl, messageContext, regionForLocale, renderShareMessage, splitPhone, toWhatsAppNumber, whatsappUrl,
} from '../src/tools/docs-studio/ui/share.js'
import { decodeShareView } from '../src/tools/docs-studio/ui/shareView.js'

const NOW = new Date(2026, 8, 27)
const ORIGIN = 'https://nexorasolution.online'
const sample = (overrides = {}) => normalizeDocument({ ...createSampleDocument(NOW), ...overrides })

test('message: the default text with client, type, number, total, business and link', () => {
  const doc = sample()
  const ctx = messageContext(doc, calculateDocument(doc), { link: `${ORIGIN}/tools/invoice/view/#1abc` })
  assert.equal(renderShareMessage(DEFAULT_MESSAGE_TEMPLATE, ctx),
    'Hi Maya Chen, please find invoice INV-2026-0001 for $7,538.40.\n\nView it online: https://nexorasolution.online/tools/invoice/view/#1abc\n\nThank you,\nNorthwind Studio')
  assert.equal(emailSubject(ctx), 'Invoice INV-2026-0001 from Northwind Studio')
})

test('message: no gaps when values are missing; custom templates keep unknown text', () => {
  const doc = sample({ client: { name: '' }, seller: { name: '' } })
  const ctx = messageContext(doc, calculateDocument(doc))
  assert.equal(renderShareMessage(DEFAULT_MESSAGE_TEMPLATE, ctx), 'Hi, please find invoice INV-2026-0001 for $7,538.40.\n\nThank you')
  const delivery = sample({ type: 'delivery_note', number: 'DN-7' })
  const dctx = messageContext(delivery, calculateDocument(delivery))
  assert.equal(dctx.total, '', 'delivery notes have no total')
  assert.ok(renderShareMessage(DEFAULT_MESSAGE_TEMPLATE, dctx).startsWith('Hi Maya Chen, please find delivery note DN-7.'))
  assert.equal(renderShareMessage('Salam {client} — {number} ({total}) {unknown}', messageContext(sample(), calculateDocument(sample()))), 'Salam Maya Chen — INV-2026-0001 ($7,538.40) {unknown}')
  assert.equal(renderShareMessage('', messageContext(sample(), calculateDocument(sample()))).split('\n')[0], 'Hi Maya Chen, please find invoice INV-2026-0001 for $7,538.40.', 'empty → default')
})

test('wa.me URLs: E.164 digits in the path, the whole text percent-encoded', () => {
  const text = 'Hi Maya & co, invoice #7 for $10 + tax\nThanks 🙏'
  assert.equal(whatsappUrl(text, '923001234567'), `https://wa.me/923001234567?text=${encodeURIComponent(text)}`)
  assert.equal(whatsappUrl('a b'), 'https://wa.me/?text=a%20b', 'no number → WhatsApp asks for the chat')
  const url = new URL(whatsappUrl(text, '15551234567'))
  assert.equal(url.searchParams.get('text'), text, 'round-trips exactly (& # + newline emoji)')
  assert.equal(url.pathname, '/15551234567')
})

test('phone numbers: E.164 for WhatsApp, calling-code split/join', () => {
  assert.equal(toWhatsAppNumber('+92 300 123-4567'), '923001234567')
  assert.equal(toWhatsAppNumber('0044 (20) 7946 0000'), '442079460000')
  assert.equal(toWhatsAppNumber('0300 1234567'), null, 'no country code')
  assert.equal(toWhatsAppNumber('+12'), null, 'too short')
  assert.equal(toWhatsAppNumber('+1 (415) 555-0142'), '14155550142')
  assert.equal(toWhatsAppNumber(''), null)
  assert.deepEqual(splitPhone('+44 20 7946 0000'), { region: 'GB', national: '20 7946 0000' })
  assert.deepEqual(splitPhone('+971501234567'), { region: 'AE', national: '501234567' })
  assert.deepEqual(splitPhone('+1 604 555 0100', 'CA'), { region: 'CA', national: '604 555 0100' }, 'shared +1: the preferred region')
  assert.deepEqual(splitPhone('+1 415 555 0142'), { region: 'US', national: '415 555 0142' })
  assert.deepEqual(splitPhone('0300 1234567'), { region: null, national: '0300 1234567' })
  assert.equal(joinPhone('PK', '0300 1234567'), '+92 300 1234567', 'trunk 0 dropped')
  assert.equal(joinPhone('GB', '+44 20 1'), '+44 20 1', 'already international')
  assert.equal(joinPhone('US', ''), '')
  assert.equal(regionForLocale('en-PK'), 'PK')
  assert.equal(regionForLocale('de'), 'DE')
})

test('mailto: address kept, subject and body encoded with CRLF line breaks', () => {
  const url = mailtoUrl('maya+billing@acme.example', 'Invoice INV-1 from A & B', 'Line one\nLine two?')
  assert.equal(url, 'mailto:maya%2Bbilling@acme.example?subject=Invoice%20INV-1%20from%20A%20%26%20B&body=Line%20one%0D%0ALine%20two%3F')
  assert.ok(mailtoUrl('not an email', 's', 'b').startsWith('mailto:?subject='), 'invalid address left out')
})

test('share links: logo and letterhead stripped, fits the limit, opens on the view page', async () => {
  const doc = sample({ seller: { ...sample().seller, logoAssetId: 'logo-1' }, appearance: { ...sample().appearance, letterhead: { imageAssetId: 'lh', pdfAssetId: 'lhp' } }, templateId: 'modern' })
  assert.equal(hasLocalDesignAssets(doc), true)
  assert.equal(hasLocalDesignAssets(sample()), false)
  const stripped = documentForShareLink(doc)
  assert.equal(stripped.seller.logoAssetId, '')
  assert.equal(stripped.appearance.letterhead, null)
  const link = await buildShareLink(doc, ORIGIN, { pureJs: true })
  assert.equal(link.ok, true)
  assert.ok(link.url.startsWith(`${ORIGIN}${SHARE_VIEW_PATH}#1`))
  assert.ok(link.length <= SHARE_LINK_MAX_LENGTH)
  const view = await decodeShareView(new URL(link.url).hash, { pureJs: true })
  assert.equal(view.ok, true)
  assert.equal(view.doc.number, 'INV-2026-0001')
  assert.equal(view.doc.templateId, 'modern')
  assert.equal(view.doc.seller.logoAssetId, '')
  assert.equal(view.doc.appearance.letterhead, null)
  assert.equal(calculateDocument(view.doc).total, calculateDocument(doc).total)
  assert.ok(Array.isArray(view.issues))
})

test('share links: an oversized document is refused with its length', async () => {
  const lines = Array.from({ length: 400 }, (_, i) => ({ id: `l${i}`, description: `Item ${i} ${Math.random().toString(36).repeat(8)}`, qty_milli: 1000, unitPrice_minor: 100 + i }))
  const link = await buildShareLink(sample({ lines }), ORIGIN, { pureJs: true })
  assert.equal(link.ok, false)
  assert.equal(link.code, 'share_link_too_long')
  assert.ok(link.length > SHARE_LINK_MAX_LENGTH)
})

const base64Url = (bytes) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

test('share view: friendly errors for empty, broken, oversized and future links', async () => {
  assert.deepEqual(await decodeShareView(''), { ok: false, reason: 'empty' })
  assert.deepEqual(await decodeShareView('#'), { ok: false, reason: 'empty' })
  assert.equal((await decodeShareView('#1not-valid-deflate', { pureJs: true })).reason, 'broken')
  assert.equal((await decodeShareView('#hello', { pureJs: true })).reason, 'broken', 'garbage is broken, not "future"')
  assert.equal((await decodeShareView(`#1${'A'.repeat(SHARE_LINK_MAX_LENGTH)}`, { pureJs: true })).reason, 'too-large')
  // A newer schema version inside a valid payload.
  const future = `1${base64Url(deflateSync(strToU8(JSON.stringify({ ...sample(), schemaVersion: 99 }))))}`
  assert.equal((await decodeShareView(`#${future}`, { pureJs: true })).reason, 'future')
  // A newer link format letter on a well-formed payload.
  assert.equal((await decodeShareView(`#2${future.slice(1)}`, { pureJs: true })).reason, 'future')
  // Valid JSON that is not a document.
  const notDoc = `1${base64Url(deflateSync(strToU8(JSON.stringify(['x']))))}`
  assert.equal((await decodeShareView(`#${notDoc}`, { pureJs: true })).reason, 'broken')
})

test('share view: untrusted fields are normalized (no asset ids, unknown template → Classic, bad colour → default)', async () => {
  const hostile = { ...sample(), templateId: '../../evil', seller: { ...sample().seller, logoAssetId: 'x' }, appearance: { accentColor: 'red;background:url(x)', letterhead: { imageAssetId: 'y' } }, __proto__: { polluted: true } }
  const payload = `1${base64Url(deflateSync(strToU8(JSON.stringify(hostile))))}`
  const view = await decodeShareView(`#${payload}`, { pureJs: true })
  assert.equal(view.ok, true)
  assert.equal(view.doc.seller.logoAssetId, '')
  assert.equal(view.doc.appearance.letterhead, null)
  assert.equal(view.doc.appearance.accentColor, '#0071e3')
  assert.equal({}.polluted, undefined)
})
