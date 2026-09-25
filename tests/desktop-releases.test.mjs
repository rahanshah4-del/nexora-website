/**
 * Desktop App Releases client helpers — version checks, file checks, part
 * slicing, size/date formatting, latest.json validation, error mapping.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_PART_SIZE,
  MAX_INSTALLER_BYTES,
  MIN_INSTALLER_BYTES,
  compareVersions,
  formatFileSize,
  formatReleaseDay,
  formatReleaseMonth,
  hasMzHeader,
  highestVersion,
  installerFileError,
  isRetriableStatus,
  isStrictSemver,
  normalizeLatestRelease,
  planParts,
  releaseErrorMessage,
  retryDelayMs,
  versionError,
} from '../src/lib/desktopReleaseUtils.js'

const MiB = 1024 * 1024

test('strict semver and numeric comparison', () => {
  assert.equal(isStrictSemver('1.0.1'), true)
  for (const bad of ['v1.0.1', '1.0', '01.0.0', '1.0.1-beta', '']) assert.equal(isStrictSemver(bad), false, bad)
  assert.ok(compareVersions('1.0.10', '1.0.9') > 0)
  assert.ok(compareVersions('1.2.0', '1.10.0') < 0)
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0)
  assert.equal(highestVersion(['1.0.1', '1.0.10', undefined, 'v9.9.9', '1.0.2']), '1.0.10')
  assert.equal(highestVersion([]), '')
})

test('version must be valid and newer than the current one', () => {
  assert.equal(versionError('1.0.1', '1.0.0'), '')
  assert.equal(versionError('1.0.1', ''), '')
  assert.match(versionError('', '1.0.0'), /Enter a version/)
  assert.match(versionError('v1.0.1', '1.0.0'), /Leave out the "v"/)
  assert.match(versionError('1.0', '1.0.0'), /X\.Y\.Z/)
  assert.match(versionError('1.0.0', '1.0.0'), /newer than 1\.0\.0/)
  assert.match(versionError('1.0.9', '1.0.10'), /newer than 1\.0\.10/)
})

test('installer file checks: .exe and 1–300 MiB', () => {
  assert.equal(installerFileError({ name: 'NexoraPOS-1.0.1-Setup.exe', size: 104 * MiB }), '')
  assert.equal(installerFileError({ name: 'setup.EXE', size: MIN_INSTALLER_BYTES }), '')
  assert.equal(installerFileError({ name: 'setup.exe', size: MAX_INSTALLER_BYTES }), '')
  assert.match(installerFileError({}), /Choose/)
  assert.match(installerFileError({ name: 'setup.zip', size: 104 * MiB }), /\.exe/)
  assert.match(installerFileError({ name: 'setup.exe', size: MIN_INSTALLER_BYTES - 1 }), /smaller than 1 MB/)
  assert.match(installerFileError({ name: 'setup.exe', size: MAX_INSTALLER_BYTES + 1 }), /larger than 300 MB/)
})

test('MZ header check', () => {
  assert.equal(hasMzHeader(new Uint8Array([0x4d, 0x5a])), true)
  assert.equal(hasMzHeader(new Uint8Array([0x50, 0x4b])), false)
  assert.equal(hasMzHeader(new Uint8Array([0x4d])), false)
  assert.equal(hasMzHeader(null), false)
})

test('part slicing covers every byte exactly once', () => {
  const size = 104 * MiB + 12345
  const parts = planParts(size, DEFAULT_PART_SIZE)
  assert.equal(parts.length, 11)
  assert.deepEqual(parts[0], { partNumber: 1, start: 0, end: DEFAULT_PART_SIZE })
  assert.equal(parts.at(-1).partNumber, 11)
  assert.equal(parts.at(-1).end, size)
  let covered = 0
  parts.forEach((part, index) => {
    assert.equal(part.start, covered)
    assert.equal(part.partNumber, index + 1)
    if (index < parts.length - 1) assert.equal(part.end - part.start, DEFAULT_PART_SIZE)
    covered = part.end
  })
  assert.equal(covered, size)
  assert.equal(planParts(20 * MiB, 10 * MiB).length, 2)
  assert.deepEqual(planParts(0), [])
  assert.throws(() => planParts(10, 0))
})

test('retry policy', () => {
  assert.deepEqual([1, 2, 3].map(retryDelayMs), [1000, 2000, 4000])
  for (const status of [0, undefined, 408, 429, 500, 503]) assert.equal(isRetriableStatus(status), true, String(status))
  for (const status of [400, 401, 403, 404, 409, 413, 422]) assert.equal(isRetriableStatus(status), false, String(status))
})

test('size and date formatting', () => {
  assert.equal(formatFileSize(109051904), '~104 MB')
  assert.equal(formatFileSize(104 * MiB + 400 * 1024), '~104 MB')
  assert.equal(formatFileSize(1.5 * MiB), '~1.5 MB')
  assert.equal(formatFileSize(3 * MiB), '~3 MB')
  assert.equal(formatFileSize(0), '')
  assert.equal(formatReleaseMonth('2026-09-25T10:00:00.000Z'), 'September 2026')
  assert.equal(formatReleaseMonth('2026-08-31T23:30:00.000Z'), 'August 2026')
  assert.match(formatReleaseDay('2026-09-25T10:00:00.000Z'), /^25 Sept? 2026$/)
  assert.equal(formatReleaseMonth('not a date'), '')
  assert.equal(formatReleaseMonth(''), '')
})

test('latest.json validation never yields an unsafe link', () => {
  const good = {
    version: '1.0.1',
    url: 'https://downloads.nexorasolution.online/restaurant-pos/1.0.1/nexora-pos-1.0.1-setup.exe',
    sizeBytes: 109051904,
    releasedAt: '2026-09-25T10:00:00.000Z',
    notes: 'Fixes',
  }
  assert.equal(normalizeLatestRelease(good).url, good.url)
  assert.equal(normalizeLatestRelease(good).notes, 'Fixes')
  assert.equal(normalizeLatestRelease({ ...good, url: 'javascript:alert(1)' }), null)
  assert.equal(normalizeLatestRelease({ ...good, url: 'http://downloads.nexorasolution.online/x.exe' }), null)
  assert.equal(normalizeLatestRelease({ ...good, version: 'v1.0.1' }), null)
  assert.equal(normalizeLatestRelease(null), null)
  assert.equal(normalizeLatestRelease({ ...good, notes: 42, sizeBytes: 'big' }).notes, '')
})

test('server errors map to clear messages', () => {
  assert.equal(releaseErrorMessage(401), 'Please log in again.')
  assert.equal(releaseErrorMessage(403), 'Only admin@nexora.com can upload desktop releases.')
  assert.match(releaseErrorMessage(409), /already exists/)
  assert.match(releaseErrorMessage(413), /too large/)
  assert.equal(releaseErrorMessage(422, { error: 'not_windows_executable' }), 'File is not a valid Windows installer.')
  assert.match(releaseErrorMessage(422, { error: 'size_mismatch' }), /size did not match/)
  assert.equal(releaseErrorMessage(400, { message: 'Version must be X.Y.Z.' }), 'Version must be X.Y.Z.')
  assert.match(releaseErrorMessage(502, {}), /problem/)
  assert.match(releaseErrorMessage(400, {}), /failed/)
})
