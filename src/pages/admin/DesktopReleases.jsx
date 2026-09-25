import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MAX_NOTES_LENGTH,
  formatFileSize,
  formatReleaseDay,
  formatReleaseMonth,
  hasMzHeader,
  highestVersion,
  installerFileError,
  versionError,
} from '../../lib/desktopReleaseUtils.js'
import {
  RELEASES_WORKER_URL,
  getLatestRelease,
  installerTestUrl,
  listReleases,
  publishRelease,
  readFileHead,
  uploadInstaller,
} from '../../lib/desktopReleases.js'

// A finished-but-unpublished upload survives a page reload here, so it can still be published.
const PENDING_STORAGE_KEY = 'nexora-desktop-release-pending'

const STAGE_LABELS = {
  hashing: 'Checking file (SHA-256)…',
  uploading: 'Uploading',
  verifying: 'Verifying on server…',
  done: 'Upload complete',
}

function readPending() {
  try {
    const value = JSON.parse(window.localStorage.getItem(PENDING_STORAGE_KEY) || 'null')
    return value && typeof value.version === 'string' && typeof value.key === 'string' ? value : null
  } catch {
    return null
  }
}

function writePending(value) {
  try {
    if (value) window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(value))
    else window.localStorage.removeItem(PENDING_STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode): the pending upload just won't survive a reload.
  }
}

/** Latest + history in one round; never rejects, so callers only branch on `error`. */
async function fetchReleaseData() {
  try {
    const [latest, history] = await Promise.all([getLatestRelease(), listReleases()])
    return { latest, releases: history.releases }
  } catch (error) {
    return { error: { unreachable: Boolean(error?.unreachable), message: error?.message || '' } }
  }
}

function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

function Panel({ title, action, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-black text-slate-950">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

function Button({ children, className = '', variant = 'default', ...props }) {
  const tone = variant === 'primary'
    ? 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700'
    : variant === 'danger'
      ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50'
      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50'
  return (
    <button
      type="button"
      className={`rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function Notice({ tone = 'slate', children }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${tones[tone]}`}>{children}</div>
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-black leading-4 text-slate-500">{label}</p>
      <p className="mt-1 break-words text-lg font-black tracking-tight text-slate-950">{value || '—'}</p>
    </div>
  )
}

export default function DesktopReleases() {
  const [latest, setLatest] = useState(null)
  const [releases, setReleases] = useState([])
  const [loadState, setLoadState] = useState({ status: 'loading', message: '' })

  const [version, setVersion] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [fileCheck, setFileCheck] = useState({ status: 'empty', message: '' })
  const fileInputRef = useRef(null)

  const [progress, setProgress] = useState(null)
  const [uploading, setUploading] = useState(false)
  const abortRef = useRef(null)
  const [pending, setPending] = useState(() => readPending())

  const [busyVersion, setBusyVersion] = useState('')
  const [message, setMessage] = useState(null)

  function applyReleaseData(result) {
    if (result.error) {
      setLoadState({ status: result.error.unreachable ? 'unreachable' : 'error', message: result.error.message || 'Could not load releases.' })
      return
    }
    setLatest(result.latest)
    setReleases(result.releases)
    setLoadState({ status: 'ready', message: '' })
    // Drop a remembered pending upload once it has been published (e.g. from another tab).
    const stored = readPending()
    if (stored && result.releases.some((entry) => entry?.version === stored.version)) {
      writePending(null)
      setPending(null)
    }
  }

  function load() {
    setLoadState((current) => ({ ...current, status: 'loading' }))
    fetchReleaseData().then(applyReleaseData)
  }

  useEffect(() => {
    let active = true
    fetchReleaseData().then((result) => {
      if (active) applyReleaseData(result)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!uploading) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [uploading])

  // The new version must be newer than anything already published (including a rolled-back latest).
  const newestKnownVersion = useMemo(
    () => highestVersion([latest?.version, ...releases.map((entry) => entry?.version)]),
    [latest, releases],
  )
  const versionProblem = version ? versionError(version, newestKnownVersion) : ''
  const notesTooLong = notes.length > MAX_NOTES_LENGTH
  const canUpload = loadState.status === 'ready'
    && !uploading
    && !versionError(version, newestKnownVersion)
    && fileCheck.status === 'valid'
    && !notesTooLong

  async function handleFileChange(event) {
    const selected = event.target.files?.[0] || null
    setFile(selected)
    if (!selected) {
      setFileCheck({ status: 'empty', message: '' })
      return
    }
    const problem = installerFileError({ name: selected.name, size: selected.size })
    if (problem) {
      setFileCheck({ status: 'invalid', message: problem })
      return
    }
    setFileCheck({ status: 'checking', message: 'Checking file…' })
    try {
      const head = await readFileHead(selected, 2)
      setFileCheck(hasMzHeader(head)
        ? { status: 'valid', message: `${selected.name} · ${formatFileSize(selected.size)}` }
        : { status: 'invalid', message: 'File is not a valid Windows installer.' })
    } catch {
      setFileCheck({ status: 'invalid', message: 'Could not read the selected file.' })
    }
  }

  function resetForm() {
    setVersion('')
    setFile(null)
    setFileCheck({ status: 'empty', message: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!canUpload || !file) return
    const controller = new AbortController()
    abortRef.current = controller
    setUploading(true)
    setMessage(null)
    setProgress({ stage: 'hashing', percent: 0 })
    try {
      const result = await uploadInstaller({ file, version, onProgress: setProgress, signal: controller.signal })
      const next = {
        version: result.version || version,
        key: result.key,
        sizeBytes: result.sizeBytes || file.size,
        notes,
        testUrl: result.testUrl || installerTestUrl(result.key),
      }
      setPending(next)
      writePending(next)
      resetForm()
      setMessage({ tone: 'emerald', text: `Version ${next.version} uploaded and verified. It is not live yet.` })
    } catch (error) {
      setProgress(null)
      setMessage({ tone: error?.code === 'cancelled' ? 'amber' : 'rose', text: error?.message || 'Upload failed.' })
    } finally {
      abortRef.current = null
      setUploading(false)
    }
  }

  function handleCancel() {
    abortRef.current?.abort()
  }

  async function publish(targetVersion, publishNotes, { rollback = false } = {}) {
    const prompt = rollback
      ? `Make version ${targetVersion} the live download again?\n\nThe download page will switch to ${targetVersion} within about a minute.`
      : `Publish version ${targetVersion} as the latest download?\n\nMake sure you have downloaded and tested the installer from the test URL first. The download page updates within about a minute.`
    if (!window.confirm(prompt)) return
    setBusyVersion(targetVersion)
    setMessage(null)
    try {
      const body = rollback ? { version: targetVersion } : { version: targetVersion, notes: publishNotes }
      const result = await publishRelease(body)
      if (!rollback) {
        setPending(null)
        writePending(null)
        setNotes('')
        setProgress(null)
      }
      setLatest(result.latest || null)
      setReleases(Array.isArray(result.releases) ? result.releases : [])
      setMessage({ tone: 'emerald', text: `Version ${targetVersion} is now live on the download page.` })
    } catch (error) {
      setMessage({ tone: 'rose', text: error?.message || 'Publish failed.' })
    } finally {
      setBusyVersion('')
    }
  }

  async function copyTestUrl() {
    if (!pending?.testUrl) return
    try {
      await navigator.clipboard.writeText(pending.testUrl)
      setMessage({ tone: 'emerald', text: 'Test URL copied.' })
    } catch {
      setMessage({ tone: 'amber', text: 'Could not copy automatically — select the URL and copy it.' })
    }
  }

  function discardPending() {
    setPending(null)
    writePending(null)
  }

  const latestVersion = latest?.version || ''

  return (
    <div className="space-y-5">
      {loadState.status === 'unreachable' ? (
        <Notice tone="rose">
          Release service not reachable — has nexora-releases-api been deployed?
          <span className="mt-1 block text-xs font-medium text-rose-600">Endpoint: {RELEASES_WORKER_URL}</span>
          <Button className="mt-3" onClick={load}>Retry</Button>
        </Notice>
      ) : null}
      {loadState.status === 'error' ? (
        <Notice tone="rose">
          {loadState.message}
          <Button className="ml-3" onClick={load}>Retry</Button>
        </Notice>
      ) : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <Panel
        title="Live on /download/restaurant-pos"
        action={<Button onClick={load} disabled={loadState.status === 'loading'}>{loadState.status === 'loading' ? 'Loading…' : 'Refresh'}</Button>}
      >
        {loadState.status === 'loading' && !latest ? (
          <p className="text-sm font-semibold text-slate-500">Loading current release…</p>
        ) : latest ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Fact label="Version" value={`v${latest.version}`} />
              <Fact label="Size" value={formatFileSize(latest.sizeBytes)} />
              <Fact label="Released" value={formatReleaseDay(latest.releasedAt)} />
            </div>
            {latest.notes ? (
              <p className="whitespace-pre-line rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">{latest.notes}</p>
            ) : null}
            <a className="block break-all text-xs font-semibold text-violet-700 underline" href={latest.url}>{latest.url}</a>
          </div>
        ) : loadState.status === 'ready' ? (
          <Notice tone="amber">No release published yet — site uses legacy v1.0.0 link.</Notice>
        ) : (
          <p className="text-sm font-semibold text-slate-500">Current release unavailable.</p>
        )}
      </Panel>

      {pending ? (
        <Panel title={`Uploaded — not live yet: v${pending.version}`} action={<Button variant="danger" onClick={discardPending}>Hide</Button>}>
          <div className="space-y-3">
            <p className="text-sm leading-6 text-slate-600">
              Download the installer from the test URL and check it installs and runs before publishing.
              {pending.sizeBytes ? ` Size: ${formatFileSize(pending.sizeBytes)}.` : ''}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                readOnly
                value={pending.testUrl}
                onFocus={(event) => event.target.select()}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                aria-label="Test download URL"
              />
              <Button onClick={copyTestUrl}>Copy</Button>
            </div>
            <Button
              variant="primary"
              onClick={() => publish(pending.version, pending.notes || '')}
              disabled={Boolean(busyVersion) || uploading}
            >
              {busyVersion === pending.version ? 'Publishing…' : 'Publish as latest'}
            </Button>
          </div>
        </Panel>
      ) : null}

      <Panel title="Upload new Windows installer">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black text-slate-500">Version</span>
            <input
              value={version}
              onChange={(event) => setVersion(event.target.value.trim())}
              placeholder={newestKnownVersion ? `newer than ${newestKnownVersion}` : '1.0.1'}
              inputMode="decimal"
              disabled={uploading}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-black"
            />
            {versionProblem ? <span className="mt-1 block text-xs font-semibold text-rose-600">{versionProblem}</span> : null}
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-500">Installer (.exe, 1–300 MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".exe"
              onChange={handleFileChange}
              disabled={uploading}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-violet-700"
            />
            {fileCheck.message ? (
              <span className={`mt-1 block text-xs font-semibold ${fileCheck.status === 'invalid' ? 'text-rose-600' : fileCheck.status === 'valid' ? 'text-emerald-700' : 'text-slate-500'}`}>
                {fileCheck.message}
              </span>
            ) : null}
          </label>
          <label className="block lg:col-span-2">
            <span className="text-xs font-black text-slate-500">Release notes (optional, plain text)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={uploading}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="What changed in this version?"
            />
            <span className={`mt-1 block text-right text-xs font-semibold ${notesTooLong ? 'text-rose-600' : 'text-slate-400'}`}>
              {notes.length}/{MAX_NOTES_LENGTH}
            </span>
          </label>
        </div>

        {progress ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>{STAGE_LABELS[progress.stage] || progress.stage}</span>
              <span>{progress.stage === 'hashing' ? '' : `${progress.percent}%`}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${progress.stage === 'done' ? 'bg-emerald-500' : 'bg-violet-600'} ${progress.stage === 'hashing' ? 'animate-pulse' : ''}`}
                style={{ width: `${progress.stage === 'hashing' ? 100 : progress.percent}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={handleUpload} disabled={!canUpload}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          {uploading ? <Button variant="danger" onClick={handleCancel}>Cancel</Button> : null}
          <span className="text-xs font-semibold text-slate-500">
            Uploading does not change the live download. You publish it in a separate step.
          </span>
        </div>
      </Panel>

      <Panel title="Release history">
        {releases.length ? (
          <div className="max-h-[30rem] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Version</th>
                  <th className="whitespace-nowrap px-4 py-3">Size</th>
                  <th className="whitespace-nowrap px-4 py-3">Released</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {releases.map((entry) => {
                  const isLive = entry.version === latestVersion
                  return (
                    <tr key={entry.version} className={`align-top ${isLive ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-black text-slate-950">v{entry.version}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatFileSize(entry.sizeBytes)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700" title={formatReleaseMonth(entry.releasedAt)}>{formatReleaseDay(entry.releasedAt)}</td>
                      <td className="max-w-md px-4 py-3 text-slate-600">
                        <span className="line-clamp-2 whitespace-pre-line" title={entry.notes || ''}>{entry.notes || '—'}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {isLive ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">Live</span>
                        ) : (
                          <Button onClick={() => publish(entry.version, '', { rollback: true })} disabled={Boolean(busyVersion) || uploading}>
                            {busyVersion === entry.version ? 'Switching…' : 'Make latest'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[8rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
            <p className="text-sm font-black text-slate-900">{loadState.status === 'loading' ? 'Loading…' : 'No releases published yet'}</p>
          </div>
        )}
      </Panel>
    </div>
  )
}
