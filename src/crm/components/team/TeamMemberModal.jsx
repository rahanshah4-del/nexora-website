import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import Badge from '../ui/Badge.jsx'

const roles = ['Owner', 'Admin', 'Manager', 'Sales Staff', 'Support Agent', 'Accountant']

export default function TeamMemberModal({ open, mode = 'add', member, permissionKeys, onClose, onSave }) {
  const [draft, setDraft] = useState(member || null)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() =>
      setDraft(member || { name: '', email: '', phone: '', role: 'Sales Staff', permissions: [] }),
    )
  }, [open, member])

  const title = mode === 'edit' ? 'Edit Team Member' : 'Add Team Member'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl"
          >
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Roles, permissions, and status.</p>
                </div>
                <Badge variant="purple">Team</Badge>
              </div>

              {draft ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Name</label>
                    <Input className="mt-1" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</label>
                    <Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Phone</label>
                    <Input className="mt-1" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Role</label>
                    <Select className="mt-1" value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}>
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Permissions</label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {permissionKeys.map((p) => {
                        const checked = draft.permissions?.includes(p)
                        return (
                          <label key={p} className="glass-muted flex items-center justify-between gap-3 rounded-2xl p-3">
                            <span className="text-sm text-slate-800 dark:text-slate-100">{p}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setDraft((d) => {
                                  const next = new Set(d.permissions || [])
                                  if (e.target.checked) next.add(p)
                                  else next.delete(p)
                                  return { ...d, permissions: Array.from(next) }
                                })
                              }}
                              className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 dark:border-white/10 dark:bg-slate-900/40"
                            />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="rounded-2xl"
                  type="button"
                  onClick={() => {
                    if (!draft) return
                    onSave?.(draft)
                  }}
                >
                  Save
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
