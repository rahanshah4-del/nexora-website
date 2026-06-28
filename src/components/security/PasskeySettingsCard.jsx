import { useEffect, useState } from 'react'
import { HiOutlineKey, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import { listMyPasskeys, registerPasskey, removePasskey, renamePasskey } from '../../lib/passkeys.js'

function dateLabel(value) {
  if (!value) return 'Never'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString()
}

export default function PasskeySettingsCard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    try {
      setRows(await listMyPasskeys())
    } catch (error) {
      setMessage(error?.message || 'Unable to load passkeys.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function addNew() {
    setMessage('')
    setLoading(true)
    try {
      await registerPasskey()
      setMessage('New passkey registered.')
      await load()
    } catch (error) {
      setMessage(error?.message || 'Unable to register passkey.')
    } finally {
      setLoading(false)
    }
  }

  async function rename(row) {
    const name = window.prompt('Device name', row.deviceName || 'My Passkey')
    if (!name) return
    setLoading(true)
    try {
      await renamePasskey(row.id, name)
      await load()
    } catch (error) {
      setMessage(error?.message || 'Unable to rename passkey.')
    } finally {
      setLoading(false)
    }
  }

  async function remove(row) {
    if (!window.confirm(`Remove ${row.deviceName || 'this passkey'}?`)) return
    setLoading(true)
    try {
      await removePasskey(row.id)
      await load()
    } catch (error) {
      setMessage(error?.message || 'Unable to remove passkey.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
            <HiOutlineKey className="h-4 w-4" />
            Security
          </p>
          <h2 className="mt-3 text-xl font-black text-slate-950">Passkeys</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Manage fingerprint, Face ID, Windows Hello and device PIN login.</p>
        </div>
        <button type="button" onClick={addNew} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-black text-white disabled:opacity-60">
          <HiOutlinePlus className="h-4 w-4" />
          Register New
        </button>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">{message}</p> : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.7fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 max-md:hidden">
          <span>Device</span>
          <span>Created</span>
          <span>Last Used</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.length ? rows.map((row) => (
            <article key={row.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_0.9fr_0.9fr_0.7fr] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{row.deviceName || 'Passkey device'}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{row.platform || 'Platform'} · {row.browser || 'Browser'}</p>
              </div>
              <p className="text-xs font-semibold text-slate-600">{dateLabel(row.createdAt)}</p>
              <p className="text-xs font-semibold text-slate-600">{dateLabel(row.lastUsed)}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.status || 'active'}</span>
                <button type="button" onClick={() => rename(row)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600">Rename</button>
                <button type="button" onClick={() => remove(row)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-black text-rose-700">
                  <HiOutlineTrash className="inline h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </article>
          )) : (
            <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">{loading ? 'Loading passkeys...' : 'No passkeys registered yet.'}</div>
          )}
        </div>
      </div>
    </section>
  )
}
