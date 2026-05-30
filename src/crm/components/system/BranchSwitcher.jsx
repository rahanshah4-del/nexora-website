import { useEffect, useMemo, useState } from 'react'
import Dropdown from '../ui/Dropdown.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { db } from '../../lib/firebase.js'
import { subscribeUserCollection } from '../../lib/firestore.js'
import { useUser } from '../../hooks/useUser.js'

const STORAGE_KEY = 'nexora_active_branch_v1'

const branchSeed = [
  { id: 'main', name: 'Main Workspace', region: '', status: 'active' },
]

export default function BranchSwitcher() {
  const { workspaceId } = useUser()
  const [branches, setBranches] = useState(branchSeed)
  const [activeId, setActiveId] = useState(() => localStorage.getItem(STORAGE_KEY) || 'main')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeId)
  }, [activeId])

  useEffect(() => {
    if (!db || !workspaceId) {
      Promise.resolve().then(() => setBranches(branchSeed))
      return
    }
    const unsub = subscribeUserCollection(
      workspaceId,
      'branches',
      (rows) => setBranches(rows.length ? rows : branchSeed),
      () => setBranches(branchSeed),
    )
    return () => unsub?.()
  }, [workspaceId])

  const active = useMemo(() => branches.find((b) => b.id === activeId) || branches[0], [branches, activeId])

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
                className="focus-ring w-full rounded-2xl px-3 py-2 text-left hover:bg-white/40 dark:hover:bg-white/10"
                onClick={() => {
                  setActiveId(b.id)
                  close()
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{b.name}</p>
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
