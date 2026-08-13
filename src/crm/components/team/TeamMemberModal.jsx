import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import Badge from '../ui/Badge.jsx'

const roles = ['Owner', 'Admin', 'Manager', 'Cashier', 'Sales Staff', 'Accountant', 'Support Staff', 'Data Entry', 'Viewer']
const cashierOnlyRoles = ['Cashier']
// Restaurant POS: only these 5 roles (hides CRM-oriented roles)
const restaurantRolesList = ['Owner', 'Admin / Manager', 'Cashier', 'Waiter', 'Kitchen Staff']
const statuses = ['Active', 'Invited', 'Disabled']

function TeamMemberModal({ open, mode = 'add', member, ownerProtected = false, cashierOnly = false, restaurantMode = false, onClose, onSave }) {
  const [draft, setDraft] = useState(member || null)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() =>
      setDraft(member || { name: '', email: '', phone: '', role: cashierOnly ? 'Cashier' : 'Sales Staff', status: 'Active', permissions: [] }),
    )
  }, [cashierOnly, open, member])

  const title = mode === 'edit' ? 'Edit Team Member' : 'Add Team Member'

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-3 py-6 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[840px] overflow-hidden rounded-3xl"
          >
            <Card className="flex max-h-[85vh] flex-col rounded-3xl p-0">
              <div className="shrink-0 border-b border-slate-200/75 px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Basic member details only. Staff login access is managed from Staff Access.</p>
                  </div>
                  <Badge variant="purple">Team</Badge>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {draft ? (
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <div className="min-w-0">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Name</label>
                      <Input className="mt-1" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div className="min-w-0">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</label>
                      <Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                    </div>
                    <div className="min-w-0">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Phone</label>
                      <Input className="mt-1" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
                    </div>
                    <div className="min-w-0">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Role</label>
                      <Select
                        className="mt-1"
                        value={ownerProtected ? 'Owner' : draft.role}
                        disabled={ownerProtected}
                        onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                      >
                        {(restaurantMode && !ownerProtected ? restaurantRolesList : cashierOnly && !ownerProtected ? cashierOnlyRoles : roles).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="min-w-0 sm:col-span-2 sm:max-w-[50%] sm:pr-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                      <Select
                        className="mt-1"
                        value={ownerProtected ? 'Active' : draft.status || 'Active'}
                        disabled={ownerProtected}
                        onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                      {ownerProtected ? (
                        <p className="mt-2 text-xs font-semibold text-slate-500">Workspace owner cannot be disabled or downgraded.</p>
                      ) : null}
                    </div>

                    <div className="min-w-0 sm:col-span-2">
                      <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-semibold leading-5 text-sky-800">
                        Module access, POS permissions, and staff PIN login are handled in the Staff Access tab.
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-slate-200/75 bg-white/90 px-4 py-4 dark:bg-slate-950/90 sm:px-5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="rounded-2xl"
                    type="button"
                    onClick={() => {
                      if (!draft) return
                      onSave?.(ownerProtected ? { ...draft, role: 'Owner', status: 'Active' } : draft)
                    }}
                  >
                    Save
                  </Button>
                  <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

export default memo(TeamMemberModal)
