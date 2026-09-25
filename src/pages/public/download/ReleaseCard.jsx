import { useState } from 'react'
import { HiOutlineCheck, HiOutlineClipboardDocument, HiOutlineShieldCheck } from 'react-icons/hi2'
import { formatFileSize } from '../../../lib/desktopReleaseUtils.js'
import { formatReleaseDate, isSha256, splitNotes } from './releaseText.js'

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500'

function Skeleton({ className = '' }) {
  return <span className={`block animate-pulse rounded-md bg-slate-100 ${className}`} />
}

function ReleaseNotes({ notes }) {
  const blocks = splitNotes(notes)
  if (!blocks.length) return null
  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      <h3 className="text-sm font-bold text-slate-900">What’s new</h3>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
        {blocks.map((block, index) =>
          block.type === 'list' ? (
            <ul key={index} className="space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <HiOutlineCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p key={index} className="whitespace-pre-line">{block.text}</p>
          ),
        )}
      </div>
    </div>
  )
}

function VerifyFile({ sha256 }) {
  const [copied, setCopied] = useState('')

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(sha256)
      setCopied('Copied')
    } catch {
      setCopied('Copy failed — select the hash manually')
    }
    window.setTimeout(() => setCopied(''), 2500)
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <HiOutlineShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <span className="font-semibold text-slate-700">Verify file</span>
        <span className="text-slate-500">SHA-256</span>
        <code className="truncate rounded-md bg-white px-2 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200" title={sha256}>
          {sha256.slice(0, 12)}…
        </code>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-emerald-700" role="status" aria-live="polite">{copied}</span>
        <button
          type="button"
          onClick={copyHash}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 ${FOCUS_RING}`}
          aria-label="Copy full SHA-256 hash of the installer"
        >
          <HiOutlineClipboardDocument className="h-4 w-4" aria-hidden="true" />
          Copy full hash
        </button>
      </div>
    </div>
  )
}

/**
 * status: 'loading' | 'ready' | 'unavailable'. `release` is the normalized
 * latest.json (or null). Notes and hash are hidden when missing.
 */
export default function ReleaseCard({ status, release }) {
  const released = release ? formatReleaseDate(release.releasedAt) : ''
  const size = release ? formatFileSize(release.sizeBytes) : ''

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Latest release</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {status === 'loading' ? (
              <>
                <span className="sr-only">Loading latest release</span>
                <Skeleton className="h-8 w-48" />
              </>
            ) : release ? (
              `Nexora Restaurant POS v${release.version}`
            ) : (
              'Nexora Restaurant POS'
            )}
          </h2>
        </div>
        {release ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Latest version
          </span>
        ) : null}
      </div>

      {status === 'loading' ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : release ? (
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {released ? (
            <div className="flex gap-1.5">
              <dt className="text-slate-500">Released</dt>
              <dd className="font-semibold text-slate-800">{released}</dd>
            </div>
          ) : null}
          {size ? (
            <div className="flex gap-1.5">
              <dt className="text-slate-500">Size</dt>
              <dd className="font-semibold text-slate-800">{size}</dd>
            </div>
          ) : null}
          <div className="flex gap-1.5">
            <dt className="text-slate-500">Platform</dt>
            <dd className="font-semibold text-slate-800">Windows 10/11 (64-bit)</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Release details are not available right now. The download button above always gets you the latest installer.
        </p>
      )}

      {release?.notes ? <ReleaseNotes notes={release.notes} /> : null}
      {release && isSha256(release.sha256) ? <VerifyFile sha256={release.sha256.toLowerCase()} /> : null}
    </div>
  )
}
