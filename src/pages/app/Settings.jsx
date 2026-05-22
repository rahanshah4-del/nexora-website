import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Settings() {
  const { items: preferences, loading, error } = useCollectionData('settings', { orderByField: 'updatedAt', direction: 'desc', limitCount: 8 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-slate-300">Configure account preferences, integrations, and notification settings.
        </p>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading settings…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load settings.</div>
      ) : preferences.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No settings available</h2>
          <p className="mt-2 text-sm text-slate-400">Use the admin console to configure your Nexora business suite.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {preferences.map((pref) => (
            <div key={pref.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">{pref.name || 'Preference'}</h2>
              <p className="mt-3 text-sm text-slate-400">{pref.description || 'General account setting'}</p>
              <div className="mt-4 text-sm text-slate-300">
                <p>Value: <span className="font-semibold text-white">{pref.value ?? 'Unset'}</span></p>
                <p>Updated: {pref.updatedAt || 'Unknown'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

