/**
 * Docs Studio storage — repository on IndexedDB (Dexie over fake-indexeddb)
 * and on the in-memory fallback: documents, counters, clients, products,
 * assets, backup export/import, clear-all.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { createDocument, serializeDocument } from '../src/tools/docs-studio/engine/index.js'
import { createMemoryBackend, openIndexedDbBackend, openStorageBackend } from '../src/tools/docs-studio/storage/backends.js'
import { BACKUP_FORMAT, MAX_ASSET_BYTES, SETTING_KEYS, createRepository } from '../src/tools/docs-studio/storage/repository.js'

const NOW = new Date(2026, 8, 27)
let dbCounter = 0

function clock(start = 1_000) {
  let t = start
  return () => (t += 1000)
}

function ids(prefix = 'id') {
  let n = 0
  return () => `${prefix}-${++n}`
}

function invoice(overrides = {}) {
  const doc = createDocument('invoice', { id: overrides.id || 'inv-1', now: NOW, currency: 'USD' })
  return {
    ...doc,
    number: 'INV-2026-0001',
    seller: { ...doc.seller, name: 'Northwind Studio' },
    client: { ...doc.client, name: 'Maya Chen', company: 'Acme' },
    taxes: [{ id: 't', name: 'VAT', rate_micro: 100000, compound: false, withholding: false }],
    lines: [{ id: 'l1', description: 'Design', sku: '', unit: '', qty_milli: 2000, unitPrice_minor: 5000, discount: null, taxIds: ['t'] }],
    ...overrides,
  }
}

const png = (bytes = [137, 80, 78, 71]) => new Blob([new Uint8Array(bytes)], { type: 'image/png' })

const backends = {
  indexeddb: () => openIndexedDbBackend(`docs-studio-test-${++dbCounter}`),
  memory: async () => createMemoryBackend(),
}

for (const [kind, open] of Object.entries(backends)) {
  const makeRepo = async () => createRepository(await open(), { now: clock(), idFactory: ids(kind) })

  test(`[${kind}] settings round-trip`, async () => {
    const repo = await makeRepo()
    assert.equal(repo.kind, kind)
    assert.equal(await repo.getSetting('missing', 'fallback'), 'fallback')
    await repo.setSetting(SETTING_KEYS.preferences, { currency: 'EUR' })
    const prefs = await repo.getSetting(SETTING_KEYS.preferences)
    assert.equal(prefs.currency, 'EUR')
    assert.equal(prefs.paperSize, 'A4', 'known settings are stored normalized')
    await repo.setSetting('scratch', { any: 'value' })
    assert.deepEqual(await repo.getSetting('scratch'), { any: 'value' }, 'unknown keys are stored as given')
  })

  test(`[${kind}] documents store serializeDocument output only`, async () => {
    const repo = await makeRepo()
    const doc = { ...invoice(), totals: { total: 999 } }
    const meta = await repo.saveDocument(doc)
    assert.equal(meta.data, undefined)
    assert.equal(meta.total_minor, 11000) // 2 × 50.00 + 10 % VAT
    assert.equal(meta.clientName, 'Maya Chen')
    const loaded = await repo.getDocument('inv-1')
    assert.ok(loaded.ok)
    assert.equal(serializeDocument(loaded.document), serializeDocument(doc))
    assert.equal(loaded.document.totals, undefined)

    const again = await repo.saveDocument({ ...doc, notes: 'edited' })
    assert.equal(again.createdAt, meta.createdAt)
    assert.ok(again.updatedAt > meta.updatedAt)
    await repo.saveDocument(invoice({ id: 'inv-2', number: 'INV-2026-0002' }))
    const list = await repo.listDocuments()
    assert.deepEqual(list.map((d) => d.id), ['inv-2', 'inv-1'])
    assert.ok(list.every((d) => d.data === undefined))
    assert.equal(await repo.countDocuments(), 2)
    await repo.deleteDocument('inv-2')
    assert.equal(await repo.getDocument('inv-2'), null)
  })

  test(`[${kind}] counters follow saved numbers per type and period`, async () => {
    const repo = await makeRepo()
    assert.deepEqual(await repo.peekNextNumber('invoice', '2026-09-27'), { number: 'INV-2026-0001', seq: 1 })
    assert.deepEqual(await repo.peekNextNumber('invoice', '2026-09-27'), { number: 'INV-2026-0001', seq: 1 }, 'peeking does not reserve')
    await repo.saveDocument(invoice({ number: 'INV-2026-0007' }))
    assert.equal((await repo.peekNextNumber('invoice', '2026-10-01')).number, 'INV-2026-0008')
    await repo.saveDocument(invoice({ id: 'inv-low', number: 'INV-2026-0003' }))
    assert.equal((await repo.peekNextNumber('invoice', '2026-10-01')).number, 'INV-2026-0008', 'a lower number never lowers the counter')
    await repo.saveDocument(invoice({ id: 'inv-custom', number: 'Custom #42' }))
    assert.equal((await repo.peekNextNumber('invoice', '2026-10-01')).number, 'INV-2026-0008', 'non-pattern numbers are ignored')
    assert.equal((await repo.peekNextNumber('invoice', '2027-01-02')).number, 'INV-2027-0001', 'new year, new counter')
    assert.equal((await repo.peekNextNumber('quotation', '2026-10-01')).number, 'QUO-2026-0001', 'per type')
  })

  test(`[${kind}] clients and products upsert and search`, async () => {
    const repo = await makeRepo()
    const first = await repo.saveClient({ name: 'Maya Chen', company: 'Acme', email: 'maya@acme.example', __proto__: { x: 1 } })
    const second = await repo.saveClient({ name: 'Maya Chen', company: 'Acme', email: 'MAYA@acme.example', phone: '+1 555' })
    assert.equal(second.id, first.id, 'same name + email updates the saved client')
    assert.equal(second.phone, '+1 555')
    await repo.saveClient({ name: 'Omar Farooq', email: 'omar@example.com' })
    assert.equal((await repo.listClients()).length, 2)
    assert.deepEqual((await repo.searchClients('acme')).map((c) => c.name), ['Maya Chen'])
    assert.deepEqual((await repo.searchClients('omar@')).map((c) => c.name), ['Omar Farooq'])

    const product = await repo.saveProduct({ description: 'Logo design', unitPrice_minor: 45000, currency: 'USD', unit: 'job' })
    const updated = await repo.saveProduct({ description: 'logo design', unitPrice_minor: 50000, currency: 'USD' })
    assert.equal(updated.id, product.id)
    assert.equal(updated.unitPrice_minor, 50000)
    assert.deepEqual((await repo.searchProducts('LOGO')).map((p) => p.unitPrice_minor), [50000])
  })

  test(`[${kind}] assets: images and PDF letterheads only, size-capped, returned as Blobs`, async () => {
    const repo = await makeRepo()
    const id = await repo.putAsset({ blob: png(), width: 10, height: 5 })
    const asset = await repo.getAsset(id)
    assert.ok(asset.blob instanceof Blob)
    assert.equal(asset.blob.type, 'image/png')
    assert.deepEqual([asset.width, asset.height, asset.mime], [10, 5, 'image/png'])
    await assert.rejects(repo.putAsset({ blob: new Blob(['<svg/>'], { type: 'image/svg+xml' }) }))
    await assert.rejects(repo.putAsset({ blob: new Blob([new Uint8Array(MAX_ASSET_BYTES + 1)], { type: 'image/png' }) }))
    await assert.rejects(repo.putAsset({ blob: new Blob(['<html>'], { type: 'text/html' }) }))
    const pdfId = await repo.putAsset({ blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }) })
    assert.equal((await repo.getAsset(pdfId)).mime, 'application/pdf')
    assert.equal(await repo.getAsset(''), null)
  })

  test(`[${kind}] replaced logos are deleted only when nothing references them`, async () => {
    const repo = await makeRepo()
    const kept = await repo.putAsset({ blob: png() })
    const orphan = await repo.putAsset({ blob: png() })
    const byDefault = await repo.putAsset({ blob: png() })
    const inMemory = await repo.putAsset({ blob: png() })
    await repo.saveDocument(invoice({ seller: { name: 'Northwind', logoAssetId: kept } }))
    await repo.setSetting(SETTING_KEYS.businessDefault, { enabled: true, party: { name: 'Northwind', logoAssetId: byDefault } })
    assert.equal(await repo.deleteAssetIfUnreferenced(kept), false, 'a saved document uses it')
    assert.equal(await repo.deleteAssetIfUnreferenced(byDefault), false, 'the default business uses it')
    assert.equal(await repo.deleteAssetIfUnreferenced(inMemory, { alsoReferencedBy: [{ logoAssetId: inMemory }] }), false, 'the unsaved document uses it')
    assert.equal(await repo.deleteAssetIfUnreferenced(orphan), true)
    assert.equal(await repo.getAsset(orphan), null)
    assert.ok(await repo.getAsset(kept))
    assert.equal(await repo.deleteAssetIfUnreferenced(''), false)
  })

  test(`[${kind}] letterhead images and PDFs count as references (documents and the business profile)`, async () => {
    const repo = await makeRepo()
    const [docImage, docPdf, profileImage, orphan] = await Promise.all([png(), png(), png(), png()].map((blob) => repo.putAsset({ blob })))
    await repo.saveDocument(invoice({ appearance: { letterhead: { imageAssetId: docImage, pdfAssetId: docPdf } } }))
    await repo.setSetting(SETTING_KEYS.businessDefault, { enabled: true, party: { name: 'Harbor' }, letterhead: { imageAssetId: profileImage, topMm: 50 } })
    assert.equal(await repo.deleteAssetIfUnreferenced(docImage), false)
    assert.equal(await repo.deleteAssetIfUnreferenced(docPdf), false)
    assert.equal(await repo.deleteAssetIfUnreferenced(profileImage), false)
    assert.equal(await repo.deleteAssetIfUnreferenced(orphan, { alsoReferencedBy: [{ appearance: { letterhead: { imageAssetId: orphan } } }] }), false)
    assert.equal(await repo.deleteAssetIfUnreferenced(orphan), true)
    const profile = await repo.getSetting(SETTING_KEYS.businessDefault)
    assert.equal(profile.letterhead.topMm, 50)
    assert.equal(profile.letterhead.hideBusinessHeader, true, 'defaults filled in')
  })

  test(`[${kind}] backup export → clear → import restores everything`, async () => {
    const repo = await makeRepo()
    const logo = await repo.putAsset({ blob: png([1, 2, 3, 4, 5]) })
    await repo.saveDocument(invoice({ number: 'INV-2026-0005', seller: { name: 'Northwind', logoAssetId: logo } }))
    await repo.saveClient({ name: 'Maya Chen', email: 'maya@acme.example' })
    await repo.saveProduct({ description: 'Hosting', unitPrice_minor: 1500, currency: 'USD' })
    await repo.setSetting(SETTING_KEYS.businessDefault, { enabled: true, party: { name: 'Northwind' } })

    const backup = JSON.parse(JSON.stringify(await repo.exportBackup()))
    assert.equal(backup.format, BACKUP_FORMAT)
    assert.equal(backup.documents.length, 1)
    assert.equal(backup.assets[0].data, 'AQIDBAU=')

    await repo.clearAll()
    assert.equal(await repo.countDocuments(), 0)
    assert.equal((await repo.listClients()).length, 0)
    assert.equal(await repo.getAsset(logo), null)

    const result = await repo.importBackup(JSON.stringify(backup))
    assert.deepEqual(result, { ok: true, kind: 'backup', counts: { documents: 1, clients: 1, products: 1, assets: 1, settings: 1 }, skipped: 0 })
    const doc = await repo.getDocument('inv-1')
    assert.equal(doc.document.seller.logoAssetId, logo)
    assert.equal((await repo.getAsset(logo)).blob.size, 5)
    assert.equal((await repo.peekNextNumber('invoice', '2026-10-01')).number, 'INV-2026-0006')
    assert.deepEqual((await repo.getSetting(SETTING_KEYS.businessDefault)).enabled, true)
  })

  test(`[${kind}] import validates everything and never throws`, async () => {
    const repo = await makeRepo()
    assert.equal((await repo.importBackup('{nope')).error.code, 'invalid_json')
    assert.equal((await repo.importBackup('[]')).error.code, 'invalid_backup')
    assert.equal((await repo.importBackup({ format: 'something-else' })).error.code, 'invalid_backup')
    assert.equal((await repo.importBackup({ format: BACKUP_FORMAT, version: 99 })).error.code, 'unsupported_backup_version')

    const single = await repo.importBackup(serializeDocument(invoice()))
    assert.equal(single.kind, 'document')
    assert.equal(single.document.id, 'inv-1')

    const hostileJson = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      documents: [JSON.parse(serializeDocument(invoice({ id: 'ok-doc' }))), { type: 'bogus' }, { schemaVersion: 42, type: 'invoice' }, null],
      clients: [{ name: 'Fine' }, 'nope'],
      products: [null],
      settings: [{ key: 'evil', value: 1 }, { key: SETTING_KEYS.preferences, value: { currency: 'EUR', accentColor: 'javascript:alert(1)' } }],
      counters: [{ key: 'invoice:2026', lastSeq: -5 }, { key: 'nope:2026', lastSeq: 3 }, { key: 'invoice:2026', lastSeq: 40 }],
      assets: [{ id: 'svg', mime: 'image/svg+xml', data: 'PHN2Zy8+' }, { id: 'bad', mime: 'image/png', data: '%%%' }],
    })
    // A literal "__proto__" key, as a malicious file could contain.
    const hostile = await repo.importBackup(hostileJson.replace('{', '{"__proto__":{"polluted":true},'))
    assert.equal(hostile.ok, true)
    assert.equal(hostile.counts.documents, 1)
    assert.equal(hostile.counts.clients, 1)
    assert.equal(hostile.counts.settings, 1)
    assert.equal(hostile.counts.assets, 0)
    assert.ok(hostile.skipped >= 9)
    assert.equal({}.polluted, undefined)
    assert.equal((await repo.getSetting(SETTING_KEYS.preferences)).accentColor, '#0071e3')
    assert.equal(await repo.getSetting('evil'), null)
    assert.equal((await repo.peekNextNumber('invoice', '2026-05-05')).number, 'INV-2026-0041')
  })
}

test('storage falls back to memory when IndexedDB is unavailable', async () => {
  const original = globalThis.indexedDB
  try {
    globalThis.indexedDB = undefined
    const { backend, fallbackReason } = await openStorageBackend({ name: 'never-opened' })
    assert.equal(backend.kind, 'memory')
    assert.ok(fallbackReason)
    const repo = createRepository(backend)
    await repo.saveDocument(invoice())
    assert.equal(await repo.countDocuments(), 1)
  } finally {
    globalThis.indexedDB = original
  }
  const { backend, fallbackReason } = await openStorageBackend({ name: `docs-studio-test-${++dbCounter}` })
  assert.equal(backend.kind, 'indexeddb')
  assert.equal(fallbackReason, null)
})
