import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Team() {
  const { items: members, loading, error } = useCollectionData('teamMembers', { orderByField: 'name', direction: 'asc', limitCount: 12 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Team Management</h1>
            <p className="mt-2 text-sm text-slate-300">
              Manage users, roles, and permissions for your sales and support team.
            </p>
          </div>
          <span className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Loading...' : `${members.length} team members`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading team members…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to fetch team data.</div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No team members added yet</h2>
          <p className="mt-2 text-sm text-slate-400">Invite team members to collaborate on leads and customer success.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {members.map((member) => (
            <div key={member.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">{member.name || 'Unnamed'}</h2>
              <p className="mt-2 text-sm text-slate-400">{member.role || 'Contributor'}</p>
              <div className="mt-4 text-sm text-slate-300">
                <p>Email: {member.email || 'Not available'}</p>
                <p>Status: {member.status || 'Active'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
