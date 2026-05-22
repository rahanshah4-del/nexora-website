import { useCollectionData } from '../../lib/useCollectionData.js'

export default function AIAssistant() {
  const { items: requests, loading, error } = useCollectionData('aiRequests', { limitCount: 10 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">AI Assistant</h1>
            <p className="mt-2 text-sm text-slate-300">
              Generate copy, summarize conversations, and automate follow-ups from within your Nexora workspace.
            </p>
          </div>
          <span className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Waiting for AI' : `${requests.length} requests`}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading assistant history…</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load AI assistant activity.</div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
            <h2 className="text-lg font-semibold text-white">No assistant requests yet</h2>
            <p className="mt-2 text-sm text-slate-400">Ask the AI assistant to write outreach, summarize notes, or create task reminders.</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">{request.title || 'AI action'}</h2>
              <p className="mt-3 text-sm text-slate-400">{request.prompt || 'Generated content request'}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                <span className="rounded-full bg-slate-950/70 px-2 py-1">{request.status || 'Complete'}</span>
                <span className="rounded-full bg-slate-950/70 px-2 py-1">{request.model || 'GPT'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
