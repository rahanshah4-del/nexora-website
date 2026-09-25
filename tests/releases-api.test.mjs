/**
 * nexora-releases-api pure helpers — validation, admin check, MZ check,
 * latest.json / releases.json builders.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  LATEST_KEY,
  MAX_NOTES_LENGTH,
  RELEASES_KEY,
  buildLatestJson,
  compareSemver,
  hasMzHeader,
  installerKey,
  isAdminClaims,
  isStrictSemver,
  isValidInstallerKey,
  isValidInstallerSize,
  isValidPartNumber,
  isValidSha256,
  sanitizeNotes,
  upsertRelease,
  versionFromInstallerKey,
} from '../workers/nexora-releases-api/src/lib.js'

const ENV = { BACKEND_ADMIN_EMAILS: 'admin@nexora.com' }
const SHA = 'a'.repeat(64)

test('strict semver accepts X.Y.Z only', () => {
  for (const ok of ['1.0.1', '0.0.0', '10.20.30', '1.0.0']) assert.equal(isStrictSemver(ok), true, ok)
  for (const bad of ['v1.0.1', '1.0', '1.0.1.2', '01.0.1', '1.00.1', '1.0.1-beta', '1.0.1+build', ' 1.0.1', '1.0.1 ', '', 'a.b.c', null, 101]) {
    assert.equal(isStrictSemver(bad), false, String(bad))
  }
})

test('compareSemver orders numerically, not lexically', () => {
  assert.ok(compareSemver('1.0.10', '1.0.9') > 0)
  assert.ok(compareSemver('2.0.0', '10.0.0') < 0)
  assert.equal(compareSemver('1.2.3', '1.2.3'), 0)
})

test('installer key is versioned, lowercase and space-free', () => {
  assert.equal(installerKey('1.0.1'), 'restaurant-pos/1.0.1/nexora-pos-1.0.1-setup.exe')
  assert.equal(LATEST_KEY, 'restaurant-pos/latest.json')
  assert.equal(RELEASES_KEY, 'restaurant-pos/releases.json')
})

test('installer key pattern only accepts our own keys', () => {
  assert.equal(isValidInstallerKey('restaurant-pos/1.0.1/nexora-pos-1.0.1-setup.exe'), true)
  assert.equal(versionFromInstallerKey('restaurant-pos/2.3.4/nexora-pos-2.3.4-setup.exe'), '2.3.4')
  const bad = [
    'restaurant-pos/1.0.1/nexora-pos-1.0.2-setup.exe', // version mismatch
    'restaurant-pos/latest.json',
    'restaurant-pos/releases.json',
    'retail-pos/1.0.1/nexora-pos-1.0.1-setup.exe',
    'restaurant-pos/v1.0.1/nexora-pos-v1.0.1-setup.exe',
    'restaurant-pos/../1.0.1/nexora-pos-1.0.1-setup.exe',
    '/restaurant-pos/1.0.1/nexora-pos-1.0.1-setup.exe',
    'restaurant-pos/1.0.1/nexora-pos-1.0.1-setup.exe.bak',
    '',
    undefined,
  ]
  for (const key of bad) assert.equal(isValidInstallerKey(key), false, String(key))
})

test('isAdmin requires the listed email AND a verified email', () => {
  assert.equal(isAdminClaims({ email: 'admin@nexora.com', email_verified: true }, ENV), true)
  assert.equal(isAdminClaims({ email: 'ADMIN@Nexora.com', email_verified: true }, ENV), true)
  assert.equal(isAdminClaims({ email: 'admin@nexora.com', email_verified: false }, ENV), false)
  assert.equal(isAdminClaims({ email: 'admin@nexora.com' }, ENV), false)
  assert.equal(isAdminClaims({ email: 'admin@nexora.com', email_verified: 'true' }, ENV), false)
  assert.equal(isAdminClaims({ email: 'rahanshah2@gmail.com', email_verified: true }, ENV), false)
  assert.equal(isAdminClaims({ email_verified: true }, ENV), false)
  assert.equal(isAdminClaims(null, ENV), false)
  assert.equal(isAdminClaims({ email: 'admin@nexora.com', email_verified: true }, {}), false)
})

test('MZ check accepts PE executables only', () => {
  assert.equal(hasMzHeader(new Uint8Array([0x4d, 0x5a])), true)
  assert.equal(hasMzHeader(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])), true)
  assert.equal(hasMzHeader(new Uint8Array([0x50, 0x4b])), false) // "PK" zip
  assert.equal(hasMzHeader(new Uint8Array([0x5a, 0x4d])), false)
  assert.equal(hasMzHeader(new Uint8Array([0x4d])), false)
  assert.equal(hasMzHeader(new Uint8Array()), false)
  assert.equal(hasMzHeader(null), false)
})

test('size, sha256 and part number validation', () => {
  assert.equal(isValidInstallerSize(104 * 1024 * 1024), true)
  assert.equal(isValidInstallerSize(1024 * 1024 - 1), false)
  assert.equal(isValidInstallerSize(300 * 1024 * 1024 + 1), false)
  assert.equal(isValidInstallerSize('104857600'), false)
  assert.equal(isValidSha256(SHA), true)
  assert.equal(isValidSha256('A'.repeat(64)), false)
  assert.equal(isValidSha256('a'.repeat(63)), false)
  assert.equal(isValidPartNumber(1), true)
  assert.equal(isValidPartNumber(10000), true)
  assert.equal(isValidPartNumber(0), false)
  assert.equal(isValidPartNumber(10001), false)
  assert.equal(isValidPartNumber(1.5), false)
})

test('notes are plain text, capped at 2000 characters', () => {
  assert.equal(sanitizeNotes(undefined), '')
  assert.equal(sanitizeNotes('  Fixed printing\r\nFaster sync  '), 'Fixed printing\nFaster sync')
  assert.equal(sanitizeNotes('a\u0000b\u0007c\td'), 'abc\td')
  assert.equal(sanitizeNotes('x'.repeat(MAX_NOTES_LENGTH)).length, MAX_NOTES_LENGTH)
  assert.equal(sanitizeNotes('x'.repeat(MAX_NOTES_LENGTH + 1)), null)
  assert.equal(sanitizeNotes({ html: '<b>' }), null)
})

test('latest.json builder', () => {
  const latest = buildLatestJson({
    version: '1.0.1',
    sizeBytes: 109051904,
    sha256: SHA,
    releasedAt: '2026-09-25T10:00:00.000Z',
    notes: 'Bug fixes',
    baseUrl: 'https://downloads.nexorasolution.online/',
  })
  assert.deepEqual(latest, {
    version: '1.0.1',
    fileName: 'NexoraPOS-1.0.1-Setup.exe',
    key: 'restaurant-pos/1.0.1/nexora-pos-1.0.1-setup.exe',
    url: 'https://downloads.nexorasolution.online/restaurant-pos/1.0.1/nexora-pos-1.0.1-setup.exe',
    sizeBytes: 109051904,
    sha256: SHA,
    releasedAt: '2026-09-25T10:00:00.000Z',
    notes: 'Bug fixes',
  })
  assert.equal('publishedBy' in latest, false)
})

test('releases.json upsert keeps newest first without duplicates', () => {
  let releases = upsertRelease([], { version: '1.0.1', notes: 'a' })
  releases = upsertRelease(releases, { version: '1.0.10', notes: 'b' })
  releases = upsertRelease(releases, { version: '1.0.2', notes: 'c' })
  releases = upsertRelease(releases, { version: '1.0.1', notes: 'republished' })
  assert.deepEqual(releases.map((entry) => entry.version), ['1.0.10', '1.0.2', '1.0.1'])
  assert.equal(releases.find((entry) => entry.version === '1.0.1').notes, 'republished')
  assert.deepEqual(upsertRelease('garbage', { version: '1.0.0' }).map((entry) => entry.version), ['1.0.0'])
})
