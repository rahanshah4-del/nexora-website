import { useMemo, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Table from '../ui/Table.jsx'
import TeamMemberModal from './TeamMemberModal.jsx'
import { confirmAction } from '../ui/dialogActions.js'

function statusVariant(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'active') return 'success'
  if (value === 'disabled' || value === 'inactive' || value === 'blocked') return 'danger'
  return 'warning'
}

const OWNER_PROTECTION_MESSAGE = 'Workspace owner cannot be disabled or downgraded.'

export default function TeamMembersTable({ members, ownerId, currentUserId, currentUserEmail, cashierOnly = false, onAdd, onAddClick, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('add')
  const [active, setActive] = useState(null)

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name', cell: (r) => <span className="font-semibold">{r.name}</span> },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'role', header: 'Role', cell: (r) => <Badge variant="purple">{r.role}</Badge> },
      { key: 'status', header: 'Status', cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status || 'Invited'}</Badge> },
      { key: 'lastActive', header: 'Last Active', cell: (r) => <span className="text-xs">{r.lastActive || '—'}</span> },
      {
        key: 'actions',
        header: 'Actions',
        cell: (r) => {
          const disabled = ['disabled', 'inactive', 'blocked'].includes(String(r.status || '').toLowerCase())
          const protectedOwner =
            String(r.id) === String(ownerId || '') ||
            (String(r.id) === String(currentUserId || '') && String(r.email || '').toLowerCase() === String(currentUserEmail || '').toLowerCase())
          return (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="subtle"
                className="rounded-xl px-3 py-2 text-xs"
                type="button"
                onClick={() => {
                  setActive(r)
                  setMode('edit')
                  setOpen(true)
                }}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                className="rounded-xl px-3 py-2 text-xs"
                type="button"
                disabled={protectedOwner}
                onClick={() => onUpdate?.(r.id, { status: disabled ? 'Active' : 'Disabled' })}
              >
                {disabled ? 'Enable' : 'Disable'}
              </Button>
              {protectedOwner ? (
                <span className="max-w-[12rem] text-xs font-semibold text-slate-500">{OWNER_PROTECTION_MESSAGE}</span>
              ) : (
                <Button
                  variant="ghost"
                  className="rounded-xl px-3 py-2 text-xs text-rose-700 hover:bg-rose-50"
                  type="button"
                  onClick={async () => {
                    if (await confirmAction({ title: 'Delete team member?', message: `Delete ${r.name || 'this team member'}? Their workspace access will be removed.`, confirmLabel: 'Delete Member' })) onDelete?.(r.id)
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [currentUserEmail, currentUserId, onDelete, onUpdate, ownerId],
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Team members</p>
          <Badge variant="info">{members.length}</Badge>
        </div>
        <Button
          className="rounded-2xl"
          type="button"
          onClick={() => {
            if (onAddClick) {
              onAddClick()
              return
            }
            setActive(null)
            setMode('add')
            setOpen(true)
          }}
        >
          Add member
        </Button>
      </div>

      <Table columns={columns} rows={members} />

      <TeamMemberModal
        open={open}
        mode={mode}
        member={active}
        ownerProtected={
          String(active?.id || '') === String(ownerId || '') ||
          (String(active?.id || '') === String(currentUserId || '') && String(active?.email || '').toLowerCase() === String(currentUserEmail || '').toLowerCase())
        }
        cashierOnly={cashierOnly}
        onClose={() => setOpen(false)}
        onSave={(draft) => {
          if (mode === 'add') onAdd?.(draft)
          else if (active?.id) onUpdate?.(active.id, draft)
          setOpen(false)
        }}
      />
    </div>
  )
}
