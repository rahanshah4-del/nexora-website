import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'

export default function PermissionMatrix({ permissionKeys, roles, matrix, onToggle }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Permission Matrix</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Role-based access control</p>
        </div>
        <Badge variant="purple">RBAC</Badge>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[52rem] w-full text-left text-sm">
          <thead className="bg-white/50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold">Permission</th>
              {roles.map((r) => (
                <th key={r} className="px-4 py-3 font-semibold">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15 bg-white/30 dark:divide-white/10 dark:bg-slate-900/25">
            {permissionKeys.map((p) => (
              <tr key={p} className="hover:bg-white/40 dark:hover:bg-white/5">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{p}</td>
                {roles.map((r) => (
                  <td key={r} className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={Boolean(matrix?.[r]?.[p])}
                      onChange={() => onToggle?.(r, p)}
                      className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 dark:border-white/10 dark:bg-slate-900/40"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
