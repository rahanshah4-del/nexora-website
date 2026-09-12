import { useState } from 'react'
import Dropdown from '../ui/Dropdown.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { useUser } from '../../hooks/useUser.js'
import { setActiveBranch } from '../../context/UserContext.jsx'

// Not wired into any layout/page yet — see the multi-branch Phase 1
// investigation. Branch data itself (live list + the auto-created "Main"
// branch + the active-branch selection) lives in UserContext, exactly like
// every other workspace-scoped field this app already exposes via useUser();
// this component is a thin, isolated consumer of that context.
export default function BranchSwitcher() {
  const { userId, branches, activeBranchId } = useUser()
  const [switching, setSwitching] = useState('')

  const active = branches.find((b) => b.id === activeBranchId) || branches[0]

  async function selectBranch(branchId) {
    if (!userId || branchId === activeBranchId || switching) return
    setSwitching(branchId)
    try {
      await setActiveBranch(userId, branchId)
    } catch (error) {
      console.warn('[BranchSwitcher] failed to switch branch', error?.message || error)
    } finally {
      setSwitching('')
    }
  }

  return (
    <Dropdown
      align="right"
      panelClassName="w-64"
      trigger={() => (
        <Button variant="subtle" className="h-10 max-w-[12rem] min-w-0 rounded-2xl px-3 shadow-none">
          <span className="truncate text-xs font-semibold">{active?.name || 'Branch'}</span>
        </Button>
      )}
    >
      {({ close }) => (
        <div className="p-1">
          <div className="px-2 py-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Branches</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Multi-branch access</p>
          </div>
          <div className="max-h-64 space-y-1 overflow-auto p-1">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={Boolean(switching)}
                className="focus-ring w-full rounded-2xl px-3 py-2 text-left hover:bg-white/40 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-white/10"
                onClick={async () => {
                  await selectBranch(b.id)
                  close()
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {b.name}
                      {b.id === activeBranchId ? <span className="ml-1.5 text-xs font-normal text-slate-500">(current)</span> : null}
                    </p>
                    <p className="truncate text-xs text-slate-600 dark:text-slate-300">{b.region}</p>
                  </div>
                  <Badge variant={b.status === 'active' ? 'success' : 'default'}>{b.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </Dropdown>
  )
}
