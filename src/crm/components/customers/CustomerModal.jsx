import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

function CustomerModal({ open, onClose, onCreate, initialRecord = null, schoolMode = false }) {
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => setSaving(false))
    if (initialRecord) {
      Promise.resolve().then(() =>
        setDraft(
          schoolMode
            ? {
                name: initialRecord.name || initialRecord.studentName || '',
                email: initialRecord.email || initialRecord.parentEmail || '',
                phone: initialRecord.phone || initialRecord.parentPhone || '',
                company: initialRecord.company || [initialRecord.className, initialRecord.section].filter(Boolean).join(' - '),
                customerType: initialRecord.customerType || 'Student',
                status: initialRecord.status || 'Active',
                notes: initialRecord.notes || '',
                studentName: initialRecord.studentName || initialRecord.name || '',
                admissionNo: initialRecord.admissionNo || '',
                rollNo: initialRecord.rollNo || '',
                className: initialRecord.className || initialRecord.class || '',
                section: initialRecord.section || '',
                dateOfBirth: initialRecord.dateOfBirth || '',
                gender: initialRecord.gender || '',
                studentPhone: initialRecord.studentPhone || initialRecord.phone || '',
                parentName: initialRecord.parentName || initialRecord.guardianName || '',
                relation: initialRecord.relation || '',
                parentPhone: initialRecord.parentPhone || initialRecord.phone || '',
                parentEmail: initialRecord.parentEmail || initialRecord.email || '',
                address: initialRecord.address || initialRecord.customerAddress || '',
                monthlyFee: initialRecord.monthlyFee ?? '',
                admissionFee: initialRecord.admissionFee ?? '',
                discount: initialRecord.discount ?? '',
              }
            : {
                name: initialRecord.name || '',
                email: initialRecord.email || '',
                phone: initialRecord.phone || '',
                company: initialRecord.company || '',
                customerType: initialRecord.customerType || 'Retail',
                status: initialRecord.status || 'Active',
                notes: initialRecord.notes || '',
              },
        ),
      )
      return
    }
    Promise.resolve().then(() =>
      setDraft(
        schoolMode
          ? {
              name: '',
              email: '',
              phone: '',
              company: '',
              customerType: 'Student',
              status: 'Active',
              notes: '',
              studentName: '',
              admissionNo: '',
              rollNo: '',
              className: '',
              section: '',
              dateOfBirth: '',
              gender: '',
              studentPhone: '',
              parentName: '',
              relation: '',
              parentPhone: '',
              parentEmail: '',
              address: '',
              monthlyFee: '',
              admissionFee: '',
              discount: '',
            }
          : {
              name: '',
              email: '',
              phone: '',
              company: '',
              customerType: 'Retail',
              status: 'Active',
              notes: '',
            },
      ),
    )
  }, [initialRecord, open, schoolMode])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
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
            className="crm-modal-panel"
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {initialRecord ? (schoolMode ? 'Edit Student' : 'Edit Customer') : schoolMode ? 'Add Student' : 'Add Customer'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {schoolMode ? 'Creates a student and parent record using the existing customer collection.' : 'Creates a real Workspace customer record.'}
                  </p>
                </div>
                <Badge variant="purple">{schoolMode ? 'Student' : 'Customer'}</Badge>
              </div>

              {draft && schoolMode ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Student Information</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ['Student Name *', 'studentName'],
                        ['Admission No', 'admissionNo'],
                        ['Roll No', 'rollNo'],
                        ['Class', 'className'],
                        ['Section', 'section'],
                        ['Date of Birth', 'dateOfBirth', 'date'],
                        ['Gender', 'gender'],
                        ['Student Phone optional', 'studentPhone'],
                      ].map(([label, key, type]) => (
                        <div key={key}>
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</label>
                          <Input className="mt-1" type={type || 'text'} value={draft[key]} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Parent/Guardian Information</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ['Parent/Guardian Name *', 'parentName'],
                        ['Relation', 'relation'],
                        ['Parent Phone', 'parentPhone'],
                        ['Parent Email *', 'parentEmail', 'email'],
                        ['Address', 'address'],
                      ].map(([label, key, type]) => (
                        <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</label>
                          <Input className="mt-1" type={type || 'text'} value={draft[key]} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Academic/Fee</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Monthly Fee</label>
                        <Input className="mt-1" inputMode="decimal" value={draft.monthlyFee} onChange={(e) => setDraft((d) => ({ ...d, monthlyFee: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Admission Fee</label>
                        <Input className="mt-1" inputMode="decimal" value={draft.admissionFee} onChange={(e) => setDraft((d) => ({ ...d, admissionFee: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Discount</label>
                        <Input className="mt-1" inputMode="decimal" value={draft.discount} onChange={(e) => setDraft((d) => ({ ...d, discount: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                        <Select className="mt-1" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                          <option>Active</option>
                          <option>Left</option>
                          <option>Suspended</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : draft ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Name *</label>
                    <Input className="mt-1" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email *</label>
                    <Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Phone</label>
                    <Input className="mt-1" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Company</label>
                    <Input className="mt-1" value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Type</label>
                    <Select className="mt-1" value={draft.customerType} onChange={(e) => setDraft((d) => ({ ...d, customerType: e.target.value }))}>
                      <option>Retail</option>
                      <option>Business</option>
                      <option>Enterprise</option>
                      <option>Partner</option>
                      <option>General</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                    <Select className="mt-1" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                      <option>Active</option>
                      <option>At Risk</option>
                      <option>Trial</option>
                      <option>Churned</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Notes</label>
                    <textarea
                      className="focus-ring mt-1 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      value={draft.notes}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="rounded-2xl"
                  type="button"
                  disabled={saving || !draft}
                  onClick={async () => {
                    // Without a saving guard, tapping this before onCreate()
                    // resolved fired a second create — nothing disabled the
                    // button or showed progress, so a slow save looked like
                    // it hadn't registered and got tapped again.
                    if (!draft || saving) return
                    setSaving(true)
                    try {
                      await onCreate?.(
                        schoolMode
                          ? {
                              ...draft,
                              name: draft.studentName,
                              email: draft.parentEmail,
                              phone: draft.parentPhone,
                              company: [draft.className, draft.section].filter(Boolean).join(' - '),
                              customerType: 'Student',
                              studentName: draft.studentName,
                              parentName: draft.parentName,
                              className: draft.className,
                              section: draft.section,
                              admissionNo: draft.admissionNo,
                              rollNo: draft.rollNo,
                              monthlyFee: Number(draft.monthlyFee || 0),
                              admissionFee: Number(draft.admissionFee || 0),
                              discount: Number(draft.discount || 0),
                            }
                          : draft,
                      )
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Saving...
                    </span>
                  ) : (
                    initialRecord ? (schoolMode ? 'Save Student' : 'Save Customer') : schoolMode ? 'Create Student' : 'Create'
                  )}
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" disabled={saving} onClick={onClose}>
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

export default memo(CustomerModal)
